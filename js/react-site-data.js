(() => {
  const coreData = window.DashboardCoreData;

  const ROUTES = ["home", "reviews", "rooms", "activities", "login", "booking", "dashboard"];

  const NAV_ITEMS = [
    { key: "home", label: "Home" },
    { key: "reviews", label: "Reviews" },
    { key: "rooms", label: "Rooms" },
    { key: "activities", label: "Activities" },
    { key: "login", label: "Login" },
    { key: "booking", label: "Booking" },
    { key: "dashboard", label: "Dashboard" },
  ];

  const accessRoles = [
    {
      key: "guest",
      label: "Guest",
      description: "Reserve rooms, track your stay, and send resort service requests.",
    },
    {
      key: "worker",
      label: "Worker",
      description: "Review assigned stays, guest requests, and operational tasks.",
    },
    {
      key: "manager",
      label: "Manager",
      description: "Monitor reservations, active stays, and daily resort priorities.",
    },
    {
      key: "owner",
      label: "Owner",
      description: "See the complete business overview across bookings and revenue.",
    },
  ];

  const roomPriceFilters = [
    { value: "all", label: "Any Price" },
    { value: "12000", label: "Up to INR 12,000" },
    { value: "18000", label: "Up to INR 18,000" },
    { value: "24000", label: "Up to INR 24,000" },
    { value: "30000", label: "Up to INR 30,000" },
  ];

  const roomRatingFilters = [
    { value: "all", label: "Any Rating" },
    { value: "4", label: "4.0 and above" },
    { value: "4.5", label: "4.5 and above" },
    { value: "4.8", label: "4.8 and above" },
  ];

  const activityVisuals = {
    "Jet Ski": {
      image: "images/water_sports.jpg",
      description: "High-speed guided rides for guests who want a sharper, more energetic water adventure.",
    },
    "Spa Therapy": {
      image: "images/sauna-room.jpg",
      description: "Signature massage and aromatherapy sessions focused on deep relaxation and resort-style recovery.",
    },
    "Beach Yoga": {
      image: "images/yoga-beach.jpg",
      description: "Morning sessions on the sand with breathwork, light stretching, and a calm oceanfront setting.",
    },
    "Scuba Diving": {
      image: "images/scuba-diving.jpg",
      description: "Instructor-led dives with reef views, clear-water exploration, and support for newer divers.",
    },
    "Banana Boat Ride": {
      image: "images/banana-boat.jpg",
      description: "A lively group ride built for laughter, splashes, and easygoing beachside fun.",
    },
    "Kids Zone": {
      image: "images/kids-play-area.jpg",
      description: "A supervised play area with games, movement-based activities, and safe fun for younger guests.",
    },
    "BBQ Night": {
      image: "images/night-fire-dining.jpg",
      description: "An evening open-flame dining experience with grilled favorites, warm lighting, and a relaxed social vibe.",
    },
  };

  const defaultActivityVisual = {
    image: "images/banner-activities.jpg",
    description: "Signature resort activities designed around the beach, wellness, and family time.",
  };

  const activityPlannerDefaults = {
    "Jet Ski": { durationMinutes: 60, price: 2600, slots: ["09:00", "11:00", "15:00"] },
    "Spa Therapy": { durationMinutes: 90, price: 3200, slots: ["10:00", "13:00", "16:30"] },
    "Beach Yoga": { durationMinutes: 60, price: 1400, slots: ["07:00", "17:30"] },
    "Scuba Diving": { durationMinutes: 120, price: 4200, slots: ["08:00", "14:00"] },
    "Banana Boat Ride": { durationMinutes: 45, price: 1800, slots: ["10:30", "12:30", "16:00"] },
    "Kids Zone": { durationMinutes: 90, price: 1200, slots: ["11:00", "14:00", "17:00"] },
    "BBQ Night": { durationMinutes: 120, price: 2800, slots: ["19:00"] },
  };

  const roomCatalog = coreData && coreData.roomCatalog ? coreData.roomCatalog : {};
  const activityCatalog = coreData && Array.isArray(coreData.activityCatalog) ? coreData.activityCatalog : [];

  const RESORT_ROOMS = Object.entries(roomCatalog).map(([name, room]) => ({
    name,
    price: room.price,
    capacity: room.capacity,
    rating: Number(room.rating) || 4,
    image: room.image || "images/room1.jpg",
    tag: room.category || "Premium Stay",
    description: room.description || "A refined coastal stay with curated comfort.",
    amenities: Array.isArray(room.amenities) ? room.amenities : [],
  }));

  const PLANNABLE_ACTIVITIES = activityCatalog.map((activity) => {
    const visual = activityVisuals[activity.name] || defaultActivityVisual;
    const planner = activityPlannerDefaults[activity.name] || {
      durationMinutes: 60,
      price: 1800,
      slots: ["10:00", "14:00"],
    };

    return {
      ...activity,
      image: visual.image,
      description: visual.description,
      durationMinutes: planner.durationMinutes,
      price: planner.price,
      slots: planner.slots,
    };
  });

  const testimonials = [
    {
      quote: "The beachfront view feels calm the moment the page opens.",
      author: "Aanya, Hyderabad",
    },
    {
      quote: "Booking was simple and the stay felt smooth from check-in to checkout.",
      author: "Rahul, Bengaluru",
    },
    {
      quote: "The homepage is clean and easy to understand without too many sections.",
      author: "Nisha, Pune",
    },
    {
      quote: "We could book quickly and still get a good feel for the resort.",
      author: "Vikram, Chennai",
    },
  ];

  const dashboardRoles = [
    { key: "owner", label: "Owner" },
    { key: "manager", label: "Manager" },
    { key: "worker", label: "Worker" },
    { key: "guest", label: "Guest" },
  ];

  const scheduleDateFormatter = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  function getRouteFromHash() {
    const hash = String(window.location.hash || "").replace("#", "").trim().toLowerCase();
    return ROUTES.includes(hash) ? hash : null;
  }

  function getInitialRoute() {
    const hashRoute = getRouteFromHash();
    if (hashRoute) return hashRoute;
    const bodyRoute = String(document.body.dataset.page || "home").trim().toLowerCase();
    return ROUTES.includes(bodyRoute) ? bodyRoute : "home";
  }

  function getInitialDashboardRole() {
    const bodyRole = String(document.body.dataset.role || "").trim().toLowerCase();
    return dashboardRoles.some((role) => role.key === bodyRole) ? bodyRole : "owner";
  }

  function timeToMinutes(value) {
    const [hours, minutes] = String(value || "00:00")
      .split(":")
      .map((part) => Number(part) || 0);
    return hours * 60 + minutes;
  }

  function addMinutesToTime(value, minutesToAdd) {
    const totalMinutes = timeToMinutes(value) + minutesToAdd;
    const safeMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function activitiesOverlap(first, second) {
    if (!first || !second || first.date !== second.date) return false;

    return (
      timeToMinutes(first.startTime) < timeToMinutes(second.endTime) &&
      timeToMinutes(second.startTime) < timeToMinutes(first.endTime)
    );
  }

  function createInitialActivityTimes() {
    return PLANNABLE_ACTIVITIES.reduce((accumulator, activity) => {
      accumulator[activity.name] = activity.slots[0];
      return accumulator;
    }, {});
  }

  function buildScheduledActivities(plannedActivities) {
    const sortedActivities = [...plannedActivities].sort(
      (left, right) =>
        left.date.localeCompare(right.date) || timeToMinutes(left.startTime) - timeToMinutes(right.startTime)
    );

    return sortedActivities.map((activity, index) => {
      const clashesWith = sortedActivities
        .filter((other, otherIndex) => otherIndex !== index && activitiesOverlap(activity, other))
        .map((other) => other.name);

      return {
        ...activity,
        clashesWith: [...new Set(clashesWith)],
      };
    });
  }

  function buildClashMessages(activities) {
    const seenPairs = new Set();

    return activities.flatMap((activity) =>
      activity.clashesWith.reduce((messages, conflictName) => {
        const pairKey = [activity.name, conflictName].sort().join("|");
        if (seenPairs.has(pairKey)) return messages;
        seenPairs.add(pairKey);
        return [...messages, `${activity.name} clashes with ${conflictName}`];
      }, [])
    );
  }

  function getUniqueValues(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function deriveAccessId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatUserLabel(email) {
    const base = String(email || "")
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim();

    if (!base) return "Resort User";
    return base.replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function formatScheduleDate(value) {
    if (!coreData) return value;
    const parsedDate = coreData.fromISODate(value);
    return Number.isNaN(parsedDate.getTime()) ? value : scheduleDateFormatter.format(parsedDate);
  }

  function getSessionLabel(timeValue) {
    const hour = Math.floor(timeToMinutes(timeValue) / 60);
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    if (hour < 21) return "Evening";
    return "Night";
  }

  function buildGuestActivitySchedule(bookings) {
    const activities = bookings
      .flatMap((booking) => booking.activities || [])
      .slice()
      .sort(
        (left, right) =>
          left.date.localeCompare(right.date) || timeToMinutes(left.startTime) - timeToMinutes(right.startTime)
      );

    if (activities.length === 0) return [];

    const dayOrder = [];
    const groupedByDay = activities.reduce((accumulator, activity) => {
      if (!accumulator[activity.date]) {
        accumulator[activity.date] = {
          date: activity.date,
          sessions: {
            Morning: [],
            Afternoon: [],
            Evening: [],
            Night: [],
          },
        };
        dayOrder.push(activity.date);
      }

      accumulator[activity.date].sessions[getSessionLabel(activity.startTime)].push(activity);
      return accumulator;
    }, {});

    return dayOrder.map((date, index) => ({
      dayLabel: `Day ${index + 1}`,
      date,
      dateLabel: formatScheduleDate(date),
      sessions: groupedByDay[date].sessions,
    }));
  }

  window.ResortSiteData = Object.freeze({
    ROUTES,
    NAV_ITEMS,
    roomPriceFilters,
    roomRatingFilters,
    RESORT_ROOMS,
    PLANNABLE_ACTIVITIES,
    testimonials,
    dashboardRoles,
    accessRoles,
    getRouteFromHash,
    getInitialRoute,
    getInitialDashboardRole,
    addMinutesToTime,
    createInitialActivityTimes,
    buildScheduledActivities,
    buildClashMessages,
    getUniqueValues,
    deriveAccessId,
    formatUserLabel,
    buildGuestActivitySchedule,
  });
})();
