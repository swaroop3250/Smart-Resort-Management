export default function RoomCard({ room, onBook }) {
  return (
    <article className="react-room-card">
      <img src={room.image} alt={room.name} />
      <div className="react-room-card-body">
        <h3>{room.name}</h3>
        <p>{room.description}</p>
        <p>Capacity: {room.capacity} guests</p>
        <p>Rs. {room.price.toLocaleString()} / night</p>
        {onBook ? (
          <button type="button" onClick={() => onBook(room)}>
            Book Now
          </button>
        ) : null}
      </div>
    </article>
  );
}
