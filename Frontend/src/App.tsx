import { useState, useEffect } from "react";
import "./App.css";

// Router
import { useRouter } from "./shared/hooks/useRouter";

// Auth
import { useAuth } from "./context/AuthContext";
import LoginScreen from "./features/auth/LoginScreen";

// Types
import type { AppComplaint } from "./shared/types";

// Layout
import Topbar from "./layout/Topbar";
import Sidebar from "./layout/Sidebar";

// Dashboard
import DashboardPage from "./features/dashboard/DashboardPage";

// Complaints
import ComplaintsPage from "./features/complaints/ComplaintsPage";
import ComplaintDetailPage from "./features/complaints/ComplaintDetailPage";
import NewComplaintScreen from "./features/complaints/NewComplaintScreen";
import ConfirmationScreen from "./features/complaints/ConfirmationScreen";
import ExternalUploadSuccessScreen from "./features/complaints/ExternalUploadSuccessScreen";
import ExtractedComplaintPage from "./features/complaints/ExtractedComplaintPage";

// Other pages
import OfficersPage from "./features/officers/OfficersPage";
import SettingsPage from "./features/settings/SettingsPage";

// Case workflow
import CasesPage from "./pages/CasesPage";
import CaseDetailPage from "./pages/CaseDetailPage";
import FieldInspectionPage from "./pages/FieldInspectionPage";
import ConstructionStatusForm from "./pages/ConstructionStatusForm";

// Shared
import ComingSoonPage from "./shared/components/ComingSoonPage";

const EMPTY_COMPLAINT: AppComplaint = {
  id: "",
  title: "",
  citizen: "",
  phone: "",
  ward: "",
  officer: "",
  status: "Registered",
  registered: "",
  zone: "",
  block: "",
  address: "",
  description: "",
  assignedOfficer: "",
  atp: "",
  daysOpen: 0,
  timeline: [],
};

const isRoutePermittedForRole = (currentRoute: string, role?: string): boolean => {
  const normRole = (role || "").toLowerCase();

  // /field-inspection → allowed: bi, atp, mtp, jc, superadmin
  if (currentRoute === "/field-inspection" || currentRoute.startsWith("/field-inspection?")) {
    return ["bi", "atp", "mtp", "jc", "superadmin", "admin"].includes(normRole);
  }

  // /cases and /cases/:id (and sub-routes) → allowed: bi, atp, mtp, jc, superadmin
  if (currentRoute === "/cases" || currentRoute.startsWith("/cases/")) {
    return ["bi", "atp", "mtp", "jc", "superadmin", "admin"].includes(normRole);
  }

  // Standalone construction-status → allowed: bi, atp, mtp, jc, superadmin
  if (currentRoute === "/construction-status" || currentRoute.startsWith("/construction-status?")) {
    return ["bi", "atp", "mtp", "jc", "superadmin", "admin"].includes(normRole);
  }

  // /officers → allowed: atp, mtp, jc, superadmin
  if (currentRoute === "/officers" || currentRoute.startsWith("/officers/")) {
    return ["atp", "mtp", "jc", "superadmin", "admin"].includes(normRole);
  }

  // /settings → allowed: superadmin
  if (currentRoute === "/settings" || currentRoute.startsWith("/settings/")) {
    return ["superadmin", "admin"].includes(normRole);
  }

  // /complaints/new, /complaints, / (dashboard), etc. → allowed: all roles
  return true;
};

