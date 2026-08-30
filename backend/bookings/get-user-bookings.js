const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { getAuthenticatedSub } = require("../common/auth");
const { documentClient, TABLE_NAME } = require("../common/dynamodb");
const { error, json } = require("../common/http");

const toBookingResponse = (item) => ({
  bookingId: item.bookingId,
  roomId: item.roomId,
  roomName: item.roomName,
  checkIn: item.checkIn,
  checkOut: item.checkOut,
  guests: item.guests,
  baseAmount: item.baseAmount,
  weekendCharge: item.weekendCharge,
  extraGuestCharge: item.extraGuestCharge,
  gstAmount: item.gstAmount,
  totalAmount: item.totalAmount,
  status: item.status,
  createdAt: item.createdAt,
});

const getUserBookings = async (event, { client = documentClient, tableName = TABLE_NAME } = {}) => {
  const cognitoSub = getAuthenticatedSub(event);
  if (!cognitoSub) {
    return error(401, "UNAUTHENTICATED", "An authenticated Cognito user is required.");
  }

  try {
    const result = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :bookingPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${cognitoSub}`,
          ":bookingPrefix": "BOOKING#",
        },
      })
    );

    const items = (result.Items || [])
      .map(toBookingResponse)
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));

    return json(200, { items });
  } catch {
    return error(500, "BOOKINGS_READ_FAILED", "Unable to read user bookings.");
  }
};

exports.handler = getUserBookings;
exports.getUserBookings = getUserBookings;
