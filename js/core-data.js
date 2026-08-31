(function () {
  const memoryStorage = {};

  const storage = {
    getItem(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
      }
    },
    setItem(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        memoryStorage[key] = value;
      }
    },
    removeItem(key) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        delete memoryStorage[key];
      }
    },
  };

  const CONFIG = {
    storageKey: "resortDashboardBookingsV2",
    legacyKey: "coastalDashboardBookingsV1",
    requestStorageKey: "resortDashboardRequestsV1",
    totalAvailableRooms: 24,
    possibleActivitiesPerDay: 4,
    roomRevenueThreshold: 60000,
    trendDays: 14,
  };

  const activityCatalog = [
    { name: "Jet Ski", category: "Adventure" },
    { name: "Spa Therapy", category: "Wellness" },
    { name: "Beach Yoga", category: "Wellness" },
    { name: "Scuba Diving", category: "Adventure" },
    { name: "Banana Boat Ride", category: "Leisure" },
    { name: "Kids Zone", category: "Family" },
    { name: "BBQ Night", category: "Dining" },
  ];

  const requestTypes = [
    "Housekeeping",
    "Food Delivery",
    "Laundry",
    "Maintenance",
    "Spa Booking",
    "Transport",
  ];

  const requestPriorities = ["low", "medium", "high"];
  const requestStatuses = ["assigned", "in_progress", "completed"];

  const defaultRooms = [
    {
      name: "Palm Deluxe Room",
      category: "Deluxe",
      price: 9500,
      capacity: 2,
      rating: 4.3,
      description: "Stylish room with a tropical balcony, bright interiors, and a relaxed sea-breeze mood.",
      amenities: ["WiFi", "Sea View", "Breakfast"],
      image: "images/room1.jpg",
    },
    {
      name: "Coral Family Suite",
      category: "Family",
      price: 14500,
      capacity: 4,
      rating: 4.6,
      description: "Large family suite with a lounge corner, flexible bedding, and extra space for longer stays.",
      amenities: ["Twin Beds", "Family Lounge", "Bathtub"],
      image: "images/room2.jpg",
    },
    {
      name: "Executive Bay Room",
      category: "Business",
      price: 12800,
      capacity: 2,
      rating: 4.2,
      description: "Business-ready stay with a dedicated work desk, calm setting, and smooth check-in comfort.",
      amenities: ["Work Desk", "Fast WiFi", "Coffee Setup"],
      image: "images/room3.jpg",
    },
    {
      name: "Sea Pearl Premium",
      category: "Premium",
      price: 16700,
      capacity: 3,
      rating: 4.7,
      description: "Premium room with a wide beach-facing window, layered lighting, and refined evening comfort.",
      amenities: ["King Bed", "Mini Bar", "View Deck"],
      image: "images/room4.jpg",
    },
    {
      name: "Ocean Crown Villa",
      category: "Villa",
      price: 23000,
      capacity: 3,
      rating: 4.9,
      description: "Oceanfront villa with a private deck, premium privacy, and a strong luxury-stay feel.",
      amenities: ["Private Deck", "Ocean View", "Concierge"],
      image: "images/room5.jpg",
    },
    {
      name: "Lagoon Honeymoon Suite",
      category: "Suite",
      price: 21000,
      capacity: 2,
      rating: 4.8,
      description: "Romantic suite with a soaking tub, warm ambient styling, and curated couple-ready service.",
      amenities: ["Plunge Tub", "Couple Setup", "Butler"],
      image: "images/room6.jpg",
    },
    {
      name: "Grand Coastal Residence",
      category: "Residence",
      price: 28500,
      capacity: 5,
      rating: 4.9,
      description: "Large residence with a dining zone, multiple stay areas, and space built for premium group trips.",
      amenities: ["Private Dining", "Large Lounge", "Sea Deck"],
      image: "images/room7.jpg",
    },
  ];

  const buildRoomCatalog = (sourceRooms) =>
    sourceRooms.reduce((acc, room, index) => {
      const fallbackRoom = defaultRooms[index % defaultRooms.length];
      const roomIdFromPk =
        typeof room.PK === "string" && room.PK.startsWith("ROOM#") ? room.PK.slice(5).trim() : "";
      const roomId =
        typeof room.roomId === "string" && room.roomId.trim()
          ? room.roomId.trim()
          : roomIdFromPk || `room-${index + 1}`;
      const roomNameSource =
        typeof room.roomName === "string" && room.roomName.trim()
          ? room.roomName
          : room.name;
      const roomName =
        typeof roomNameSource === "string" && roomNameSource.trim()
          ? roomNameSource.trim()
          : fallbackRoom.name;

      acc[roomName] = {
        roomId,
        price: Number(room.price) || fallbackRoom.price,
        capacity: Number(room.capacity) || fallbackRoom.capacity,
        rating: Number(room.rating) || fallbackRoom.rating,
        category:
          typeof room.category === "string" && room.category.trim()
            ? room.category.trim()
            : fallbackRoom.category,
        description:
          typeof room.description === "string" && room.description.trim()
            ? room.description.trim()
            : fallbackRoom.description,
        image:
          typeof room.image === "string" && room.image.trim()
            ? room.image
            : fallbackRoom.image,
        amenities:
          Array.isArray(room.amenities) && room.amenities.length > 0
            ? room.amenities
            : fallbackRoom.amenities,
        tag:
          typeof room.tag === "string" && room.tag.trim()
            ? room.tag.trim()
            : typeof room.category === "string" && room.category.trim()
              ? room.category.trim()
              : fallbackRoom.category,
      };

      return acc;
    }, {});

  const initialRooms =
    Array.isArray(globalThis.roomsData) && globalThis.roomsData.length > 0
      ? globalThis.roomsData
      : defaultRooms;

  let roomCatalog = buildRoomCatalog(initialRooms);
  let roomNames = Object.keys(roomCatalog);

  const pad = (value) => String(value).padStart(2, "0");

  const toISODate = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const fromISODate = (value) => new Date(`${value}T00:00:00`);

  const isValidDateIso = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isValidDateTime = (value) => typeof value === "string" && !Number.isNaN(new Date(value).getTime());

  const formatCurrency = (value) => `INR ${Math.round(value || 0).toLocaleString("en-IN")}`;

  const getDurationNights = (checkIn, checkOut) => {
    const inDate = fromISODate(checkIn);
    const outDate = fromISODate(checkOut);
    return (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24);
  };

  const countWeekendNights = (checkIn, checkOut) => {
    const start = fromISODate(checkIn);
    const nights = Math.max(0, Math.floor(getDurationNights(checkIn, checkOut)));
    let count = 0;
    for (let i = 0; i < nights; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      if (day.getDay() === 0 || day.getDay() === 6) count += 1;
    }
    return count;
  };

  const mapLegacyStatus = (status) => {
    if (!status) return "active";
    const text = String(status).toLowerCase();
    if (text.includes("cancel")) return "cancelled";
    if (text.includes("complete")) return "completed";
    return "active";
  };

  const calculateAmounts = (roomName, checkIn, checkOut, guests) => {
    const room = roomCatalog[roomName] || { price: 10000, capacity: 2 };
    const nights = Math.max(0, getDurationNights(checkIn, checkOut));
    const weekendNights = countWeekendNights(checkIn, checkOut);
    const baseAmount = room.price * nights;
    const weekendCharge = room.price * weekendNights * 0.1;
    const extraGuestCount = Math.max(0, Number(guests) - room.capacity);
    const extraGuestCharge = extraGuestCount * 1000 * nights;
    const subtotal = baseAmount + weekendCharge + extraGuestCharge;
    const gstAmount = subtotal * 0.18;
    const totalAmount = subtotal + gstAmount;

    return {
      baseAmount: Math.round(baseAmount),
      weekendCharge: Math.round(weekendCharge),
      extraGuestCharge: Math.round(extraGuestCharge),
      gstAmount: Math.round(gstAmount),
      totalAmount: Math.round(totalAmount),
    };
  };

  const sanitizeActivities = (activities) => {
    if (!Array.isArray(activities)) return [];
    return activities
      .filter(
        (item) =>
          item &&
          typeof item.name === "string" &&
          isValidDateIso(item.date) &&
          /^\d{2}:\d{2}$/.test(item.startTime) &&
          /^\d{2}:\d{2}$/.test(item.endTime) &&
          typeof item.category === "string"
      )
      .map((item) => ({
        name: item.name.trim(),
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        category: item.category.trim(),
      }));
  };

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const deriveAssignedWorker = (bookingId) => `worker-${(Number(bookingId) % 4) + 1}`;

  const deriveGuestId = (guestName, bookingId) => {
    if (typeof guestName === "string" && guestName.trim().length > 0) {
      return guestName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }
    return `guest-${bookingId}`;
  };

  const getRooms = () =>
    roomNames.map((roomName) => ({
      roomId: roomCatalog[roomName].roomId,
      roomName,
      category: roomCatalog[roomName].category,
      price: roomCatalog[roomName].price,
      capacity: roomCatalog[roomName].capacity,
      rating: roomCatalog[roomName].rating,
      description: roomCatalog[roomName].description,
      amenities: roomCatalog[roomName].amenities,
      image: roomCatalog[roomName].image,
      tag: roomCatalog[roomName].tag,
    }));

  const setRuntimeRooms = (rooms) => {
    if (!Array.isArray(rooms)) {
      return getRooms();
    }

    roomCatalog = buildRoomCatalog(rooms);
    roomNames = Object.keys(roomCatalog);

    if (window.DashboardCoreData) {
      window.DashboardCoreData.roomCatalog = roomCatalog;
      window.DashboardCoreData.roomNames = roomNames;
    }

    return getRooms();
  };

  const findRoomName = (raw) => {
    if (raw && typeof raw.roomName === "string" && roomNames.includes(raw.roomName)) {
      return raw.roomName;
    }

    if (raw && typeof raw.roomId === "string" && raw.roomId.trim()) {
      const matchedEntry = Object.entries(roomCatalog).find(([, room]) => room.roomId === raw.roomId.trim());
      if (matchedEntry) return matchedEntry[0];
    }

    return roomNames[0];
  };

  const resolveBookingId = (raw, index) => {
    const directId = raw && (raw.bookingId || raw.id);
    if (typeof directId === "string" && directId.trim()) return directId.trim();

    const numericId = Number(directId);
    if (Number.isFinite(numericId) && numericId > 0) return numericId;

    return `${Date.now()}-${index}`;
  };

  const normalizeBooking = (raw, index) => {
    const roomName = findRoomName(raw);
    const fallbackCheckIn = toISODate(new Date());
    const checkIn = isValidDateIso(raw.checkIn) ? raw.checkIn : fallbackCheckIn;
    const checkOut = isValidDateIso(raw.checkOut)
      ? raw.checkOut
      : toISODate(new Date(fromISODate(checkIn).getTime() + 24 * 60 * 60 * 1000));
    const guests = Math.max(1, Number(raw.guests) || 1);
    const status = ["active", "completed", "cancelled"].includes(raw.status)
      ? raw.status
      : mapLegacyStatus(raw.status);
    const createdAt = isValidDateIso(raw.createdAt) || isValidDateTime(raw.createdAt) ? raw.createdAt : checkIn;
    const generated = calculateAmounts(roomName, checkIn, checkOut, guests);

    const id = resolveBookingId(raw, index);
    const guestName = String(raw.guestName || `Guest ${index + 1}`).trim();

    return {
      id,
      bookingId: typeof raw.bookingId === "string" && raw.bookingId.trim() ? raw.bookingId.trim() : String(id),
      roomId:
        typeof raw.roomId === "string" && raw.roomId.trim()
          ? raw.roomId.trim()
          : roomCatalog[roomName] && roomCatalog[roomName].roomId
            ? roomCatalog[roomName].roomId
            : "",
      guestName,
      roomName,
      checkIn,
      checkOut,
      guests,
      baseAmount: Number(raw.baseAmount) || generated.baseAmount,
      weekendCharge: Number(raw.weekendCharge) || generated.weekendCharge,
      extraGuestCharge: Number(raw.extraGuestCharge) || generated.extraGuestCharge,
      gstAmount: Number(raw.gstAmount) || generated.gstAmount,
      totalAmount: Number(raw.totalAmount) || generated.totalAmount,
      activities: sanitizeActivities(raw.activities),
      createdAt,
      status,
      assignedWorker: typeof raw.assignedWorker === "string" ? raw.assignedWorker : deriveAssignedWorker(id),
      guest: raw.guest && raw.guest.id ? raw.guest : { id: deriveGuestId(guestName, id) },
    };
  };

  const normalizeApiBooking = (raw, index, user) =>
    normalizeBooking(
      {
        bookingId: raw.bookingId,
        roomId: raw.roomId,
        roomName: raw.roomName,
        checkIn: raw.checkIn,
        checkOut: raw.checkOut,
        guests: raw.guests,
        baseAmount: raw.baseAmount,
        weekendCharge: raw.weekendCharge,
        extraGuestCharge: raw.extraGuestCharge,
        gstAmount: raw.gstAmount,
        totalAmount: raw.totalAmount,
        createdAt: raw.createdAt,
        status: raw.status,
        guestName: user && user.name ? user.name : "Guest",
        assignedWorker: "",
        guest: user && user.sub ? { id: user.sub } : undefined,
      },
      index
    );

  const normalizeServiceRequest = (raw, index, bookings) => {
    const bookingList = Array.isArray(bookings) ? bookings : [];
    const matchedBooking =
      bookingList.find((booking) => String(booking.id) === String(raw.bookingId || "")) ||
      bookingList[index % Math.max(bookingList.length, 1)] ||
      null;

    const id = Number(raw.id) || Date.now() + index;
    const guestName = String(raw.guestName || (matchedBooking && matchedBooking.guestName) || `Guest ${index + 1}`).trim();
    const guestId =
      typeof raw.guestId === "string" && raw.guestId.trim()
        ? raw.guestId.trim()
        : matchedBooking && matchedBooking.guest && matchedBooking.guest.id
          ? matchedBooking.guest.id
          : deriveGuestId(guestName, id);
    const roomName = roomNames.includes(raw.roomName)
      ? raw.roomName
      : matchedBooking && roomNames.includes(matchedBooking.roomName)
        ? matchedBooking.roomName
        : roomNames[0];
    const requestType = requestTypes.includes(raw.requestType) ? raw.requestType : requestTypes[0];
    const priority = requestPriorities.includes(raw.priority) ? raw.priority : "medium";
    const status = requestStatuses.includes(raw.status) ? raw.status : "assigned";
    const assignedWorker =
      typeof raw.assignedWorker === "string" && raw.assignedWorker.trim()
        ? raw.assignedWorker.trim()
        : matchedBooking && matchedBooking.assignedWorker
          ? matchedBooking.assignedWorker
          : deriveAssignedWorker(id);
    const createdAt = isValidDateIso(raw.createdAt) ? raw.createdAt : toISODate(new Date());
    const note = String(raw.note || "").trim() || `${requestType} request for ${roomName}.`;

    return {
      id,
      bookingId: matchedBooking ? matchedBooking.id : Number(raw.bookingId) || null,
      guestId,
      guestName,
      roomName,
      requestType,
      priority,
      status,
      note,
      assignedWorker,
      createdAt,
    };
  };

  const generateRandomActivity = (dateIso) => {
    const pick = activityCatalog[randomInt(0, activityCatalog.length - 1)];
    const startHour = randomInt(7, 18);
    const duration = randomInt(1, 3);
    const endHour = Math.min(22, startHour + duration);
    return {
      name: pick.name,
      date: dateIso,
      startTime: `${pad(startHour)}:00`,
      endTime: `${pad(endHour)}:00`,
      category: pick.category,
    };
  };

  const generateDemoBookings = () => {
    const today = new Date();
    const names = ["Aarav", "Kavya", "Rohan", "Maya", "Ishaan", "Nitya", "Vihaan", "Diya"];
    const items = [];

    for (let i = 0; i < 12; i += 1) {
      const roomName = roomNames[randomInt(0, roomNames.length - 1)];
      const startOffset = randomInt(-10, 10);
      const nights = randomInt(1, 4);
      const checkInDate = new Date(today);
      checkInDate.setDate(today.getDate() + startOffset);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkInDate.getDate() + nights);
      const createdAtDate = new Date(checkInDate);
      createdAtDate.setDate(checkInDate.getDate() - randomInt(0, 5));
      const guests = randomInt(1, 5);
      const status = startOffset < -2 ? "completed" : "active";
      const checkInIso = toISODate(checkInDate);
      const checkOutIso = toISODate(checkOutDate);
      const createdAtIso = toISODate(createdAtDate);
      const amounts = calculateAmounts(roomName, checkInIso, checkOutIso, guests);
      const activityCount = randomInt(0, 5);
      const activities = [];
      for (let j = 0; j < activityCount; j += 1) {
        const activityDate = new Date(checkInDate);
        activityDate.setDate(checkInDate.getDate() + randomInt(0, Math.max(0, nights - 1)));
        activities.push(generateRandomActivity(toISODate(activityDate)));
      }

      items.push(
        normalizeBooking(
          {
            id: Date.now() + i,
            guestName: `${names[randomInt(0, names.length - 1)]} Guest`,
            roomName,
            checkIn: checkInIso,
            checkOut: checkOutIso,
            guests,
            baseAmount: amounts.baseAmount,
            weekendCharge: amounts.weekendCharge,
            extraGuestCharge: amounts.extraGuestCharge,
            gstAmount: amounts.gstAmount,
            totalAmount: amounts.totalAmount,
            activities,
            createdAt: createdAtIso,
            status,
          },
          i
        )
      );
    }

    return items;
  };

  const generateDemoServiceRequests = (bookings) => {
    const bookingList = Array.isArray(bookings) ? bookings.slice(0, 6) : [];
    const templates = [
      { requestType: "Housekeeping", priority: "medium", status: "assigned", note: "Fresh towels and room cleaning requested for the afternoon." },
      { requestType: "Food Delivery", priority: "high", status: "in_progress", note: "Guest requested dinner service to the room before 8 PM." },
      { requestType: "Laundry", priority: "low", status: "assigned", note: "Laundry pickup requested for two bags of clothing." },
      { requestType: "Maintenance", priority: "high", status: "in_progress", note: "Air conditioning needs inspection in the room." },
      { requestType: "Spa Booking", priority: "medium", status: "completed", note: "Spa session booking confirmation requested by the guest." },
      { requestType: "Transport", priority: "medium", status: "assigned", note: "Airport pickup timing needs confirmation for checkout day." },
    ];

    return bookingList.map((booking, index) =>
      normalizeServiceRequest(
        {
          id: Date.now() + index,
          bookingId: booking.id,
          guestId: booking.guest && booking.guest.id,
          guestName: booking.guestName,
          roomName: booking.roomName,
          assignedWorker: booking.assignedWorker,
          requestType: templates[index % templates.length].requestType,
          priority: templates[index % templates.length].priority,
          status: templates[index % templates.length].status,
          note: templates[index % templates.length].note,
          createdAt: booking.createdAt,
        },
        index,
        bookingList
      )
    );
  };

  const migrateLegacyBookings = () => {
    const raw = storage.getItem(CONFIG.legacyKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item, index) =>
        normalizeBooking(
          {
            id: item.id || Date.now() + index,
            guestName: item.guestName || item.name,
            roomName: item.roomName,
            checkIn: item.checkIn,
            checkOut: item.checkOut,
            guests: item.guests,
            createdAt: item.createdAt || item.checkIn,
            status: item.status,
            activities: item.activities || [],
            assignedWorker: item.assignedWorker,
            guest: item.guest,
          },
          index
        )
      );
    } catch (error) {
      return [];
    }
  };

  const loadBookings = () => {
    const raw = storage.getItem(CONFIG.storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item, index) => normalizeBooking(item, index));
        }
      } catch (error) {}
    }

    const legacy = migrateLegacyBookings();
    if (legacy.length > 0) return legacy;
    return generateDemoBookings();
  };

  const saveBookings = (bookings) => {
    storage.setItem(CONFIG.storageKey, JSON.stringify(bookings));
  };

  const loadServiceRequests = (bookings) => {
    const raw = storage.getItem(CONFIG.requestStorageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item, index) => normalizeServiceRequest(item, index, bookings));
        }
      } catch (error) {}
    }

    return generateDemoServiceRequests(bookings);
  };

  const saveServiceRequests = (requests) => {
    storage.setItem(CONFIG.requestStorageKey, JSON.stringify(requests));
  };

  const resetBookings = () => {
    storage.removeItem(CONFIG.storageKey);
    const next = generateDemoBookings();
    saveBookings(next);
    return next;
  };

  const resetServiceRequests = (bookings) => {
    storage.removeItem(CONFIG.requestStorageKey);
    const next = generateDemoServiceRequests(bookings);
    saveServiceRequests(next);
    return next;
  };

  window.DashboardCoreData = {
    CONFIG,
    storage,
    roomCatalog,
    roomNames,
    getRooms,
    setRuntimeRooms,
    activityCatalog,
    requestTypes,
    requestPriorities,
    requestStatuses,
    pad,
    toISODate,
    fromISODate,
    isValidDateIso,
    formatCurrency,
    getDurationNights,
    countWeekendNights,
    calculateAmounts,
    normalizeBooking,
    normalizeApiBooking,
    normalizeServiceRequest,
    deriveAssignedWorker,
    deriveGuestId,
    loadBookings,
    saveBookings,
    loadServiceRequests,
    saveServiceRequests,
    resetBookings,
    resetServiceRequests,
    generateDemoBookings,
    generateDemoServiceRequests,
  };
})();
