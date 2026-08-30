# Phase 1 API Design

## Implemented Lambda Handlers

Only the following handler entry points are implemented in this milestone. API
Gateway routes are not created here; they will later connect to these handlers.

| Conceptual route | Handler | Authorization | DynamoDB path |
| --- | --- | --- | --- |
| `GET /api/rooms` | `rooms/get-rooms.handler` | Public | Filtered `Scan` of `ROOM` items. |
| `POST /api/bookings` | `bookings/create-booking.handler` | Cognito-authenticated user | Room `GetItem`, then transactional `BOOKING` and `USER_BOOKING_LOOKUP` writes. |
| `GET /api/bookings` | `bookings/get-user-bookings.handler` | Cognito-authenticated user | `Query` `USER#<cognitoSub>` / `BOOKING#` prefix. |

## `GET /api/rooms`

- Purpose: Return the existing room catalog from `SmartResortTable`.
- Request: No body or authentication required.
- Response: `items` containing `roomId`, `roomName`, `category`, `price`,
  `capacity`, `rating`, `description`, `amenities`, `image`, and optional `tag`.
- Table use: Filtered `Scan` for `itemType = ROOM`; room items use
  `PK = ROOM#<roomId>`, `SK = DETAILS`.
- Current frontend replacement later: `RoomsView`, `RoomCard`, and the room
  selector in `BookingSection` currently read static room data.

## `POST /api/bookings`

- Purpose: Create a booking and return the authoritative server-calculated total.
- Request: JSON body with `roomId`, `checkIn`, `checkOut`, and `guests`.
- Authorization: A JWT-authenticated user. The handler reads
  `requestContext.authorizer.jwt.claims.sub`; API Gateway must validate the
  token before invoking it in deployment.
- Validation: `roomId` is required; dates must use `YYYY-MM-DD`; check-out must
  be after check-in; guests must be a positive whole number; the room must exist.
  Active bookings for the same `roomId` are scanned and compared using
  `existingCheckIn < requestedCheckOut && requestedCheckIn < existingCheckOut`.
- Conflict response: `409` with code `BOOKING_CONFLICT` and message
  `The selected room is unavailable for the requested dates.` Cancelled and
  completed bookings do not block; a new check-in equal to an old check-out is allowed.
- Pricing: Lambda reads the room and recalculates base amount, weekend charge,
  extra-guest charge, 18% GST, and final total. It ignores browser-supplied
  amount fields, identity, guest ID, and role.
- Writes: A transaction creates `BOOKING#<bookingId>` / `DETAILS` and the
  `USER#<cognitoSub>` / `BOOKING#<bookingId>` lookup item.
- Response: `201` with booking ID, room fields, dates, guest count, calculated
  amounts, `active` status, and `createdAt`.
- Current frontend replacement later: `BookingSection.handleSubmit` and
  `ResortApp.handleAddBooking` currently create and save local bookings.

## `GET /api/bookings`

- Purpose: Return only bookings belonging to the authenticated user.
- Request: No body or user ID query parameter.
- Authorization: A JWT-authenticated user.
- Table use: `Query` `PK = USER#<trusted cognitoSub>` with an SK prefix of
  `BOOKING#`. The lookup items contain booking-list data, avoiding a table scan.
- Response: `200` with `items`, sorted in handler memory by `createdAt` newest first.
- Current frontend replacement later: `ResortApp.componentDidMount` and
  `DashboardView` currently use `loadBookings()` and filter the local collection.

## Deferred Routes

No handlers are implemented for room availability, booking status/deletion,
service requests, activities, reviews, Cognito login, or profile retrieval.
Those remain future work and must not be connected to this first milestone.
