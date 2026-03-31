export default function Navbar({ activePage, onNavigate, user, onLogout }) {
  const links = user
    ? [
        ...(user.role === "guest" ? [{ key: "booking", label: "Booking" }] : []),
        { key: "dashboard", label: "Dashboard" },
      ]
    : [{ key: "login", label: "Login" }];

  return (
    <header className="site-header" id="siteHeader">
      <div className="container nav-wrap">
        <button
          type="button"
          className="logo logo-button"
          onClick={() => onNavigate(user ? (user.role === "guest" ? "booking" : "dashboard") : "login")}
        >
          Coastal Crown Resort
        </button>
        <nav>
          <ul className="nav-links">
            {user ? <li className="role-badge">{user.role}</li> : null}
            {links.map((link) => (
              <li key={link.key}>
                <button
                  type="button"
                  className={activePage === link.key ? "active nav-button" : "nav-button"}
                  onClick={() => onNavigate(link.key)}
                >
                  {link.label}
                </button>
              </li>
            ))}
            {user ? (
              <li>
                <button type="button" className="nav-button" onClick={onLogout}>
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
