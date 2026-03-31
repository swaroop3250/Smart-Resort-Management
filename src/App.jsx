import { useState } from "react";
import Navbar from "./components/Navbar";
import Booking from "./pages/Booking";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

const workerRoster = ["Aarav Patel", "Neha Das", "Rohan Iyer"];

const rooms = [
  {
    id: 1,
    name: "Ocean Deluxe Room",
    price: 6500,
    capacity: 2,
    image: "images/room1.jpg",
    description: "Sea-facing room with balcony and breakfast included.",
  },
  {
    id: 2,
    name: "Family Villa",
    price: 9800,
    capacity: 4,
    image: "images/villa.jpg",
    description: "Spacious villa with lounge, garden sit-out, and pool access.",
  },
  {
    id: 3,
    name: "Sunset Suite",
    price: 11200,
    capacity: 3,
    image: "images/room3.jpg",
    description: "Premium suite designed for longer stays and sunset views.",
  },
];

function toIsoDate(date) {
  return date.toISOString().split("T")[0];
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatNameFromEmail(email) {
  const fallback = "Resort User";
  if (!email) return fallback;

  const base = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  if (!base) return fallback;

  return base.replace(/\b\w/g, (character) => character.toUpperCase());
}

const today = new Date();

const initialBookings = [
  {
    id: 1001,
    roomId: 1,
    roomName: "Ocean Deluxe Room",
    guestName: "Guest Demo",
    guestEmail: "guest@coastalcrown.com",
    checkIn: toIsoDate(addDays(today, 1)),
    checkOut: toIsoDate(addDays(today, 4)),
    guests: 2,
    status: "confirmed",
    assignedWorker: workerRoster[0],
    totalAmount: 19500,
  },
  {
    id: 1002,
    roomId: 2,
    roomName: "Family Villa",
    guestName: "Aisha Nair",
    guestEmail: "aisha@coastalcrown.com",
    checkIn: toIsoDate(today),
    checkOut: toIsoDate(addDays(today, 3)),
    guests: 4,
    status: "checked-in",
    assignedWorker: workerRoster[1],
    totalAmount: 29400,
  },
  {
    id: 1003,
    roomId: 3,
    roomName: "Sunset Suite",
    guestName: "Rajat Mehra",
    guestEmail: "rajat@coastalcrown.com",
    checkIn: toIsoDate(addDays(today, 2)),
    checkOut: toIsoDate(addDays(today, 5)),
    guests: 3,
    status: "confirmed",
    assignedWorker: workerRoster[2],
    totalAmount: 33600,
  },
];

export default function App() {
  const [activePage, setActivePage] = useState("login");
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState(initialBookings);

  function handleLogin(nextUser) {
    const userProfile = {
      email: nextUser.email.trim().toLowerCase(),
      role: nextUser.role,
      name: formatNameFromEmail(nextUser.email),
    };

    setUser(userProfile);
    setActivePage(userProfile.role === "guest" ? "booking" : "dashboard");
  }

  function handleLogout() {
    setUser(null);
    setActivePage("login");
  }

  function handleNavigate(nextPage) {
    if (!user && nextPage !== "login") {
      setActivePage("login");
      return;
    }

    if (nextPage === "booking" && user?.role !== "guest") {
      setActivePage("dashboard");
      return;
    }

    setActivePage(nextPage);
  }

  function handleCreateBooking(booking) {
    const room = rooms.find((item) => item.id === booking.roomId);
    const enrichedBooking = {
      ...booking,
      guestName: booking.guestName || user?.name || "Guest",
      guestEmail: user?.email || "",
      assignedWorker: workerRoster[bookings.length % workerRoster.length],
      totalAmount: room ? room.price : 0,
    };

    setBookings((current) => [enrichedBooking, ...current]);
    setActivePage("dashboard");
  }

  let page = <Login onLogin={handleLogin} />;

  if (user) {
    if (activePage === "booking") {
      page = <Booking rooms={rooms} user={user} onCreateBooking={handleCreateBooking} />;
    }

    if (activePage === "dashboard") {
      page = <Dashboard user={user} bookings={bookings} inventoryCount={rooms.length} />;
    }
  }

  return (
    <div className="react-app-shell">
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
      />
      {activePage === "login" || user ? page : <Login onLogin={handleLogin} />}
    </div>
  );
}
