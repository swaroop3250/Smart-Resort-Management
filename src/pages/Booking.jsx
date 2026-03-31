import { useState } from "react";
import BookingModal from "../components/BookingModal";
import RoomGrid from "../components/RoomGrid";

export default function Booking({ rooms, user, onCreateBooking }) {
  const [selectedRoom, setSelectedRoom] = useState(null);

  if (user?.role !== "guest") {
    return (
      <main>
        <section className="section">
          <div className="container react-head">
            <p className="label">Restricted</p>
            <h1>Booking is available for guest access</h1>
            <p>Managers, owners, and workers can review reservations from the dashboard.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="section">
        <div className="container react-head">
          <p className="label">Booking</p>
          <h1>Choose Your Stay</h1>
          <p>{user ? `${user.name}, select a room and complete a quick reservation.` : "Select a room and complete a quick reservation."}</p>
        </div>
      </section>
      <RoomGrid rooms={rooms} onBook={setSelectedRoom} />
      <BookingModal
        room={selectedRoom}
        isOpen={Boolean(selectedRoom)}
        onClose={() => setSelectedRoom(null)}
        onConfirm={onCreateBooking}
        defaultGuestName={user?.name || ""}
      />
    </main>
  );
}
