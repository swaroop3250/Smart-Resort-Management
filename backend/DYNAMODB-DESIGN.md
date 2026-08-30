# Phase 1 DynamoDB Design

## Scope

This document describes only the first working backend milestone: rooms,
booking creation, and an authenticated user's booking list. The physical AWS
resource is created manually later; this document creates no AWS table, index,
or sample item.

The table name is `SmartResortTable` with String `PK` and String `SK` keys.
This is an intentionally small first implementation, not a complete production
schema for activities, reviews, service requests, availability, or profiles.

## Implemented Item Shapes

### `ROOM`

```text
PK = ROOM#<roomId>
SK = DETAILS
itemType = ROOM
```

Attributes preserve current room data: `roomId`, `roomName`, `category`,
`price`, `capacity`, `rating`, `description`, `amenities`, `image`, and optional
`tag`. `roomId` is the stable identity; `roomName` is display data.

`GET /api/rooms` uses a filtered `Scan` for `itemType = ROOM`. This is acceptable
for the small initial catalog. A future catalog key/index decision must be based
on real usage before it is added.

### `BOOKING`

```text
PK = BOOKING#<bookingId>
SK = DETAILS
itemType = BOOKING
```

Attributes are `bookingId`, `cognitoSub`, `roomId`, `roomName`, `checkIn`,
`checkOut`, `guests`, `baseAmount`, `weekendCharge`, `extraGuestCharge`,
`gstAmount`, `totalAmount`, `status`, and `createdAt`.

The booking Lambda reads the room item, validates the request, and calculates
all amount fields. Before writing, it performs a paginated filtered scan for
active `BOOKING` items with the same `roomId` and rejects date overlap using
`existingCheckIn < requestedCheckOut && requestedCheckIn < existingCheckOut`.
Browser-supplied totals and identity fields are ignored.

### `USER_BOOKING_LOOKUP`

```text
PK = USER#<cognitoSub>
SK = BOOKING#<bookingId>
itemType = USER_BOOKING_LOOKUP
```

This is a deliberate duplicate of the booking fields needed by the guest list:
`bookingId`, `roomId`, `roomName`, dates, guests, amount breakdown, status, and
`createdAt`. `GET /api/bookings` queries this partition with a `BOOKING#` sort-
key prefix, so it returns only the authenticated user's bookings without a
full-table scan.

The booking item and lookup item are written in one DynamoDB transaction. The
lookup is not a browser-controlled authorization mechanism; Lambda constructs
its partition key from the trusted Cognito `sub` claim.

## Indexes

No Global Secondary Index is implemented for Phase 1. The three required
queries are served by the base table:

| Access pattern | Base-table operation |
| --- | --- |
| Read a room for booking creation | `GetItem` on `ROOM#<roomId>` / `DETAILS`. |
| List room catalog | Filtered `Scan` for `ROOM` items. |
| Check current room/date conflict | Paginated filtered `Scan` for active `BOOKING` items with the selected `roomId`. |
| List authenticated user's bookings | `Query` on `USER#<cognitoSub>` with `BOOKING#` prefix. |

Do not add GSIs until a future endpoint has an access pattern the base table
cannot serve efficiently.

## Cognito Identity

Cognito is not implemented in this milestone. The handlers assume API Gateway
will later validate a Cognito JWT and pass `requestContext.authorizer.jwt.claims.sub`.
That trusted `sub` becomes `cognitoSub` on the booking and is used to build the
`USER#<cognitoSub>` lookup partition. No browser-provided user ID, guest ID,
role, or total amount determines booking ownership or pricing.

## Deferred Work

- Cognito setup and API Gateway route creation.
- Service requests, activities, reviews, and application user-profile items.
- Physical/category room inventory, holds, cancellation policy, overbooking
  policy, and concurrency-safe availability protection.
- Manager/owner/worker query patterns and any required GSIs for them.

Current frontend behavior does not support a guest cancellation action. This
milestone does not invent one.
