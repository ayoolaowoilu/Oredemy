

import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/api";
import { isValidEmail, isValidPassword } from "./auth.helpers";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Where to go after login (the page they tried to open before being sent here)
  const from = (location.state as { from?: { pathname: string } } | null)?.from
    ?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    setError("");

    if (!isValidEmail(email)) return setError("Enter a valid email address.");
    if (!isValidPassword(password))
      return setError(
        "Password must be at least 6 characters with a letter and a number.",
      );

    setSubmitting(true);
    try {
      const user = await login({ email, password });
      const needsOnboarding =
        user.role === "student" &&
        (!user.faculty_id ||
          !user.department_id ||
          !user.session ||
          !user.admission_session);
      const destination = needsOnboarding
        ? "/onboarding"
        : user.role === "student" && from === "/"
          ? "/dashboard/student"
          : user.role === "lecturer" && from === "/"
            ? "/dashboard/adviser"
          : from;
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Log in</h1>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Logging in…" : "Log in"}
      </button>

      <p>
        No account? <Link to="/register">Register</Link>
      </p>
    </form>
  );
}