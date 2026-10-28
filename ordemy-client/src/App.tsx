import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./components/route-guards";
import Login from "./pages/auth/auth.login";
import Register from "./pages/auth/auth.register";
import Terms from "./pages/auth/auth.terms";
import ForgotPassword from "./pages/auth/auth.forgot-password";
import Home from "./pages/home";
import Onboarding from "./pages/onboarding/ob.page";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Terms page: available to everyone, inside or outside the app */}
      <Route path="/terms" element={<Terms />} />

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