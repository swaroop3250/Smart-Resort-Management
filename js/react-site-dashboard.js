const { useEffect, useMemo, useRef, useState } = React;
const { PropTypes } = window;
const coreData = window.DashboardCoreData;
const analytics = window.DashboardCoreAnalytics;
const charts = window.DashboardCoreCharts;
const siteData = window.ResortSiteData;
const shared = window.ResortSiteShared;

const { dashboardRoles, getInitialDashboardRole, getUniqueValues, buildGuestActivitySchedule } = siteData;
const { Hero, SectionTitle, KpiCard, MetricRow, SimpleList } = shared;

function DashboardView({
  user,
  bookings,
  serviceRequests,
  onUpdateBookingStatus,
  onDeleteBooking,
  onResetBookings,
  onAddDemoBooking,
  onAddServiceRequest,
}) {
  const lockedRole = user ? user.role : "";
  const [role, setRole] = useState(lockedRole || getInitialDashboardRole);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedWorker, setSelectedWorker] = useState(user && user.role === "worker" ? user.workerId || "worker-1" : "all");
  const revenueRef = useRef(null);
  const occupancyRef = useRef(null);
  const activityRef = useRef(null);

  useEffect(() => {
    if (lockedRole && role !== lockedRole) {
      setRole(lockedRole);
    }
  }, [lockedRole, role]);

  useEffect(() => {
    if (user && user.role === "worker") {
      setSelectedWorker(user.workerId || "worker-1");
    }
  }, [user]);

  const metrics = useMemo(() => {
    const todayIso = analytics.getTodayIso();
    const todayDate = coreData.fromISODate(todayIso);
    const occupancy = analytics.calculateOccupancy(bookings, coreData.CONFIG.totalAvailableRooms, todayIso);
    const todayOps = analytics.calculateTodayOperations(bookings, todayIso);
    const revenue = analytics.calculateRevenueBreakdown(bookings, todayDate);
    const roomPerformance = analytics.calculateRoomPerformance(bookings, todayDate, coreData.roomNames);
    const engagement = analytics.computeEngagement(bookings);
    const highRiskCount = bookings.filter((booking) => analytics.detectBookingRisk(booking).highRisk).length;
    const alerts = analytics.generateAlerts({ occupancy, roomPerformance, engagement, highRiskCount });
    const totalGuests = bookings.reduce((sum, booking) => sum + booking.guests, 0);

    return { occupancy, todayOps, revenue, roomPerformance, engagement, alerts, totalGuests };
  }, [bookings]);

  useEffect(() => {
    if (role !== "owner" && role !== "manager") return;

    charts.renderCharts(bookings, {
      revenueTrendChart: role === "owner" ? revenueRef.current : null,
      occupancyTrendChart: occupancyRef.current,
      activityDensityChart: role === "owner" ? activityRef.current : null,
    });
  }, [bookings, role]);

  const filteredBookings = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const statusMatch = statusFilter === "all" || booking.status === statusFilter;
      const textMatch =
        needle.length === 0 ||
        booking.guestName.toLowerCase().includes(needle) ||
        booking.roomName.toLowerCase().includes(needle);

      return statusMatch && textMatch;
    });
  }, [bookings, search, statusFilter]);

  const workerIds = useMemo(() => getUniqueValues(bookings.map((booking) => booking.assignedWorker)), [bookings]);

  const workerBookings = useMemo(() => {
    if (selectedWorker === "all") return bookings;
    return bookings.filter((booking) => booking.assignedWorker === selectedWorker);
  }, [bookings, selectedWorker]);

  const workerRequests = useMemo(() => {
    if (selectedWorker === "all") return serviceRequests;
    return serviceRequests.filter((request) => request.assignedWorker === selectedWorker);
  }, [serviceRequests, selectedWorker]);

  const primaryGuestId = useMemo(() => {
    if (user && user.role === "guest" && user.guestId) {
      return user.guestId;
    }

    const activeGuestBooking = bookings.find((booking) => booking.status === "active" && booking.guest && booking.guest.id);
    const fallbackGuestBooking = bookings.find((booking) => booking.guest && booking.guest.id);
    const currentGuestBooking = activeGuestBooking || fallbackGuestBooking;
    return currentGuestBooking ? currentGuestBooking.guest.id : null;
  }, [bookings, user]);

  const guestBookings = useMemo(() => {
    if (!primaryGuestId) return [];
    return bookings.filter((booking) => booking.guest && booking.guest.id === primaryGuestId);
  }, [bookings, primaryGuestId]);

  const guestRequests = useMemo(() => {
    if (!primaryGuestId) return [];
    return serviceRequests.filter((request) => request.guestId === primaryGuestId);
  }, [serviceRequests, primaryGuestId]);

  return (
    <main>
      <Hero
        className="react-hero dashboard"
        title="Role-Based Resort Dashboard"
        subtitle="Separate workspaces for owner, manager, worker, and guest operations."
      />
      {!lockedRole ? (
        <section className="section react-dashboard-role-shell">
          <div className="container react-role-switcher">
            {dashboardRoles.map((item) => (
              <button
                key={item.key}
                type="button"
                className={role === item.key ? "react-role-chip active" : "react-role-chip"}
                onClick={() => setRole(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {role === "owner" ? (
        <OwnerDashboard
          bookings={bookings}
          metrics={metrics}
          filteredBookings={filteredBookings}
          revenueRef={revenueRef}
          occupancyRef={occupancyRef}
          activityRef={activityRef}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onUpdateBookingStatus={onUpdateBookingStatus}
          onDeleteBooking={onDeleteBooking}
          onResetBookings={onResetBookings}
          onAddDemoBooking={onAddDemoBooking}
        />
      ) : null}
      {role === "manager" ? (
        <ManagerDashboard
          metrics={metrics}
          filteredBookings={filteredBookings}
          occupancyRef={occupancyRef}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onUpdateBookingStatus={onUpdateBookingStatus}
        />
      ) : null}
      {role === "worker" ? (
        <WorkerDashboard
          bookings={workerBookings}
          serviceRequests={workerRequests}
          allWorkerIds={workerIds}
          selectedWorker={selectedWorker}
          setSelectedWorker={setSelectedWorker}
          lockWorker={Boolean(user && user.role === "worker")}
        />
      ) : null}
      {role === "guest" ? (
        <GuestDashboard
          bookings={guestBookings}
          serviceRequests={guestRequests}
          onAddServiceRequest={onAddServiceRequest}
        />
      ) : null}
    </main>
  );
}

DashboardView.propTypes = {
  user: PropTypes.object,
  bookings: PropTypes.array.isRequired,
  serviceRequests: PropTypes.array.isRequired,
  onUpdateBookingStatus: PropTypes.func.isRequired,
  onDeleteBooking: PropTypes.func.isRequired,
  onResetBookings: PropTypes.func.isRequired,
  onAddDemoBooking: PropTypes.func.isRequired,
  onAddServiceRequest: PropTypes.func.isRequired,
};

function OwnerDashboard({
  bookings,
  metrics,
  filteredBookings,
  revenueRef,
  occupancyRef,
  activityRef,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onUpdateBookingStatus,
  onDeleteBooking,
  onResetBookings,
  onAddDemoBooking,
}) {
  return (
    <>
      <section className="section">
        <div className="container react-dashboard-grid">
          <KpiCard title="Total Bookings" value={bookings.length} />
          <KpiCard title="Active Stays" value={metrics.occupancy.activeStays} />
          <KpiCard title="Occupancy Rate" value={`${metrics.occupancy.occupancyRate}%`} />
          <KpiCard title="Total Revenue" value={coreData.formatCurrency(metrics.revenue.total)} />
          <KpiCard
            title="Revenue Per Room"
            value={coreData.formatCurrency(metrics.revenue.total / coreData.CONFIG.totalAvailableRooms)}
          />
          <KpiCard
            title="Revenue Per Guest"
            value={coreData.formatCurrency(metrics.totalGuests ? metrics.revenue.total / metrics.totalGuests : 0)}
          />
        </div>
      </section>
      <section className="section section-soft">
        <div className="container react-two-col">
          <article className="react-panel">
            <SectionTitle label="Today" title="Operations" />
            <div className="react-two-col">
              <SimpleList
                title="Check-ins"
                items={metrics.todayOps.checkInsToday.map((item) => `${item.guestName} - ${item.roomName}`)}
                empty="No check-ins"
              />
              <SimpleList
                title="Check-outs"
                items={metrics.todayOps.checkOutsToday.map((item) => `${item.guestName} - ${item.roomName}`)}
                empty="No check-outs"
              />
            </div>
          </article>
          <article className="react-panel">
            <SectionTitle label="Revenue" title="Breakdown" />
            <div className="react-metrics">
              <MetricRow name="Base" value={coreData.formatCurrency(metrics.revenue.base)} />
              <MetricRow name="Weekend" value={coreData.formatCurrency(metrics.revenue.weekend)} />
              <MetricRow name="Extra Guest" value={coreData.formatCurrency(metrics.revenue.extraGuest)} />
              <MetricRow name="GST" value={coreData.formatCurrency(metrics.revenue.gst)} />
              <MetricRow name="Avg / Day" value={coreData.formatCurrency(metrics.revenue.averagePerDay)} />
              <MetricRow
                name="Projected Month"
                value={coreData.formatCurrency(metrics.revenue.projectedMonthlyRevenue)}
              />
            </div>
          </article>
        </div>
      </section>
      <section className="section">
        <div className="container react-chart-grid">
          <article className="react-panel">
            <h3>Revenue Trend</h3>
            <canvas ref={revenueRef} width="920" height="280"></canvas>
          </article>
          <article className="react-panel">
            <h3>Occupancy Trend</h3>
            <canvas ref={occupancyRef} width="920" height="280"></canvas>
          </article>
          <article className="react-panel">
            <h3>Activity Density</h3>
            <canvas ref={activityRef} width="920" height="280"></canvas>
          </article>
        </div>
      </section>
      <section className="section section-soft">
        <div className="container react-two-col">
          <article className="react-panel">
            <SectionTitle label="Room" title="Performance" />
            <ul className="react-list">
              {metrics.roomPerformance.rows.map((row) => (
                <li key={row.roomName}>
                  {row.roomName}: {coreData.formatCurrency(row.revenue)} | {row.bookedDays} day(s)
                </li>
              ))}
            </ul>
          </article>
          <article className="react-panel">
            <SectionTitle label="Experience" title="Analytics" />
            <div className="react-metrics">
              <MetricRow name="Avg Engagement" value={`${metrics.engagement.averageEngagement}%`} />
              <MetricRow name="Guests Below 30%" value={metrics.engagement.guestsBelow30} />
              <MetricRow name="Low Utilization" value={metrics.engagement.lowUtilizationBookings} />
            </div>
            <h4>Top Activities</h4>
            <ul className="react-list">
              {metrics.engagement.topActivities.length > 0 ? (
                metrics.engagement.topActivities.map((activity) => (
                  <li key={activity.name}>
                    {activity.name} ({activity.count})
                  </li>
                ))
              ) : (
                <li>No activity data</li>
              )}
            </ul>
          </article>
        </div>
      </section>
      <section className="section">
        <div className="container react-two-col">
          <article className="react-panel">
            <SectionTitle label="Alerts" title="Engine" />
            <ul className="react-list">
              {metrics.alerts.map((alert, index) => (
                <li key={index}>{alert.message}</li>
              ))}
            </ul>
          </article>
          <article className="react-panel">
            <SectionTitle label="Actions" title="Data Controls" />
            <div className="react-action-row">
              <button type="button" className="btn btn-primary" onClick={onAddDemoBooking}>
                Add Demo Booking
              </button>
              <button type="button" className="btn btn-outline" onClick={onResetBookings}>
                Reset Local Data
              </button>
            </div>
          </article>
        </div>
      </section>
      <OperationsTable
        bookings={filteredBookings}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onUpdateBookingStatus={onUpdateBookingStatus}
        onDeleteBooking={onDeleteBooking}
        title="Owner Operations Table"
        editable
      />
    </>
  );
}

function ManagerDashboard({
  metrics,
  filteredBookings,
  occupancyRef,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onUpdateBookingStatus,
}) {
  return (
    <>
      <section className="section">
        <div className="container react-dashboard-grid react-dashboard-grid-4">
          <KpiCard title="Check-ins Today" value={metrics.todayOps.checkInsToday.length} />
          <KpiCard title="Check-outs Today" value={metrics.todayOps.checkOutsToday.length} />
          <KpiCard title="Alerts" value={metrics.alerts.length} />
          <KpiCard title="Active Stays" value={metrics.occupancy.activeStays} />
        </div>
      </section>
      <section className="section section-soft">
        <div className="container react-two-col">
          <article className="react-panel">
            <SectionTitle label="Manager" title="Shift Priorities" />
            <ul className="react-list">
              <li>Prepare arrivals and departures for today's housekeeping and front-desk teams.</li>
              <li>Track alerts, occupancy pressure, and low-engagement guest journeys.</li>
              <li>Keep booking statuses accurate throughout the day.</li>
            </ul>
          </article>
          <article className="react-panel">
            <SectionTitle label="Alerts" title="Attention Needed" />
            <ul className="react-list">
              {metrics.alerts.length > 0 ? (
                metrics.alerts.map((alert, index) => <li key={index}>{alert.message}</li>)
              ) : (
                <li>No active alerts.</li>
              )}
            </ul>
          </article>
        </div>
      </section>
      <section className="section">
        <div className="container react-chart-grid">
          <article className="react-panel">
            <h3>Occupancy Trend</h3>
            <canvas ref={occupancyRef} width="920" height="280"></canvas>
          </article>
        </div>
      </section>
      <OperationsTable
        bookings={filteredBookings}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onUpdateBookingStatus={onUpdateBookingStatus}
        title="Manager Booking Board"
        editable
      />
    </>
  );
}

function WorkerDashboard({ bookings, serviceRequests, allWorkerIds, selectedWorker, setSelectedWorker, lockWorker }) {
  const todayIso = analytics.getTodayIso();
  const taskBookings = bookings.filter(
    (booking) => booking.checkIn === todayIso || booking.checkOut === todayIso || booking.status === "active"
  );
  const activities = bookings.flatMap((booking) => booking.activities || []);
  const pendingRequests = serviceRequests.filter((request) => request.status !== "completed");

  return (
    <>
      <section className="section">
        <div className="container react-two-col">
          <article className="react-panel">
            <SectionTitle label="Worker" title="Assignment Desk" />
            {lockWorker ? (
              <p className="react-dashboard-copy">Signed in as {selectedWorker}. Assigned requests and stays are shown below.</p>
            ) : (
              <label className="react-form">
                <span>Select worker</span>
                <select value={selectedWorker} onChange={(event) => setSelectedWorker(event.target.value)}>
                  <option value="all">All workers</option>
                  {allWorkerIds.map((workerId) => (
                    <option key={workerId} value={workerId}>
                      {workerId}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </article>
          <div className="react-dashboard-grid react-dashboard-grid-4">
            <KpiCard title="Assigned Stays" value={bookings.length} />
            <KpiCard title="Today's Tasks" value={taskBookings.length} />
            <KpiCard title="Activities" value={activities.length} />
            <KpiCard title="Open Requests" value={pendingRequests.length} />
          </div>
        </div>
      </section>
      <section className="section section-soft">
        <div className="container react-two-col">
          <article className="react-panel">
            <SectionTitle label="Tasks" title="Today's Queue" />
            <ul className="react-list">
              {taskBookings.length > 0 ? (
                taskBookings.map((booking) => (
                  <li key={booking.id}>
                    {booking.guestName} | {booking.roomName} |{" "}
                    {booking.checkIn === todayIso
                      ? "Check-in"
                      : booking.checkOut === todayIso
                        ? "Checkout"
                        : "In-stay support"}
                  </li>
                ))
              ) : (
                <li>No active assignments.</li>
              )}
            </ul>
          </article>
          <article className="react-panel">
            <SectionTitle label="Requests" title="Assigned Guest Requests" />
            <ul className="react-list react-request-list">
              {serviceRequests.length > 0 ? (
                serviceRequests.map((request) => (
                  <li key={request.id}>
                    <div className="react-request-meta">
                      <span>{request.guestName}</span>
                      <span>{request.requestType}</span>
                      <span>{request.priority}</span>
                    </div>
                    <p className="react-request-note">{request.note}</p>
                  </li>
                ))
              ) : (
                <li>No guest requests assigned.</li>
              )}
            </ul>
          </article>
        </div>
      </section>
      <section className="section">
        <div className="container react-two-col">
          <article className="react-panel">
            <SectionTitle label="Service" title="Scheduled Activities" />
            <ul className="react-list">
              {activities.length > 0 ? (
                activities.slice(0, 8).map((activity, index) => (
                  <li key={`${activity.name}-${index}`}>
                    {activity.name} | {activity.date} | {activity.startTime}
                  </li>
                ))
              ) : (
                <li>No activities assigned.</li>
              )}
            </ul>
          </article>
          <article className="react-panel">
            <SectionTitle label="Rooms" title="Stay Coverage" />
            <ul className="react-list">
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <li key={`coverage-${booking.id}`}>
                    {booking.roomName} | {booking.guestName} | {booking.status}
                  </li>
                ))
              ) : (
                <li>No rooms assigned.</li>
              )}
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}

function GuestDashboard({ bookings, serviceRequests, onAddServiceRequest }) {
  const latestBooking = useMemo(() => bookings.find((booking) => booking.status === "active") || bookings[0], [bookings]);
  const activityDays = useMemo(() => buildGuestActivitySchedule(bookings), [bookings]);
  const activeStayCount = useMemo(
    () => bookings.filter((booking) => booking.status === "active").length,
    [bookings]
  );
  const plannedActivityCount = useMemo(
    () => bookings.reduce((sum, booking) => sum + (booking.activities || []).length, 0),
    [bookings]
  );
  const requestHistory = useMemo(() => {
    return [...serviceRequests].sort((left, right) =>
      String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
    );
  }, [serviceRequests]);

  const [requestForm, setRequestForm] = useState({
    requestType: coreData.requestTypes[0],
    priority: "medium",
    note: "",
  });
  const [requestMessage, setRequestMessage] = useState("");

  const handleRequestFieldChange = (field) => (event) => {
    const nextValue = event.target.value;
    setRequestMessage("");
    setRequestForm((current) => ({ ...current, [field]: nextValue }));
  };

  const handleRequestSubmit = (event) => {
    event.preventDefault();

    if (!latestBooking) {
      setRequestMessage("A booking is required before placing a guest request.");
      return;
    }

    if (!requestForm.note.trim()) {
      setRequestMessage("Please add a short request note.");
      return;
    }

    onAddServiceRequest({
      bookingId: latestBooking.id,
      guestId: latestBooking.guest && latestBooking.guest.id,
      guestName: latestBooking.guestName,
      roomName: latestBooking.roomName,
      assignedWorker: latestBooking.assignedWorker,
      requestType: requestForm.requestType,
      priority: requestForm.priority,
      status: "assigned",
      note: requestForm.note.trim(),
      createdAt: coreData.toISODate(new Date()),
    });

    setRequestForm((current) => ({ ...current, note: "" }));
    setRequestMessage("Your resort service request has been sent.");
  };

  return (
    <>
      <section className="section">
        <div className="container react-two-col">
          <article className="react-panel">
            <SectionTitle label="Guest" title="My Stay" />
            <p className="react-dashboard-copy">
              {latestBooking
                ? `${latestBooking.guestName} can view one guest profile, upcoming resort plans, and personal service requests here.`
                : "No guest booking is available right now."}
            </p>
          </article>
          <div className="react-dashboard-grid react-dashboard-grid-3">
            <KpiCard title="My Reservations" value={bookings.length} />
            <KpiCard title="Active Stays" value={activeStayCount} />
            <KpiCard title="My Activities" value={plannedActivityCount} />
          </div>
        </div>
      </section>
      <section className="section section-soft">
        <div className="container react-two-col">
          <article className="react-panel">
            <SectionTitle label="Next Stay" title="Reservation Summary" />
            {latestBooking ? (
              <div className="react-metrics">
                <MetricRow name="Guest" value={latestBooking.guestName} />
                <MetricRow name="Room" value={latestBooking.roomName} />
                <MetricRow name="Dates" value={`${latestBooking.checkIn} to ${latestBooking.checkOut}`} />
                <MetricRow name="Total" value={coreData.formatCurrency(latestBooking.totalAmount)} />
                <MetricRow name="Assigned Host" value={latestBooking.assignedWorker} />
              </div>
            ) : (
              <p>No reservation selected yet.</p>
            )}
          </article>
          <article className="react-panel">
            <SectionTitle label="Concierge" title="My Activities By Day" />
            <div className="react-day-stack">
              {activityDays.length > 0 ? (
                activityDays.map((day) => (
                  <article className="react-day-card" key={day.date}>
                    <h4>{day.dayLabel}</h4>
                    <p>{day.dateLabel}</p>
                    {Object.entries(day.sessions).map(([session, items]) =>
                      items.length > 0 ? (
                        <div className="react-session-block" key={`${day.date}-${session}`}>
                          <strong>{session}</strong>
                          <ul className="react-list">
                            {items.map((activity, index) => (
                              <li key={`${day.date}-${session}-${activity.name}-${index}`}>
                                {activity.name} | {activity.startTime} - {activity.endTime}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )}
                  </article>
                ))
              ) : (
                <p>No scheduled activities.</p>
              )}
            </div>
          </article>
        </div>
      </section>
      <section className="section">
        <div className="container react-two-col">
          <article className="react-panel">
            <SectionTitle label="Requests" title="Ask Resort Support" />
            <form className="react-form" onSubmit={handleRequestSubmit}>
              <label>
                Request Type
                <select value={requestForm.requestType} onChange={handleRequestFieldChange("requestType")}>
                  {coreData.requestTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select value={requestForm.priority} onChange={handleRequestFieldChange("priority")}>
                  {coreData.requestPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Request Note
                <textarea
                  rows="3"
                  value={requestForm.note}
                  onChange={handleRequestFieldChange("note")}
                  placeholder="Need extra towels, spa timing, airport pickup..."
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={!latestBooking}>
                Send Request
              </button>
              <p className="react-note">{requestMessage}</p>
            </form>
          </article>
          <article className="react-panel">
            <SectionTitle label="Status" title="My Requests" />
            <ul className="react-list react-request-list">
              {requestHistory.length > 0 ? (
                requestHistory.map((request) => (
                  <li key={request.id}>
                    <div className="react-request-meta">
                      <span>{request.requestType}</span>
                      <span>{request.status.replace("_", " ")}</span>
                      <span>{request.priority}</span>
                    </div>
                    <p className="react-request-note">{request.note}</p>
                  </li>
                ))
              ) : (
                <li>No service requests yet.</li>
              )}
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}

function OperationsTable({
  bookings,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onUpdateBookingStatus,
  onDeleteBooking,
  title,
  editable = false,
}) {
  return (
    <section className="section section-soft">
      <div className="container react-panel">
        <SectionTitle label="Bookings" title={title} />
        <div className="react-toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guest or room"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="react-table-wrap">
          <table className="react-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Room</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Total</th>
                {editable ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.guestName}</td>
                    <td>{booking.roomName}</td>
                    <td>
                      {booking.checkIn} to {booking.checkOut}
                    </td>
                    <td>
                      {editable ? (
                        <select
                          className="status-select"
                          value={booking.status}
                          onChange={(event) => onUpdateBookingStatus(booking.id, event.target.value)}
                        >
                          <option value="active">active</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      ) : (
                        booking.status
                      )}
                    </td>
                    <td>{coreData.formatCurrency(booking.totalAmount)}</td>
                    {editable ? (
                      <td>
                        {onDeleteBooking ? (
                          <button type="button" className="row-btn" onClick={() => onDeleteBooking(booking.id)}>
                            Delete
                          </button>
                        ) : (
                          "Update only"
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={editable ? "6" : "5"}>No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

window.ResortSiteDashboard = {
  DashboardView,
};
