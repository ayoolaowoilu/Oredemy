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
import StudentProfile from "./pages/student/profile";
import StudentCurriculum from "./pages/student/curriculum";
import StudentPayments from "./pages/student/payments";
import StudentSettings from "./pages/student/settings";
import StudentQuestions from "./pages/student/questions";
import AdviserAi from "./pages/adviser/ai";
import AdviserChat from "./pages/adviser/chat";
import AdviserClassReps from "./pages/adviser/class-reps";
import AdviserCourses from "./pages/adviser/courses";
import AdviserLayout from "./pages/adviser/layout";
import AdviserOverview from "./pages/adviser/overview";
import AdviserSettings from "./pages/adviser/settings";
import AdminLayout from "./pages/admin/layout";
import AdminOverview from "./pages/admin/overview";
import AdminAcademics from "./pages/admin/academics";
import AdminMoney from "./pages/admin/money";
import AdminMore from "./pages/admin/more";
import AdminUsers from "./pages/admin/users";

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
          <Route path="curriculum" element={<StudentCurriculum />} />
          <Route path="payments" element={<StudentPayments />} />
          <Route path="settings" element={<StudentSettings />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["lecturer"]} verifiedLecturer />}>
        <Route path="/dashboard/adviser" element={<AdviserLayout />}>
          <Route index element={<AdviserOverview />} />
          <Route path="ai" element={<AdviserAi />} />
          <Route path="class-reps" element={<AdviserClassReps />} />
          <Route path="courses" element={<AdviserCourses />} />
          <Route path="chat" element={<AdviserChat />} />
          <Route path="settings" element={<AdviserSettings />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/dashboard/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="academics" element={<AdminAcademics />} />
          <Route path="money" element={<AdminMoney />} />
          <Route path="more" element={<AdminMore />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
      </Route>

      <Route path="*" element={<RouteFallback />} />
    </Routes>
  );
}