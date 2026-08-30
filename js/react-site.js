const { useMemo, useState } = React;
const coreData = window.DashboardCoreData;
const siteData = window.ResortSiteData;
const shared = window.ResortSiteShared;
const dashboard = window.ResortSiteDashboard;
const { useEffect } = React;
const auth = window.SmartResortAuth;
const api = window.SmartResortApi;

const {
  ROUTES,
  NAV_ITEMS,
  roomPriceFilters,
  roomRatingFilters,
  RESORT_ROOMS,
  PLANNABLE_ACTIVITIES,
  testimonials,
  accessRoles,
  getRouteFromHash,
  getInitialRoute,
  createInitialActivityTimes,
  addMinutesToTime,
  buildScheduledActivities,
  buildClashMessages,
  deriveAccessId,
  formatUserLabel,
} = siteData;

const { Hero, SectionTitle, MetricRow } = shared;
const { DashboardView } = dashboard;
const EMPTY_ESTIMATE = Object.freeze({
  baseAmount: 0,
  weekendCharge: 0,
  extraGuestCharge: 0,
  gstAmount: 0,
  totalAmount: 0,
});

function resolveRoute(route, user) {
  let nextRoute = ROUTES.includes(route) ? route : "home";

  if (["booking", "dashboard"].includes(nextRoute) && !user) {
    return "login";
  }

  if (nextRoute === "login" && user) {
    return user.role === "guest" ? "booking" : "dashboard";
  }

  if (nextRoute === "booking" && user && user.role !== "guest") {
    nextRoute = "dashboard";
  }

  return nextRoute;
}

class ResortApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      route: getInitialRoute(),
      rooms: [],
      roomsLoaded: false,
      bookings: [],
      serviceRequests: [],
      user: null,
      notice: "",
    };

    this.hasUnmounted = false;
    this.pendingRoute = null;

    this.initializeApp = this.initializeApp.bind(this);
    this.loadBookingsForUser = this.loadBookingsForUser.bind(this);
    this.handleHashChange = this.handleHashChange.bind(this);
    this.handleNavigate = this.handleNavigate.bind(this);
    this.handleAddBooking = this.handleAddBooking.bind(this);
    this.handleUpdateBookingStatus = this.handleUpdateBookingStatus.bind(this);
    this.handleDeleteBooking = this.handleDeleteBooking.bind(this);
    this.handleResetBookings = this.handleResetBookings.bind(this);
    this.handleAddDemoBooking = this.handleAddDemoBooking.bind(this);
    this.handleAddServiceRequest = this.handleAddServiceRequest.bind(this);
    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  componentDidMount() {
    window.addEventListener("hashchange", this.handleHashChange);
    this.initializeApp();
  }

  componentWillUnmount() {
    this.hasUnmounted = true;
    window.removeEventListener("hashchange", this.handleHashChange);
  }

  async initializeApp() {
    let user = null;
    let notice = "";
    let rooms = [];
    let roomsLoaded = false;
    let bookings = [];

    try {
      user = await auth.handleCallback();
    } catch (error) {
      auth.logout({ redirect: false });
      notice = error && error.message ? error.message : "Please sign in to continue.";
    }

    if (!user) {
      user = auth.getCurrentUser();
    }

    try {
      const roomItems = await api.getRooms();
      rooms = coreData.setRuntimeRooms(roomItems);
      roomsLoaded = true;
    } catch (error) {
      rooms = [];
    }

    if (user) {
      try {
        bookings = await this.loadBookingsForUser(user);
      } catch (error) {
        if (error && (error.status === 401 || error.status === 403)) {
          auth.logout({ redirect: false });
          user = null;
          notice = error.message || "Please sign in to continue.";
        } else if (!notice) {
          notice = error && error.message ? error.message : "";
        }
      }
    }

    const serviceRequests = coreData.loadServiceRequests(bookings);
    const nextRoute = notice && !user ? "login" : resolveRoute(getRouteFromHash() || this.state.route, user);

    if (this.hasUnmounted) return;

    this.setState({
      route: nextRoute,
      rooms,
      roomsLoaded,
      bookings,
      serviceRequests,
      user,
      notice,
    });

    if (getRouteFromHash() !== nextRoute) {
      window.location.hash = nextRoute;
    }
  }

  async loadBookingsForUser(user) {
    const items = await api.getBookings();
    return items.map((item, index) => coreData.normalizeApiBooking(item, index, user));
  }

  handleHashChange() {
    const nextRoute = getRouteFromHash();
    if (!nextRoute) return;

    if (["booking", "dashboard"].includes(nextRoute) && !this.state.user) {
      this.pendingRoute = nextRoute;
    }

    const safeRoute = resolveRoute(nextRoute, this.state.user);
    if (safeRoute !== nextRoute) {
      if (!this.state.user) {
        this.setState({ notice: "Please sign in to continue." });
      }
      window.location.hash = safeRoute;
      return;
    }

    if (nextRoute !== this.state.route) {
      this.setState({
        route: nextRoute,
        notice: nextRoute === "login" ? this.state.notice : "",
      });
    }
  }

  handleNavigate(route) {
    if (!ROUTES.includes(route)) return;

    if (["booking", "dashboard"].includes(route) && !this.state.user) {
      this.pendingRoute = route;
      this.setState({ notice: "Please sign in to continue." });
      route = "login";
    }

    route = resolveRoute(route, this.state.user);

    if (getRouteFromHash() !== route) {
      window.location.hash = route;
      return;
    }

    if (this.state.route !== route || (route !== "login" && this.state.notice)) {
      this.setState({
        route,
        notice: route === "login" ? this.state.notice : "",
      });
    }
  }

  async handleAddBooking(booking) {
    try {
      const createdBooking = await api.createBooking({
        roomId: booking.roomId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
      });
      const nextBooking = coreData.normalizeApiBooking(createdBooking, 0, this.state.user);
      const nextBookings = [nextBooking, ...this.state.bookings.filter((item) => String(item.id) !== String(nextBooking.id))];
      const nextRequests = coreData.loadServiceRequests(nextBookings);

      this.setState({
        bookings: nextBookings,
        serviceRequests: nextRequests,
        route: "dashboard",
        notice: "",
      });
      window.location.hash = "dashboard";
      return nextBooking;
    } catch (error) {
      if (error && (error.status === 401 || error.status === 403)) {
        auth.logout({ redirect: false });
        this.pendingRoute = "booking";
        this.setState({
          user: null,
          bookings: [],
          serviceRequests: coreData.loadServiceRequests([]),
          route: "login",
          notice: error.message || "Please sign in to continue.",
        });
        window.location.hash = "login";
      }

      throw error;
    }
  }

  handleUpdateBookingStatus(id, status) {
    const nextBookings = this.state.bookings.map((booking) => (booking.id === id ? { ...booking, status } : booking));
    this.setState({ bookings: nextBookings });
  }

  handleDeleteBooking(id) {
    const nextBookings = this.state.bookings.filter((booking) => booking.id !== id);
    const nextRequests = this.state.serviceRequests.filter((request) => request.bookingId !== id);
    coreData.saveServiceRequests(nextRequests);
    this.setState({ bookings: nextBookings, serviceRequests: nextRequests });
  }

  handleResetBookings() {
    const nextBookings = [];
    const nextRequests = coreData.resetServiceRequests(nextBookings);
    this.setState({ bookings: nextBookings, serviceRequests: nextRequests });
  }

  handleAddDemoBooking() {
    const demoBooking = coreData.generateDemoBookings()[0];
    this.setState((current) => ({
      bookings: [coreData.normalizeBooking(demoBooking, 0), ...current.bookings],
      route: "dashboard",
    }));
    window.location.hash = "dashboard";
  }

  handleAddServiceRequest(request) {
    const nextRequests = [
      coreData.normalizeServiceRequest(request, 0, this.state.bookings),
      ...this.state.serviceRequests,
    ];

    coreData.saveServiceRequests(nextRequests);
    this.setState({ serviceRequests: nextRequests, route: "dashboard" });
    window.location.hash = "dashboard";
  }

  async handleLogin() {
    const requestedRoute = this.pendingRoute || this.state.route;
    this.pendingRoute = null;
    this.setState({ notice: "" });

    try {
      await auth.login({ returnRoute: requestedRoute });
    } catch (error) {
      this.setState({
        notice: error && error.message ? error.message : "Please sign in to continue.",
      });
    }
  }

  handleLogout() {
    this.pendingRoute = null;
    this.setState({
      user: null,
      bookings: [],
      serviceRequests: [],
      notice: "",
    });
    auth.logout();
  }

  render() {
    return (
      <div className="react-app-shell">
        <NavBar route={this.state.route} onNavigate={this.handleNavigate} user={this.state.user} onLogout={this.handleLogout} />
        <RouteView
          route={this.state.route}
          rooms={this.state.rooms}
          roomsLoaded={this.state.roomsLoaded}
          user={this.state.user}
          bookings={this.state.bookings}
          serviceRequests={this.state.serviceRequests}
          notice={this.state.notice}
          onLogin={this.handleLogin}
          onAddBooking={this.handleAddBooking}
          onUpdateBookingStatus={this.handleUpdateBookingStatus}
          onDeleteBooking={this.handleDeleteBooking}
          onResetBookings={this.handleResetBookings}
          onAddDemoBooking={this.handleAddDemoBooking}
          onAddServiceRequest={this.handleAddServiceRequest}
        />
      </div>
    );
  }
}