function App() {
  const { route, navigate } = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [, setSelectedComplaintId] = useState("");

  // Route matching helpers
  const getCaseIdFromRoute = (): string | null => {
    const match = route.match(/^\/cases\/([^/]+)(?:\/construction-status)?$/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  const isCaseConstructionRoute = (): boolean => {
    return /^\/cases\/[^/]+\/construction-status$/.test(route);
  };

  const caseIdFromRoute = getCaseIdFromRoute();

  // Role-based route guard enforcement: redirect to "/" silently if not allowed
  useEffect(() => {
    if (user && !isRoutePermittedForRole(route, user.role)) {
      navigate("/");
    }
  }, [route, user, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#0f172a",
          color: "#94a3b8",
          fontSize: "14px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "3px solid #334155",
              borderTopColor: "#3b82f6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          Loading MCL-BB...
        </div>
      </div>
    );
  }

  // Unauthenticated → show LoginScreen
  if (!user) {
    return <LoginScreen />;
  }

  // Page Routing
  const renderPage = () => {
    // If route is forbidden for current role, prevent render
    if (!isRoutePermittedForRole(route, user.role)) {
      return null;
    }

    // Dashboard
    if (route === "/" || route === "/dashboard") {
      return (
        <DashboardPage
          navigate={navigate}
          setSelectedComplaintId={setSelectedComplaintId}
        />
      );
    }

    // Complaint creation
    if (route === "/complaints/new") {
      return (
        <NewComplaintScreen
          navigate={navigate}
          setSelectedComplaintId={setSelectedComplaintId}
        />
      );
    }

    if (route === "/complaints/new/extracted") {
      return (
        <ExtractedComplaintPage
          navigate={navigate}
          setSelectedComplaintId={setSelectedComplaintId}
        />
      );
    }

    if (route.startsWith("/complaints/new/")) {
      return (
        <NewComplaintScreen
          navigate={navigate}
          setSelectedComplaintId={setSelectedComplaintId}
        />
      );
    }

    // Complaint confirmation
    if (route.startsWith("/complaints/confirm/")) {
      const complaintId = decodeURIComponent(
        route.replace("/complaints/confirm/", "")
      );
      return (
        <ConfirmationScreen
          complaintId={complaintId}
          navigate={navigate}
        />
      );
    }

    // External upload success
    if (route === "/complaints/upload-success") {
      return <ExternalUploadSuccessScreen navigate={navigate} />;
    }

    // Complaint list
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

    // Complaint detail
    if (route.startsWith("/complaints/") && route !== "/complaints") {
      const complaintId = decodeURIComponent(
        route.replace("/complaints/", "")
      );
      return (
        <ComplaintDetailPage
          complaint={EMPTY_COMPLAINT}
          complaintId={complaintId}
          navigate={navigate}
        />
      );
    }

    // Case construction status (sub-route)
    if (isCaseConstructionRoute() && caseIdFromRoute) {
      return (
        <ConstructionStatusForm
          navigate={navigate}
          caseId={caseIdFromRoute}
        />
      );
    }

    // Case detail
    if (route.startsWith("/cases/") && caseIdFromRoute) {
      return (
        <CaseDetailPage
          caseId={caseIdFromRoute}
          navigate={navigate}
        />
      );
    }

    // Case list
    if (route === "/cases") {
      return <CasesPage navigate={navigate} />;
    }

    // Field inspection
    if (
      route === "/field-inspection" ||
      route.startsWith("/field-inspection?")
    ) {
      const searchParams = new URLSearchParams(route.split("?")[1] ?? "");
      const caseId = searchParams.get("caseId") ?? undefined;
      return <FieldInspectionPage navigate={navigate} caseId={caseId} />;
    }

    // Standalone construction status
    if (route === "/construction-status") {
      return <ConstructionStatusForm navigate={navigate} />;
    }

    // Officers
    if (route === "/officers") {
      return <OfficersPage />;
    }

    // Settings
    if (route === "/settings") {
      return <SettingsPage />;
    }

    // Coming soon placeholders
    if (route === "/notices") {
      return <ComingSoonPage title="Notices" />;
    }

    if (route === "/gis-map") {
      return <ComingSoonPage title="GIS / Map View" />;
    }

    if (route === "/reports") {
      return <ComingSoonPage title="Reports" />;
    }

    // Fallback: Dashboard
    return (
      <DashboardPage
        navigate={navigate}
        setSelectedComplaintId={setSelectedComplaintId}
      />
    );
  };

  return (
    <div className="app-shell">
      <Topbar
        userName={user.name}
        userRole={user.role}
        onLogout={logout}
      />

      <div className="app-workspace">
        <Sidebar
          route={route}
          userRole={user.role}
          userName={user.name}
          navigate={navigate}
          onLogout={logout}
        />

        <div className="app-content">
          <main className="page-shell">
            {renderPage()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;