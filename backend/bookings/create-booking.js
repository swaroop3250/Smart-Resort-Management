const { randomUUID } = require("node:crypto");
const { GetCommand, ScanCommand, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");
const { getAuthenticatedSub } = require("../common/auth");
const { documentClient, TABLE_NAME } = require("../common/dynamodb");
const { error, json, parseJsonBody } = require("../common/http");
const { calculateAmounts, validateBookingInput } = require("./booking-utils");

const toBookingResponse = (booking) => ({
  bookingId: booking.bookingId,
  roomId: booking.roomId,
  roomName: booking.roomName,
  checkIn: booking.checkIn,
  checkOut: booking.checkOut,
  guests: booking.guests,
  baseAmount: booking.baseAmount,
  weekendCharge: booking.weekendCharge,
  extraGuestCharge: booking.extraGuestCharge,
  gstAmount: booking.gstAmount,
  totalAmount: booking.totalAmount,
  status: booking.status,
  createdAt: booking.createdAt,
});

const hasOverlappingActiveBooking = async ({ client, tableName, roomId, checkIn, checkOut }) => {
  let exclusiveStartKey;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "#itemType = :bookingType AND #roomId = :roomId AND #status = :activeStatus",
        ProjectionExpression: "#roomId, #status, #checkIn, #checkOut",
        ExpressionAttributeNames: {
          "#itemType": "itemType",
          "#roomId": "roomId",
          "#status": "status",
          "#checkIn": "checkIn",
          "#checkOut": "checkOut",
        },
        ExpressionAttributeValues: {
          ":bookingType": "BOOKING",
          ":roomId": roomId,
          ":activeStatus": "active",
        },
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      })
    );

    const conflict = (result.Items || []).some(
      (booking) =>
        booking.status === "active" &&
        booking.roomId === roomId &&
        typeof booking.checkIn === "string" &&
        typeof booking.checkOut === "string" &&
        booking.checkIn < checkOut &&
        checkIn < booking.checkOut
    );

    if (conflict) return true;
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return false;
};

const createBooking = async (
  event,
  {
    client = documentClient,
    tableName = TABLE_NAME,
    createId = randomUUID,
    now = () => new Date().toISOString(),
  } = {}
) => {
  const cognitoSub = getAuthenticatedSub(event);
  if (!cognitoSub) {
    return error(401, "UNAUTHENTICATED", "An authenticated Cognito user is required.");
  }

  let body;
  let validated;
  try {
    body = parseJsonBody(event);
    validated = validateBookingInput(body);
  } catch (requestError) {
    return error(400, requestError.code || "VALIDATION_ERROR", requestError.message);
  }

  let room;
  try {
    const roomResult = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `ROOM#${validated.roomId}`,
          SK: "DETAILS",
        },
      })
    );
    room = roomResult.Item;
  } catch {
    return error(500, "ROOM_LOOKUP_FAILED", "Unable to read the selected room.");
  }

  if (!room || room.itemType !== "ROOM") {
    return error(404, "ROOM_NOT_FOUND", "The selected room does not exist.");
  }

  try {
    const hasConflict = await hasOverlappingActiveBooking({
      client,
      tableName,
      roomId: validated.roomId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
    });

    if (hasConflict) {
      return error(409, "BOOKING_CONFLICT", "The selected room is unavailable for the requested dates.");
    }
  } catch {
    return error(500, "BOOKING_CONFLICT_CHECK_FAILED", "Unable to verify room availability.");
  }

  let amounts;
  try {
    amounts = calculateAmounts({
      room,
      checkInDate: validated.checkInDate,
      checkOutDate: validated.checkOutDate,
      guestCount: validated.guestCount,
    });
  } catch (validationError) {
    return error(400, validationError.code || "VALIDATION_ERROR", validationError.message);
  }

  const bookingId = createId();
  const createdAt = now();
  const booking = {
    PK: `BOOKING#${bookingId}`,
    SK: "DETAILS",
    itemType: "BOOKING",
    bookingId,
    cognitoSub,
    roomId: room.roomId,
    roomName: room.roomName,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guests: validated.guestCount,
    ...amounts,
    status: "active",
    createdAt,
  };

  // This duplicate is the user's queryable booking list; it avoids a table scan.
  const userBookingLookup = {
    PK: `USER#${cognitoSub}`,
    SK: `BOOKING#${bookingId}`,
    itemType: "USER_BOOKING_LOOKUP",
    cognitoSub,
    ...toBookingResponse(booking),
  };

  try {
    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: tableName,
              Item: booking,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            Put: {
              TableName: tableName,
              Item: userBookingLookup,
              ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
            },
          },
        ],
      })
    );
  } catch {
    return error(500, "BOOKING_CREATE_FAILED", "Unable to create the booking.");
  }

  return json(201, toBookingResponse(booking));
};

exports.handler = createBooking;
exports.createBooking = createBooking;
