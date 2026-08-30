const assert = require("node:assert/strict");
const test = require("node:test");

const { createBooking } = require("../bookings/create-booking");
const { getUserBookings } = require("../bookings/get-user-bookings");
const { getRooms } = require("../rooms/get-rooms");

const authenticatedEvent = (body) => ({
  body: body === undefined ? undefined : JSON.stringify(body),
  requestContext: {
    authorizer: {
      jwt: {
        claims: {
          sub: "user-123",
        },
      },
    },
  },
});

const parseResponse = (response) => ({
  ...response,
  body: JSON.parse(response.body),
});

const room = {
  PK: "ROOM#room-1",
  SK: "DETAILS",
  itemType: "ROOM",
  roomId: "room-1",
  roomName: "Palm Deluxe Room",
  category: "Deluxe",
  price: 1000,
  capacity: 2,
  rating: 4.8,
  description: "Ocean view",
  amenities: ["Wi-Fi"],
  image: "room.jpg",
};

const submitBookingWithExistingBookings = async (existingBookings, dates) => {
  const client = {
    send: async (command) => {
      if (command.constructor.name === "GetCommand") return { Item: room };
      if (command.constructor.name === "ScanCommand") return { Items: existingBookings };
      if (command.constructor.name === "TransactWriteCommand") return {};
      throw new Error("Unexpected command");
    },
  };

  return parseResponse(
    await createBooking(
      authenticatedEvent({
        roomId: "room-1",
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        guests: 1,
      }),
      {
        client,
        createId: () => "availability-booking",
        now: () => "2025-06-01T10:00:00.000Z",
      }
    )
  );
};

test("returns the room catalog", async () => {
  const client = {
    send: async (command) => {
      assert.equal(command.constructor.name, "ScanCommand");
      return { Items: [room] };
    },
  };

  const response = parseResponse(await getRooms({}, { client }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.items, [
    {
      roomId: "room-1",
      roomName: "Palm Deluxe Room",
      category: "Deluxe",
      price: 1000,
      capacity: 2,
      rating: 4.8,
      description: "Ocean view",
      amenities: ["Wi-Fi"],
      image: "room.jpg",
    },
  ]);
});

test("creates a booking and a user booking lookup", async () => {
  const commands = [];
  const client = {
    send: async (command) => {
      commands.push(command);
      if (command.constructor.name === "GetCommand") return { Item: room };
      if (command.constructor.name === "ScanCommand") return { Items: [] };
      if (command.constructor.name === "TransactWriteCommand") return {};
      throw new Error("Unexpected command");
    },
  };

  const response = parseResponse(
    await createBooking(
      authenticatedEvent({
        roomId: "room-1",
        checkIn: "2025-06-06",
        checkOut: "2025-06-09",
        guests: 3,
        totalAmount: 1,
      }),
      {
        client,
        createId: () => "booking-1",
        now: () => "2025-06-01T10:00:00.000Z",
      }
    )
  );

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.bookingId, "booking-1");
  assert.equal(response.body.baseAmount, 3000);
  assert.equal(response.body.weekendCharge, 200);
  assert.equal(response.body.extraGuestCharge, 3000);
  assert.equal(response.body.gstAmount, 1116);
  assert.equal(response.body.totalAmount, 7316);

  const transaction = commands.find((command) => command.constructor.name === "TransactWriteCommand").input
    .TransactItems;
  assert.equal(transaction[0].Put.Item.PK, "BOOKING#booking-1");
  assert.equal(transaction[1].Put.Item.PK, "USER#user-123");
  assert.equal(transaction[1].Put.Item.SK, "BOOKING#booking-1");
});

test("rejects an overlapping active booking", async () => {
  const response = await submitBookingWithExistingBookings(
    [{ itemType: "BOOKING", roomId: "room-1", status: "active", checkIn: "2025-09-10", checkOut: "2025-09-12" }],
    { checkIn: "2025-09-11", checkOut: "2025-09-13" }
  );

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error.code, "BOOKING_CONFLICT");
  assert.equal(response.body.error.message, "The selected room is unavailable for the requested dates.");
});

test("allows a non-overlapping booking", async () => {
  const response = await submitBookingWithExistingBookings(
    [{ itemType: "BOOKING", roomId: "room-1", status: "active", checkIn: "2025-09-10", checkOut: "2025-09-12" }],
    { checkIn: "2025-09-13", checkOut: "2025-09-15" }
  );

  assert.equal(response.statusCode, 201);
});

test("allows overlap with a cancelled booking", async () => {
  const response = await submitBookingWithExistingBookings(
    [{ itemType: "BOOKING", roomId: "room-1", status: "cancelled", checkIn: "2025-09-10", checkOut: "2025-09-12" }],
    { checkIn: "2025-09-11", checkOut: "2025-09-13" }
  );

  assert.equal(response.statusCode, 201);
});

test("allows overlap with a completed booking", async () => {
  const response = await submitBookingWithExistingBookings(
    [{ itemType: "BOOKING", roomId: "room-1", status: "completed", checkIn: "2025-09-10", checkOut: "2025-09-12" }],
    { checkIn: "2025-09-11", checkOut: "2025-09-13" }
  );

  assert.equal(response.statusCode, 201);
});

test("allows a booking whose check-in equals the existing check-out", async () => {
  const response = await submitBookingWithExistingBookings(
    [{ itemType: "BOOKING", roomId: "room-1", status: "active", checkIn: "2025-09-10", checkOut: "2025-09-12" }],
    { checkIn: "2025-09-12", checkOut: "2025-09-14" }
  );

  assert.equal(response.statusCode, 201);
});

test("rejects invalid booking dates", async () => {
  const response = parseResponse(
    await createBooking(
      authenticatedEvent({ roomId: "room-1", checkIn: "2025-06-09", checkOut: "2025-06-09", guests: 1 }),
      { client: { send: async () => ({}) } }
    )
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("rejects invalid guest count", async () => {
  const response = parseResponse(
    await createBooking(
      authenticatedEvent({ roomId: "room-1", checkIn: "2025-06-06", checkOut: "2025-06-09", guests: 0 }),
      { client: { send: async () => ({}) } }
    )
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("returns not found for a missing room", async () => {
  const response = parseResponse(
    await createBooking(
      authenticatedEvent({ roomId: "missing", checkIn: "2025-06-06", checkOut: "2025-06-09", guests: 1 }),
      { client: { send: async () => ({ Item: undefined }) } }
    )
  );

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.error.code, "ROOM_NOT_FOUND");
});

test("rejects a booking without an authenticated identity", async () => {
  const response = parseResponse(
    await createBooking(
      { body: JSON.stringify({ roomId: "room-1", checkIn: "2025-06-06", checkOut: "2025-06-09", guests: 1 }) },
      { client: { send: async () => ({}) } }
    )
  );

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error.code, "UNAUTHENTICATED");
});

test("returns only the authenticated user's booking lookup items", async () => {
  const client = {
    send: async (command) => {
      assert.equal(command.constructor.name, "QueryCommand");
      assert.equal(command.input.ExpressionAttributeValues[":pk"], "USER#user-123");
      return {
        Items: [
          {
            bookingId: "booking-2",
            roomId: "room-1",
            roomName: "Palm Deluxe Room",
            checkIn: "2025-06-10",
            checkOut: "2025-06-12",
            guests: 2,
            totalAmount: 2360,
            status: "active",
            createdAt: "2025-06-02T10:00:00.000Z",
          },
        ],
      };
    },
  };

  const response = parseResponse(await getUserBookings(authenticatedEvent(), { client }));
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].bookingId, "booking-2");
});
