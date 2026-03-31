function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function createWorkerTasks(bookings) {
  return bookings.map((booking) => ({
    id: `${booking.id}-task`,
    title: booking.status === "checked-in" ? "In-stay support" : "Arrival preparation",
    detail: `${booking.roomName} for ${booking.guestName}`,
    assignedWorker: booking.assignedWorker,
    status: booking.status,
  }));
}

function SummaryCard({ label, value, note }) {
  return (
    <article className="dashboard-card">
      <p>{label}</p>
      <h3>{value}</h3>
      <span>{note}</span>
    </article>
  );
}

function BookingList({ title, bookings, emptyMessage }) {
  return (
    <article className="react-panel">
      <h3>{title}</h3>
      {bookings.length ? (
        <div className="dashboard-list">
          {bookings.map((booking) => (
            <div className="dashboard-list-item" key={booking.id}>
              <strong>{booking.roomName}</strong>
              <p>{booking.guestName}</p>
              <p>
                {booking.checkIn} to {booking.checkOut}
              </p>
              <span className="status-chip">{booking.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </article>
  );
}

export default function Dashboard({ user, bookings, inventoryCount }) {
  const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
  const checkedInBookings = bookings.filter((booking) => booking.status === "checked-in");
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const guestBookings = bookings.filter((booking) => booking.guestEmail === user?.email);
  const workerTasks = createWorkerTasks(bookings);
  const occupancyRate = inventoryCount ? Math.round((checkedInBookings.length / inventoryCount) * 100) : 0;

  const dashboardTitles = {
    owner: {
      heading: "Owner Overview",
      copy: "Track resort revenue, reservations, and overall property performance.",
    },
    manager: {
      heading: "Manager Operations",
      copy: "Monitor arrivals, current stays, and the reservation board for the day.",
    },
    worker: {
      heading: "Worker Desk",
      copy: "Review assigned room tasks and stay support activity across the resort.",
    },
    guest: {
      heading: "Guest Dashboard",
      copy: "See your reservations and stay details in one place.",
    },
  };

  const currentView = dashboardTitles[user?.role] || dashboardTitles.guest;

  return (
    <main>
      <section className="section dashboard-hero">
        <div className="container react-head">
          <p className="label">{user ? user.role : "dashboard"}</p>
          <h1>{user ? `Hello, ${user.name}` : "Booking Dashboard"}</h1>
          <p>{currentView.copy}</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="dashboard-heading">
            <h2>{currentView.heading}</h2>
            <p>Logged in as {user?.role} using {user?.email}</p>
          </div>

          {user?.role === "owner" ? (
            <>
              <div className="dashboard-grid">
                <SummaryCard label="Total Reservations" value={bookings.length} note="All active and upcoming bookings" />
                <SummaryCard label="Current Occupancy" value={`${occupancyRate}%`} note={`${checkedInBookings.length} rooms checked in`} />
                <SummaryCard label="Reservation Revenue" value={formatCurrency(totalRevenue)} note="Based on current reservations" />
                <SummaryCard label="Confirmed Arrivals" value={confirmedBookings.length} note="Upcoming guest arrivals" />
              </div>
              <div className="react-two-col dashboard-layout">
                <BookingList
                  title="Recent Reservations"
                  bookings={bookings.slice(0, 4)}
                  emptyMessage="No reservations are available yet."
                />
                <article className="react-panel">
                  <h3>Business Snapshot</h3>
                  <div className="dashboard-list">
                    <div className="dashboard-list-item">
                      <strong>Highest Value Stay</strong>
                      <p>{bookings[0] ? bookings.reduce((highest, booking) => booking.totalAmount > highest.totalAmount ? booking : highest, bookings[0]).roomName : "No data"}</p>
                    </div>
                    <div className="dashboard-list-item">
                      <strong>Assigned Worker Teams</strong>
                      <p>{[...new Set(bookings.map((booking) => booking.assignedWorker))].join(", ") || "No teams assigned"}</p>
                    </div>
                    <div className="dashboard-list-item">
                      <strong>Guest Mix</strong>
                      <p>{bookings.reduce((sum, booking) => sum + booking.guests, 0)} guests across all reservations</p>
                    </div>
                  </div>
                </article>
              </div>
            </>
          ) : null}

          {user?.role === "manager" ? (
            <>
              <div className="dashboard-grid">
                <SummaryCard label="Upcoming Arrivals" value={confirmedBookings.length} note="Reservations preparing for arrival" />
                <SummaryCard label="In-Stay Guests" value={checkedInBookings.length} note="Rooms requiring active oversight" />
                <SummaryCard label="Room Teams" value={[...new Set(bookings.map((booking) => booking.assignedWorker))].length} note="Workers covering guest stays" />
              </div>
              <div className="react-two-col dashboard-layout">
                <BookingList
                  title="Arrival Board"
                  bookings={confirmedBookings}
                  emptyMessage="No confirmed arrivals waiting right now."
                />
                <BookingList
                  title="Current Stay Board"
                  bookings={checkedInBookings}
                  emptyMessage="No guests are currently checked in."
                />
              </div>
            </>
          ) : null}

          {user?.role === "worker" ? (
            <>
              <div className="dashboard-grid">
                <SummaryCard label="Assigned Tasks" value={workerTasks.length} note="Arrival prep and in-stay support" />
                <SummaryCard label="Checked-in Rooms" value={checkedInBookings.length} note="Rooms needing active service" />
                <SummaryCard label="Upcoming Arrivals" value={confirmedBookings.length} note="Rooms to prepare next" />
              </div>
              <article className="react-panel">
                <h3>Worker Task List</h3>
                {workerTasks.length ? (
                  <div className="dashboard-list">
                    {workerTasks.map((task) => (
                      <div className="dashboard-list-item" key={task.id}>
                        <strong>{task.title}</strong>
                        <p>{task.detail}</p>
                        <p>Assigned to: {task.assignedWorker}</p>
                        <span className="status-chip">{task.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No tasks are assigned right now.</p>
                )}
              </article>
            </>
          ) : null}

          {user?.role === "guest" ? (
            <>
              <div className="dashboard-grid">
                <SummaryCard label="My Reservations" value={guestBookings.length} note="Bookings linked to your account" />
                <SummaryCard label="Current Stay" value={guestBookings.filter((booking) => booking.status === "checked-in").length} note="Reservations already checked in" />
                <SummaryCard label="Upcoming Stay Value" value={formatCurrency(guestBookings.reduce((sum, booking) => sum + booking.totalAmount, 0))} note="Total value of your reservations" />
              </div>
              <BookingList
                title="My Reservations"
                bookings={guestBookings}
                emptyMessage="No reservations are linked to this guest account yet. Book a room to see it here."
              />
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
