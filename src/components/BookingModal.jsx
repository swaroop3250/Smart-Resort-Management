import { useEffect, useState } from "react";

const initialForm = {
  guestName: "",
  checkIn: "",
  checkOut: "",
  guests: 2,
};

export default function BookingModal({ room, isOpen, onClose, onConfirm, defaultGuestName = "" }) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (isOpen) {
      setForm((current) => ({
        ...current,
        guestName: defaultGuestName || current.guestName,
      }));
    } else {
      setForm(initialForm);
    }
  }, [defaultGuestName, isOpen]);

  if (!isOpen || !room) return null;

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm({
      id: Date.now(),
      roomId: room.id,
      roomName: room.name,
      ...form,
      guests: Number(form.guests),
      status: "confirmed",
    });
    onClose();
  }

  return (
    <div className="react-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="react-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Book {room.name}</h2>
        <form className="react-form" onSubmit={handleSubmit}>
          <label>
            Guest Name
            <input
              required
              value={form.guestName}
              onChange={(event) => setForm({ ...form, guestName: event.target.value })}
            />
          </label>
          <label>
            Check-in
            <input
              required
              type="date"
              value={form.checkIn}
              onChange={(event) => setForm({ ...form, checkIn: event.target.value })}
            />
          </label>
          <label>
            Check-out
            <input
              required
              type="date"
              value={form.checkOut}
              onChange={(event) => setForm({ ...form, checkOut: event.target.value })}
            />
          </label>
          <label>
            Guests
            <input
              min="1"
              max={room.capacity}
              type="number"
              value={form.guests}
              onChange={(event) => setForm({ ...form, guests: event.target.value })}
            />
          </label>
          <div className="react-modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Confirm Booking</button>
          </div>
        </form>
      </div>
    </div>
  );
}
