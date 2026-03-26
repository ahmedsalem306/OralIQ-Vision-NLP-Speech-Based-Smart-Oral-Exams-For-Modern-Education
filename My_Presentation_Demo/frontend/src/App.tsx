import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import { DashboardLayout } from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Overview from "./pages/Overview";
import InterviewRoom from "./pages/InterviewRoom";
import LecturerResults from "./pages/LecturerResults";
import Settings from "./pages/Settings";
import ExamInvite from "./pages/ExamInvite";
import ExamRoom from "./pages/ExamRoom";
import MyGrades from "./pages/MyGrades";
import StudentsPage from "./pages/StudentsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AttendancePage from "./pages/AttendancePage";

function App() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Exam invite link — saves token, redirects to login or dashboard */}
            <Route path="/exam/:token" element={<ExamInvite />} />

            {/* Actual exam flow (requires login) */}
            <Route path="/exam/start" element={<ExamRoom />} />

            {/* Dashboard */}
            <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Overview />} />
                <Route path="/dashboard/questions" element={<Dashboard />} />
                <Route path="/dashboard/interview/:questionId" element={<InterviewRoom />} />
                <Route path="/dashboard/results" element={<LecturerResults />} />
                <Route path="/dashboard/students" element={<StudentsPage />} />
                <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
                <Route path="/dashboard/attendance" element={<AttendancePage />} />
                <Route path="/dashboard/settings" element={<Settings />} />
                {/* Student-only */}
                <Route path="/dashboard/grades" element={<MyGrades />} />
            </Route>
        </Routes>
    );
}

export default App;
