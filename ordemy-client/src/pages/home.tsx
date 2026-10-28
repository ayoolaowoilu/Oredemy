import { useAuth } from "../context/useAuth";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <p>
        Role: {user?.role} | Verified: {String(user?.is_verified)}
      </p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}