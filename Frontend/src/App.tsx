import { useMemo, useState } from "react";
import "./App.css";

import Sidebar from "./layout/Sidebar";
import Topbar from "./layout/Topbar";

import LoginScreen from "./features/auth/LoginScreen";
import DashboardPage from "./features/dashboard/DashboardPage";
import ComplaintsPage from "./features/complaints/ComplaintsPage";
import ComplaintDetailPage from "./features/complaints/ComplaintDetailPage";
import ComplaintFormPage from "./pages/ComplaintFormPage";
import ConfirmationScreen from "./features/complaints/ConfirmationScreen";
import AnalyticsPage from "./features/analytics/AnalyticsPage";
import OfficersPage from "./features/officers/OfficersPage";
import SettingsPage from "./features/settings/SettingsPage";
import NewComplaintScreen from "./features/complaints/NewComplaintScreen";
import ExternalUploadSuccessScreen from "./features/complaints/ExternalUploadSuccessScreen";
import ExtractedComplaintPage from "./features/complaints/ExtractedComplaintPage";

import { useRouter } from "./shared/hooks/useRouter";
import { complaints } from "./shared/constants/mockData";
import type { Role } from "./shared/types";

function App() {
  const { route, navigate } = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [userRole, setUserRole] = useState<Role>("Admin");
  const [selectedComplaintId, setSelectedComplaintId] = useState("MCL-BB-0042");

  const activeComplaint = useMemo(
    () => complaints.find((c) => c.id === selectedComplaintId) ?? complaints[0],
    [selectedComplaintId],
  );

  const isLogin = route === "/login" || !isAuthenticated;

  const renderPage = () => {
    if (isLogin) {
      return (
        <LoginScreen
          onLogin={() => {
            setIsAuthenticated(true);
            navigate("/dashboard");
          }}
          onRoleChange={(nextRole) => setUserRole(nextRole)}
        />
      );
    }

    if (route === "/complaints/new") {
      return <NewComplaintScreen navigate={navigate} setSelectedComplaintId={setSelectedComplaintId} />;
    }
    if (route === "/complaints/new/extracted") {
      return (
        <ExtractedComplaintPage
          navigate={navigate}
          setSelectedComplaintId={setSelectedComplaintId}
        />
      );
    }
    if (route.startsWith("/complaints/new")) {
      return <ComplaintFormPage navigate={navigate} setSelectedComplaintId={setSelectedComplaintId} />;
    }
    if (route.startsWith("/complaints/confirm/")) {
      return <ConfirmationScreen complaintId={route.split("/").at(-1) ?? ""} navigate={navigate} />;
    }
    if (route === "/complaints/upload-success") {
      return <ExternalUploadSuccessScreen navigate={navigate} />;
    }
    if (
      route.startsWith("/complaints/") &&
      route !== "/complaints" &&
      route !== "/complaints/mine" &&
      route !== "/complaints/pending"
    ) {
      return (
        <ComplaintDetailPage
          complaint={activeComplaint}
          complaintId={route.split("/").at(-1) ?? activeComplaint.id}
          navigate={navigate}
        />
      );
    }
    if (
      route === "/complaints" ||
      route === "/complaints/mine" ||
      route === "/complaints/pending"
    ) {
      return (
        <ComplaintsPage
          route={route}
          navigate={navigate}
          setSelectedComplaintId={setSelectedComplaintId}
        />
      );
    }
    if (route === "/analytics") return <AnalyticsPage />;
    if (route === "/officers") return <OfficersPage />;
    if (route === "/settings") return <SettingsPage />;

    return <DashboardPage navigate={navigate} setSelectedComplaintId={setSelectedComplaintId} />;
  };

  return (
    <div className="app-shell">
      {!isLogin && <Sidebar route={route} userRole={userRole} navigate={navigate} />}

      <div className={isLogin ? "app-content app-content--full" : "app-content"}>
        {!isLogin && <Topbar route={route} />}

        <main className={isLogin ? "page-shell page-shell--login" : "page-shell"}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
