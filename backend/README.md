# SmartResort Backend: Phase 1

## Scope

This is the first small backend implementation milestone. It provides only:

- Room catalog retrieval.
- Booking creation with server-calculated pricing.
- Retrieval of the authenticated user's bookings.

It does not create or access AWS resources. The existing frontend, HTML, CSS,
localStorage, packages, and build configuration are unchanged.

## Architecture

```text
Existing SmartResort frontend
        -> API Gateway
        -> Lambda handler
        -> SmartResortTable (DynamoDB)
```

API Gateway and Cognito are not created by this repository. For protected
handlers, API Gateway will later validate a Cognito JWT and pass its trusted
`sub` in `requestContext.authorizer.jwt.claims.sub`.

## Files

| File | Role |
| --- | --- |
| `common/dynamodb.js` | AWS SDK v3 DynamoDB Document client and table-name setting. |
| `common/http.js` | JSON response, error, and request-body helpers. |
| `common/auth.js` | Reads the trusted Cognito `sub` from the API Gateway request context. |
| `rooms/get-rooms.js` | Public room-catalog Lambda handler. |
| `bookings/booking-utils.js` | Date, guest-count, weekend, GST, and amount calculation rules. |
| `bookings/create-booking.js` | Authenticated booking creation handler. |
| `bookings/get-user-bookings.js` | Authenticated user booking-list handler. |
| `test/handlers.test.js` | Local tests using injected fake DynamoDB clients. |
| `test-events/` | API Gateway HTTP API event JSON examples. |

## Phase 1 DynamoDB Items

The handler code expects one table named `SmartResortTable` by default. An
optional `SMART_RESORT_TABLE` environment variable can override the table name
at deployment time; it is not a credential.

```text
ROOM
PK = ROOM#<roomId>
SK = DETAILS

BOOKING
PK = BOOKING#<bookingId>
SK = DETAILS

USER_BOOKING_LOOKUP
PK = USER#<cognitoSub>
SK = BOOKING#<bookingId>
```

Room records keep the existing catalog fields: `roomId`, `roomName`, `category`,
`price`, `capacity`, `rating`, `description`, `amenities`, `image`, and optional
`tag`. Booking records include the requested room, dates, guest count, computed
amounts, `status`, `createdAt`, and trusted `cognitoSub`.

The lookup item duplicates the booking summary under the authenticated user's
partition. `GET /api/bookings` queries `USER#<cognitoSub>` with the
`BOOKING#` sort-key prefix, so it returns only that user's bookings without a
full-table scan.

## Implemented Endpoints

| Conceptual API route | Lambda entry point | Behavior |
| --- | --- | --- |
| `GET /api/rooms` | `rooms/get-rooms.handler` | Public filtered room-catalog read. |
| `POST /api/bookings` | `bookings/create-booking.handler` | Authenticated booking creation with trusted server pricing. |
| `GET /api/bookings` | `bookings/get-user-bookings.handler` | Authenticated user's booking list through lookup items. |

## Booking Flow

1. The future frontend sends `roomId`, `checkIn`, `checkOut`, and `guests`.
2. API Gateway verifies the Cognito token before invoking the booking Lambda.
3. Lambda reads the trusted `sub`, validates input, and gets `ROOM#<roomId>`.
4. Lambda checks existing active bookings for the same `roomId` and rejects an
   overlapping stay with HTTP `409 BOOKING_CONFLICT`.
5. Lambda recalculates base amount, weekend charge, extra-guest charge, 18% GST,
   and total amount using the current frontend formula.
6. Lambda writes the canonical booking and `USER#<cognitoSub>` lookup in one
   DynamoDB transaction, then returns the created booking.

The handler ignores browser-supplied `cognitoSub`, user ID, guest ID, role,
`baseAmount`, `weekendCharge`, `extraGuestCharge`, `gstAmount`, and `totalAmount`.

## Simplified Room Availability

For this first implementation, each `roomId` is treated as one bookable room.
An active existing stay `[A, B)` conflicts with requested stay `[C, D)` when
`A < D && C < B`. This allows a new check-in on the previous booking's
check-out date. `cancelled` and `completed` bookings do not block a stay.

The handler performs a paginated filtered scan because this milestone adds no
inventory model or index. This detects conflicts already stored at check time,
but simultaneous requests can still race between the scan and write. A future
physical-room/category-capacity model with concurrency-safe conditional writes
can replace this simplified rule if required.

## Local Development

Node.js 18 or later is recommended. From `backend/`:

```powershell
npm install
npm test
```

`npm install` installs only AWS SDK for JavaScript v3 DynamoDB packages. It
does not add credentials. The tests do not call AWS; they use fake clients and
cover room reads, valid booking creation, invalid dates, invalid guests,
missing rooms, missing authenticated identity, and user booking retrieval.

`test-events/` contains sample API Gateway HTTP API events. Replace placeholder
room IDs and Cognito `sub` values only in your local test invocation; do not add
real tokens, credentials, or secrets to this repository.

## Frontend Status

The frontend is intentionally not connected yet. Later, `RoomsView`/
`BookingSection` will call `GET /api/rooms`; `BookingSection.handleSubmit` and
`ResortApp.handleAddBooking` will call `POST /api/bookings`; and
`ResortApp.componentDidMount` plus guest dashboard reads will call
`GET /api/bookings`. LocalStorage remains the active system of record until a
separate migration step is approved.

## Not Implemented

- AWS resource creation, API Gateway configuration, or Cognito setup.
- Physical/category room inventory, holds, cancellation workflows, overbooking,
  or concurrency-safe availability locking.
- Service requests, activities, reviews, profiles, worker/manager/owner query
  paths, booking status changes, or booking deletion.
- Frontend changes or removal of localStorage.
