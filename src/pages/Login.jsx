import { useState } from "react";

const defaultRole = "guest";

const roleOptions = [
  {
    key: "guest",
    label: "Guest",
    summary: "Reserve rooms, manage your stay, and review upcoming reservations.",
  },
  {
    key: "worker",
    label: "Worker",
    summary: "Handle room preparation, arrivals, and in-stay support tasks.",
  },
  {
    key: "manager",
    label: "Manager",
    summary: "Monitor reservations, staff flow, and daily resort operations.",
  },
  {
    key: "owner",
    label: "Owner",
    summary: "See the wider business overview across bookings and performance.",
  },
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(defaultRole);

  function handleSubmit(event) {
    event.preventDefault();
    onLogin({ email, role });
  }

  return (
    <main>
      <section className="section">
        <div className="container react-login-layout">
          <article className="react-panel">
            <p className="label">Resort Access</p>
            <h1>Sign in by role</h1>
            <p>Choose how you use the resort system, then continue with your account details.</p>
            <div className="role-grid">
              {roleOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={role === option.key ? "role-option active" : "role-option"}
                  onClick={() => setRole(option.key)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.summary}</span>
                </button>
              ))}
            </div>
            <div className="access-note">
              <p>Demo guest access: <code>guest@coastalcrown.com</code></p>
              <p>Any email works, but the guest demo account already has a reservation.</p>
            </div>
          </article>
          <form className="react-panel react-form" onSubmit={handleSubmit}>
            <h2>Login</h2>
            <label>
              Access Type
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                {roleOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button type="submit">Continue</button>
          </form>
        </div>
      </section>
    </main>
  );
}
