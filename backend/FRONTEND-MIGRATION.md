# Frontend Migration: Phase 1

## Current State

No frontend code changes are part of this milestone. The application continues
to use `resortDashboardBookingsV2`, `coastalDashboardBookingsV1`,
`resortDashboardRequestsV1`, and `coastal-crown-active-user` exactly as before.
The React UI still uses localStorage and static room data.

## Phase 1 Future Callers

| Backend endpoint | Existing frontend behavior/function that will change later |
| --- | --- |
| `GET /api/rooms` | `RoomsView`, `RoomCard`, and `BookingSection` in `js/react-site.js`; static `RESORT_ROOMS`/`roomCatalog` data originates in `js/react-site-data.js` and `js/core-data.js`. |
| `POST /api/bookings` | `BookingSection.handleSubmit` and `ResortApp.handleAddBooking` in `js/react-site.js`. |
| `GET /api/bookings` | `ResortApp.componentDidMount` in `js/react-site.js` and guest booking filters in `DashboardView` / `GuestDashboard` in `js/react-site-dashboard.js`. |

## Current Behavior -> Phase 1 Backend

| Current behavior | Future handler | SmartResortTable item path |
| --- | --- | --- |
| Static room catalog read. | `rooms/get-rooms.handler`. | `ROOM#<roomId>` / `DETAILS`. |
| Local booking creation and `saveBookings`. | `bookings/create-booking.handler`. | `BOOKING#<bookingId>` / `DETAILS` plus user lookup. |
| Local booking collection load/filter. | `bookings/get-user-bookings.handler`. | `USER#<cognitoSub>` / `BOOKING#<bookingId>`. |

## Migration Order

The approved overall order remains unchanged:

1. Cognito authentication.
2. `GET /api/me`.
3. Read-only rooms.
4. Read-only bookings and service requests.
5. Booking creation.
6. Service-request creation.
7. Staff/manager mutations.
8. Remaining catalog/data decisions.
9. Remove obsolete persistent localStorage after testing and rollback planning.

This milestone implements only the backend handlers that will support steps 3,
4 (guest booking list only), and 5. It does not activate them from the frontend.

## Intentionally Untouched

`js/core-data.js`, `js/react-site.js`, `js/react-site-dashboard.js`,
`js/react-site-data.js`, `js/core-analytics.js`, `js/react-site-shared.js`, all
HTML files, CSS files, package/build files, and localStorage logic remain
unchanged. Service requests, activities, reviews, availability, worker/manager/
owner data paths, and demo/reset controls are not migrated by this milestone.