function NavBar({ route, onNavigate, user, onLogout }) {
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.key === "login") return !user;
    if (item.key === "booking") return user && user.role === "guest";
    if (item.key === "dashboard") return Boolean(user);
    return true;
  });

  const ctaRoute = user ? "dashboard" : "login";
  const ctaLabel = user ? (user.role === "guest" ? "My Stay" : "Dashboard") : "Login";

  return (
    <header className="site-header" id="siteHeader">
      <div className="container nav-wrap">
        <a
          className="logo react-logo"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("home");
          }}
        >
          <span className="react-logo-mark">CCR</span>
          <span>
            Coastal Crown Resort
            <small>Oceanfront escape</small>
          </span>
        </a>
        <nav>
          <ul className="nav-links">
            {user ? <li><span className="react-user-badge">{user.role}</span></li> : null}
            {visibleItems.map((item) => (
              <li key={item.key}>
                <a
                  href={`#${item.key}`}
                  className={route === item.key ? "active" : ""}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(item.key);
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`#${ctaRoute}`}
                className="react-nav-cta"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(ctaRoute);
                }}
              >
                {ctaLabel}
              </a>
            </li>
            {user ? (
              <li>
                <button type="button" className="react-nav-link-button" onClick={onLogout}>
                  Logout
                </button>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
    </header>
  );
}

NavBar.propTypes = {
  route: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  user: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
};

function RouteView({
  route,
  rooms,
  roomsLoaded,
  user,
  bookings,
  serviceRequests,
  notice,
  onLogin,
  onAddBooking,
  onUpdateBookingStatus,
  onDeleteBooking,
  onResetBookings,
  onAddDemoBooking,
  onAddServiceRequest,
}) {
  switch (route) {
    case "home":
      return <HomeView />;
    case "reviews":
      return <ReviewsView />;
    case "rooms":
      return <RoomsView rooms={rooms} roomsLoaded={roomsLoaded} />;
    case "activities":
      return <ActivitiesView />;
    case "login":
      return <LoginView onLogin={onLogin} user={user} notice={notice} />;
    case "booking":
      return user && user.role === "guest"
        ? <BookingView onAddBooking={onAddBooking} rooms={rooms} roomsLoaded={roomsLoaded} user={user} />
        : <LoginView onLogin={onLogin} user={user} notice={notice || "Sign in as a guest to reserve a room."} />;
    case "dashboard":
      return user ? (
        <DashboardView
          user={user}
          bookings={bookings}
          serviceRequests={serviceRequests}
          onUpdateBookingStatus={onUpdateBookingStatus}
          onDeleteBooking={onDeleteBooking}
          onResetBookings={onResetBookings}
          onAddDemoBooking={onAddDemoBooking}
          onAddServiceRequest={onAddServiceRequest}
        />
      ) : (
        <LoginView onLogin={onLogin} user={user} notice={notice || "Sign in to open the resort dashboard."} />
      );
    default:
      return <HomeView />;
  }
}

