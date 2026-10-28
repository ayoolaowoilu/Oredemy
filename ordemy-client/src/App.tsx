import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./components/route-guards";
import Login from "./pages/auth/auth.login";
import Register from "./pages/auth/auth.register";
import Home from "./pages/home";
import Onboarding from "./pages/onboarding/ob.page";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute roles={["student"]} />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}