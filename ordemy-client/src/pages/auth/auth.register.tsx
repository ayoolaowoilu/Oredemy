
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/api";
import { isValidEmail, isValidPassword } from "./auth.helpers";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "lecturer">("student");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 255)
      return setError("Name must be between 3 and 255 characters.");
    if (!isValidEmail(email)) return setError("Enter a valid email address.");
    if (!isValidPassword(password))
      return setError(
        "Password must be at least 6 characters with a letter and a number.",
      );

    setSubmitting(true);
    try {
      await register({ name: trimmedName, email, password, role });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create account</h1>

      <label>
        Full name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

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

      <label>
        I am a
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "student" | "lecturer")}
        >
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
        </select>
      </label>

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Register"}
      </button>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}