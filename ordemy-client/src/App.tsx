import { Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./components/route-guards";
import { RouteFallback } from "./components/route-fallback";
import Login from "./pages/auth/auth.login";
import Register from "./pages/auth/auth.register";
import Terms from "./pages/auth/auth.terms";
import ForgotPassword from "./pages/auth/auth.forgot-password";
import Home from "./pages/home";
import Onboarding from "./pages/onboarding/ob.page";
import StudentChat from "./pages/student/chat";
import StudentClassRep from "./pages/student/classrep";
import StudentLayout from "./pages/student/layout";
import StudentOverview from "./pages/student/overview";
import StudentQuestions from "./pages/student/questions";
import AdviserAi from "./pages/adviser/ai";
import AdviserChat from "./pages/adviser/chat";
import AdviserClassReps from "./pages/adviser/class-reps";
import AdviserLayout from "./pages/adviser/layout";
import AdviserOverview from "./pages/adviser/overview";
import AdminLayout from "./pages/admin/layout";
import AdminOverview from "./pages/admin/overview";
import AdminSection from "./pages/admin/section";

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

      <Route element={<ProtectedRoute roles={["student", "lecturer"]} />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard/student" element={<StudentLayout />}>
          <Route index element={<StudentOverview />} />
          <Route path="questions" element={<StudentQuestions />} />
          <Route path="classrep" element={<StudentClassRep />} />
          <Route path="chat" element={<StudentChat />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["lecturer"]} verifiedLecturer />}>
        <Route path="/dashboard/adviser" element={<AdviserLayout />}>
          <Route index element={<AdviserOverview />} />
          <Route path="ai" element={<AdviserAi />} />
          <Route path="class-reps" element={<AdviserClassReps />} />
          <Route path="chat" element={<AdviserChat />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/dashboard/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminSection title="Users" />} />
          <Route path="academics" element={<AdminSection title="Academics" />} />
          <Route path="money" element={<AdminSection title="Money" />} />
          <Route path="more" element={<AdminSection title="More" />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
      </Route>

      <Route path="*" element={<RouteFallback />} />
    </Routes>
  );
}