import RoomCard from "./RoomCard";

export default function RoomGrid({ rooms, onBook }) {
  return (
    <section className="section">
      <div className="container react-card-grid">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} onBook={onBook} />
        ))}
      </div>
    </section>
  );
}