RouteView.propTypes = {
  route: PropTypes.string.isRequired,
  rooms: PropTypes.array.isRequired,
  roomsLoaded: PropTypes.bool.isRequired,
  user: PropTypes.object,
  bookings: PropTypes.array.isRequired,
  serviceRequests: PropTypes.array.isRequired,
  notice: PropTypes.string,
  onLogin: PropTypes.func.isRequired,
  onAddBooking: PropTypes.func.isRequired,
  onUpdateBookingStatus: PropTypes.func.isRequired,
  onDeleteBooking: PropTypes.func.isRequired,
  onResetBookings: PropTypes.func.isRequired,
  onAddDemoBooking: PropTypes.func.isRequired,
  onAddServiceRequest: PropTypes.func.isRequired,
};

function BookingSection({
  onAddBooking,
  rooms,
  roomsLoaded,
  user,
  label = "Reservations",
  title = "Book Your Stay",
  description = "Choose your room and confirm the details below.",
  className = "",
}) {
  const [form, setForm] = useState({
    guestName: user ? user.name : "",
    roomId: rooms[0] ? rooms[0].roomId : "",
    checkIn: coreData.toISODate(new Date()),
    checkOut: coreData.toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    guests: 2,
  });
  const [message, setMessage] = useState("");
  const { guestName, roomId, checkIn, checkOut, guests } = form;

  useEffect(() => {
    setForm((current) => ({
      ...current,
      guestName: current.guestName || (user ? user.name : ""),
      roomId: current.roomId || (rooms[0] ? rooms[0].roomId : ""),
    }));
  }, [rooms, user]);

  const updateField = (field, parser = (value) => value) => (event) => {
    const nextValue = parser(event.target.value);
    setMessage("");
    setForm((current) => ({ ...current, [field]: nextValue }));
  };

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.roomId === roomId) || rooms[0] || null,
    [rooms, roomId]
  );
  const roomName = selectedRoom ? selectedRoom.roomName : "";

  const estimate = useMemo(
    () => (roomName ? coreData.calculateAmounts(roomName, checkIn, checkOut, guests) : EMPTY_ESTIMATE),
    [roomName, checkIn, checkOut, guests]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user || user.role !== "guest") {
      setMessage("Please sign in as a guest before booking a room.");
      return;
    }

    if (!roomsLoaded || !selectedRoom || !selectedRoom.roomId) {
      setMessage("Room availability is still loading. Please try again in a moment.");
      return;
    }

    if (!guestName.trim()) {
      setMessage("Guest name is required.");
      return;
    }

    try {
      await onAddBooking({
        roomId: selectedRoom.roomId,
        roomName: selectedRoom.roomName,
        guestName,
        checkIn,
        checkOut,
        guests: Number(guests),
      });
      setMessage("Booking added successfully. Redirecting to Dashboard.");
    } catch (error) {
      setMessage(error && error.message ? error.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <section className={`section react-booking-section ${className}`.trim()} id="homeBookingSection">
      <div className="container">
        <div className="section-head react-head react-booking-head">
          <p className="label">{label}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="react-two-col">
          <form className="react-panel react-form" onSubmit={handleSubmit}>
            <h3>Reservation Details</h3>
            <label>
              Guest Name
              <input value={guestName} onChange={updateField("guestName")} />
            </label>
            <label>
              Room
              <select value={selectedRoom ? selectedRoom.roomId : ""} onChange={updateField("roomId")} disabled={rooms.length === 0}>
                {rooms.map((roomOption) => (
                  <option key={roomOption.roomId} value={roomOption.roomId}>
                    {roomOption.roomName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Check-in
              <input type="date" value={checkIn} onChange={updateField("checkIn")} />
            </label>
            <label>
              Check-out
              <input type="date" value={checkOut} onChange={updateField("checkOut")} />
            </label>
            <label>
              Guests
              <input type="number" min="1" max="8" value={guests} onChange={updateField("guests", Number)} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={!roomsLoaded || !selectedRoom}>
              Confirm Booking
            </button>
            <p className="react-note">{message}</p>
          </form>
          <article className="react-panel">
            <h3>Estimate</h3>
            <div className="react-metrics">
              <MetricRow name="Base Amount" value={coreData.formatCurrency(estimate.baseAmount)} />
              <MetricRow name="Weekend Charge" value={coreData.formatCurrency(estimate.weekendCharge)} />
              <MetricRow name="Extra Guest" value={coreData.formatCurrency(estimate.extraGuestCharge)} />
              <MetricRow name="GST" value={coreData.formatCurrency(estimate.gstAmount)} />
              <MetricRow name="Total" value={coreData.formatCurrency(estimate.totalAmount)} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

BookingSection.propTypes = {
  onAddBooking: PropTypes.func.isRequired,
  rooms: PropTypes.array.isRequired,
  roomsLoaded: PropTypes.bool.isRequired,
  user: PropTypes.object,
  label: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  className: PropTypes.string,
};

function LoginView({ onLogin, user, notice = "" }) {
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (user) {
      window.location.hash = user.role === "guest" ? "booking" : "dashboard";
      return;
    }

    await onLogin();
  };

  return (
    <main>
      <Hero
        className="react-hero login"
        title="Resort Access Login"
        subtitle="Continue through the resort's secure sign-in and return to your stay experience."
      />
      <section className="section">
        <div className="container react-auth-layout">
          <article className="react-panel">
            <SectionTitle label="Access Types" title="Who is signing in?" />
            <div className="react-login-role-grid">
              {accessRoles.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={item.key === "guest" ? "react-login-role-card active" : "react-login-role-card"}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
            <div className="react-login-note">
              <p>{notice || "Sign in through the secure resort login to continue."}</p>
              <p>Current connected frontend features continue through the guest stay flow after authentication.</p>
            </div>
          </article>
          <form className="react-panel react-form" onSubmit={handleSubmit}>
            <SectionTitle label="Login" title="Sign In" />
            <p className="react-note">Use the resort&apos;s secure Cognito sign-in page to authenticate.</p>
            {user ? <p className="react-note">Signed in as {user.email || user.name}.</p> : null}
            <button type="submit" className="btn btn-primary">
              {user ? "Continue to My Stay" : "Continue with Secure Login"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

LoginView.propTypes = {
  onLogin: PropTypes.func.isRequired,
  user: PropTypes.object,
  notice: PropTypes.string,
};

function HomeView() {
  return (
    <main>
      <section className="react-home-stage">
        <div className="banner-overlay"></div>
        <div className="container">
          <div className="react-home-stage-content">
            <p className="label">Goa Beach Escape</p>
            <h1>Wake up to the beach, the breeze, and a calm resort stay.</h1>
            <p>A simple oceanfront experience with beautiful coastal views and an easy reservation flow.</p>
            <a className="react-home-mini-btn" href="booking.html">
              Reserve Room
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function ReviewsView() {
  return (
    <main>
      <Hero
        className="react-hero reviews"
        title="Guest Reviews"
        subtitle="A simple collection of guest feedback about the stay, booking flow, and overall experience."
      />
      <section className="section section-soft">
        <div className="container react-card-grid react-review-grid">
          {testimonials.map((item) => (
            <article className="react-panel react-review-panel" key={item.author}>
              <p>"{item.quote}"</p>
              <strong>{item.author}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function RoomsView({ rooms, roomsLoaded }) {
  const [priceFilter, setPriceFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  const filteredRooms = useMemo(() => {
    const maxPrice = priceFilter === "all" ? Number.POSITIVE_INFINITY : Number(priceFilter);
    const minRating = ratingFilter === "all" ? 0 : Number(ratingFilter);
    return rooms.filter((room) => room.price <= maxPrice && room.rating >= minRating);
  }, [priceFilter, ratingFilter, rooms]);

  return (
    <main>
      <Hero
        className="react-hero rooms"
        title="Rooms and Villas"
        subtitle="Curated room catalog managed through React components and props."
      />
      <section className="section">
        <div className="container">
          <div className="react-panel react-room-filter-bar">
            <label className="react-form-field">
              <span>Minimum Rating</span>
              <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}>
                {roomRatingFilters.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="react-form-field">
              <span>Maximum Price</span>
              <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
                {roomPriceFilters.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="react-card-grid react-room-grid">
            {filteredRooms.map((room) => (
              <RoomCard key={room.roomId || room.roomName} room={room} />
            ))}
          </div>
          {filteredRooms.length === 0 ? (
            <p className="react-empty-state">
              {roomsLoaded ? "No rooms match that rating and price combination." : "Room catalog is loading."}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

RoomsView.propTypes = {
  rooms: PropTypes.array.isRequired,
  roomsLoaded: PropTypes.bool.isRequired,
};

function RoomCard({ room }) {
  return (
    <article className="react-room-card">
      <div className="react-room-media">
        <img src={room.image} alt={room.roomName} />
        <span>{room.tag}</span>
      </div>
      <h3>{room.roomName}</h3>
      <p>{room.description}</p>
      <div className="react-room-meta">
        <strong>{room.rating.toFixed(1)} / 5 rating</strong>
        <span>Capacity: {room.capacity}</span>
      </div>
      <div className="react-chip-list">
        {room.amenities.map((amenity) => (
          <span className="react-chip" key={`${room.roomName}-${amenity}`}>
            {amenity}
          </span>
        ))}
      </div>
      <p>{coreData.formatCurrency(room.price)} / night</p>
    </article>
  );
}

RoomCard.propTypes = {
  room: PropTypes.shape({
    roomId: PropTypes.string,
    roomName: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    capacity: PropTypes.number.isRequired,
    rating: PropTypes.number.isRequired,
    image: PropTypes.string.isRequired,
    tag: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    amenities: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
};

function ActivitiesView() {
  const [plannerDate, setPlannerDate] = useState(coreData.toISODate(new Date()));
  const [selectedTimes, setSelectedTimes] = useState(createInitialActivityTimes);
  const [plannedActivities, setPlannedActivities] = useState([]);

  const scheduledActivities = useMemo(() => buildScheduledActivities(plannedActivities), [plannedActivities]);
  const clashMessages = useMemo(() => buildClashMessages(scheduledActivities), [scheduledActivities]);
  const plannedTotal = useMemo(
    () => scheduledActivities.reduce((sum, activity) => sum + activity.price, 0),
    [scheduledActivities]
  );

  const handleTimeChange = (activityName, value) => {
    setSelectedTimes((current) => ({ ...current, [activityName]: value }));
  };

  const handleAddToPlan = (activity) => {
    const startTime = selectedTimes[activity.name] || activity.slots[0];

    setPlannedActivities((current) => [
      ...current,
      {
        id: `${activity.name}-${Date.now()}-${current.length}`,
        name: activity.name,
        category: activity.category,
        date: plannerDate,
        startTime,
        endTime: addMinutesToTime(startTime, activity.durationMinutes),
        durationMinutes: activity.durationMinutes,
        price: activity.price,
      },
    ]);
  };

  const handleRemoveFromPlan = (id) => {
    setPlannedActivities((current) => current.filter((activity) => activity.id !== id));
  };

  return (
    <main>
      <Hero
        className="react-hero activities"
        title="Activities"
        subtitle="Water adventures, wellness, family time, and event moments across the property."
      />
      <section className="section">
        <div className="container react-activity-layout">
          <div className="react-card-grid react-activity-grid">
            {PLANNABLE_ACTIVITIES.map((activity) => (
              <article className="react-info-card react-activity-card" key={activity.name}>
                <img src={activity.image} alt={activity.name} />
                <h3>{activity.name}</h3>
                <p>{activity.category}</p>
                <p>{activity.description}</p>
                <div className="react-room-meta">
                  <strong>{activity.durationMinutes} min</strong>
                  <span>{coreData.formatCurrency(activity.price)}</span>
                </div>
                <label className="react-form-field">
                  <span>Choose Slot</span>
                  <select
                    value={selectedTimes[activity.name] || activity.slots[0]}
                    onChange={(event) => handleTimeChange(activity.name, event.target.value)}
                  >
                    {activity.slots.map((slot) => (
                      <option key={`${activity.name}-${slot}`} value={slot}>
                        {slot} to {addMinutesToTime(slot, activity.durationMinutes)}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="react-cta" onClick={() => handleAddToPlan(activity)}>
                  Add to Plan
                </button>
              </article>
            ))}
          </div>
          <aside className="react-panel react-activity-cart">
            <SectionTitle label="Activity Cart" title="Your Daily Plan" />
            <label className="react-form-field">
              <span>Plan Date</span>
              <input type="date" value={plannerDate} onChange={(event) => setPlannerDate(event.target.value)} />
            </label>
            <div className="react-activity-cart-summary">
              <article>
                <span>Items</span>
                <strong>{scheduledActivities.length}</strong>
              </article>
              <article>
                <span>Total</span>
                <strong>{coreData.formatCurrency(plannedTotal)}</strong>
              </article>
            </div>
            {clashMessages.length > 0 ? (
              <div className="react-activity-alert">
                <strong>Schedule clash detected</strong>
                <ul className="react-list">
                  {clashMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="react-note">No clashes in the current plan.</p>
            )}
            <div className="react-activity-cart-list">
              {scheduledActivities.length > 0 ? (
                scheduledActivities.map((activity) => (
                  <article
                    className={activity.clashesWith.length > 0 ? "react-activity-cart-item is-clashed" : "react-activity-cart-item"}
                    key={activity.id}
                  >
                    <div>
                      <h4>{activity.name}</h4>
                      <p>
                        {activity.date} | {activity.startTime} to {activity.endTime}
                      </p>
                      <p>
                        {activity.category} | {coreData.formatCurrency(activity.price)}
                      </p>
                      {activity.clashesWith.length > 0 ? (
                        <p className="react-clash-note">Clashes with: {activity.clashesWith.join(", ")}</p>
                      ) : null}
                    </div>
                    <button type="button" className="row-btn" onClick={() => handleRemoveFromPlan(activity.id)}>
                      Remove
                    </button>
                  </article>
                ))
              ) : (
                <p className="react-empty-state">Add activities to build a simple day plan.</p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function BookingView({ onAddBooking, rooms, roomsLoaded, user }) {
  return (
    <main>
      <Hero
        className="react-hero booking"
        title="Book Your Stay"
        subtitle="Choose your room, dates, and guest details with a simple reservation flow."
      />
      <BookingSection
        onAddBooking={onAddBooking}
        rooms={rooms}
        roomsLoaded={roomsLoaded}
        user={user}
        label="Reservations"
        title="Complete Your Booking"
        description="Select your stay details below and confirm the pricing estimate instantly."
      />
    </main>
  );
}

BookingView.propTypes = {
  onAddBooking: PropTypes.func.isRequired,
  rooms: PropTypes.array.isRequired,
  roomsLoaded: PropTypes.bool.isRequired,
  user: PropTypes.object,
};

ReactDOM.createRoot(document.getElementById("reactAppRoot")).render(<ResortApp />);
