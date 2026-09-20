// import { useState } from "react";
// import "./App.css";

// import { useRouter } from "./shared/hooks/useRouter";
// import type { Role } from "./shared/types";
// import type { AppComplaint } from "./shared/types";

// // Layout
// import Topbar from "./layout/Topbar";
// import Sidebar from "./layout/Sidebar";

// // Auth
// import LoginScreen from "./features/auth/LoginScreen";

// // Feature pages
// import DashboardPage from "./features/dashboard/DashboardPage";
// import ComplaintsPage from "./features/complaints/ComplaintsPage";
// import ComplaintDetailPage from "./features/complaints/ComplaintDetailPage";
// import NewComplaintScreen from "./features/complaints/NewComplaintScreen";
// import ConfirmationScreen from "./features/complaints/ConfirmationScreen";
// import AnalyticsPage from "./features/analytics/AnalyticsPage";
// import OfficersPage from "./features/officers/OfficersPage";
// import SettingsPage from "./features/settings/SettingsPage";

// // Pages
// import CasesPage from "./pages/CasesPage";
// import CaseDetailPage from "./pages/CaseDetailPage";
// import FieldInspectionPage from "./pages/FieldInspectionPage";
// import ConstructionStatusForm from "./pages/ConstructionStatusForm";

// // Shared
// import ComingSoonPage from "./shared/components/ComingSoonPage";

// // ─── Placeholder complaint used as fallback when detail page is opened
// // directly and no real data has been fetched yet ──────────────────────────────
// const EMPTY_COMPLAINT: AppComplaint = {
//   id: "",
//   title: "",
//   citizen: "",
//   phone: "",
//   ward: "",
//   officer: "",
//   status: "Registered",
//   registered: "",
//   zone: "",
//   block: "",
//   address: "",
//   description: "",
//   assignedOfficer: "",
//   atp: "",
//   daysOpen: 0,
//   timeline: [],
// };

// function App() {
//   const { route, navigate } = useRouter();

//   // ── Auth State ──────────────────────────────────────────────────────────────
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [userRole, setUserRole] = useState<Role>("Admin");
//   const [userName, setUserName] = useState("Arjun Mehta");

//   // ── Shared cross-page state ─────────────────────────────────────────────────
//   const [, setSelectedComplaintId] = useState("");

//   // ── Login / Logout handlers ─────────────────────────────────────────────────
//   const handleLogin = (name: string) => {
//     setUserName(name);
//     setIsLoggedIn(true);
//     navigate("/dashboard");
//   };

//   const handleLogout = () => {
//     setIsLoggedIn(false);
//     navigate("/login");
//   };

//   // ── Not logged in → show login screen ──────────────────────────────────────
//   if (!isLoggedIn) {
//     return (
//       <LoginScreen
//         onLogin={handleLogin}
//         onRoleChange={(role) => setUserRole(role)}
//       />
//     );
//   }

//   // ── Route matching helpers ──────────────────────────────────────────────────

//   /** Returns the case ID if we are on /cases/:caseId, otherwise null. */
//   const getCaseIdFromRoute = (): string | null => {
//     // Match /cases/<id>/construction-status  OR  /cases/<id>
//     const match = route.match(/^\/cases\/([^/]+?)(?:\/construction-status)?(?:\?.*)?$/);
//     return match ? decodeURIComponent(match[1]) : null;
//   };

//   /** Returns true if we are on the construction-status sub-route of a case. */
//   const isCaseConstructionRoute = (): boolean =>
//     /^\/cases\/[^/]+\/construction-status/.test(route);

//   const caseIdFromRoute = getCaseIdFromRoute();

//   // ── Render the correct page based on the current route ─────────────────────
//   const renderPage = () => {
//     // ── Dashboard ────────────────────────────────────────────────────────────
//     if (route === "/dashboard" || route === "/") {
//       return (
//         <DashboardPage
//           navigate={navigate}
//           setSelectedComplaintId={setSelectedComplaintId}
//         />
//       );
//     }

//     // ── New Complaint ─────────────────────────────────────────────────────────
//     if (route === "/complaints/new" || route.startsWith("/complaints/new/")) {
//       return (
//         <NewComplaintScreen
//           navigate={navigate}
//           setSelectedComplaintId={setSelectedComplaintId}
//         />
//       );
//     }

//     // ── Complaint Confirmation ────────────────────────────────────────────────
//     if (route.startsWith("/complaints/confirm/")) {
//       const confirmId = route.replace("/complaints/confirm/", "");
//       return <ConfirmationScreen complaintId={confirmId} navigate={navigate} />;
//     }

//     // ── Complaint Detail ──────────────────────────────────────────────────────
//     if (route.startsWith("/complaints/") && route !== "/complaints") {
//       const detailId = decodeURIComponent(route.replace("/complaints/", ""));
//       return (
//         <ComplaintDetailPage
//           complaint={EMPTY_COMPLAINT}
//           complaintId={detailId}
//           navigate={navigate}
//         />
//       );
//     }

//     // ── Complaints List ───────────────────────────────────────────────────────
//     if (
//       route === "/complaints" ||
//       route === "/complaints/mine" ||
//       route === "/complaints/pending"
//     ) {
//       return (
//         <ComplaintsPage
//           route={route}
//           navigate={navigate}
//           setSelectedComplaintId={setSelectedComplaintId}
//         />
//       );
//     }

//     // ── Case Construction Status (sub-route) ──────────────────────────────────
//     if (isCaseConstructionRoute() && caseIdFromRoute) {
//       return (
//         <ConstructionStatusForm
//           navigate={navigate}
//           caseId={caseIdFromRoute}
//         />
//       );
//     }

//     // ── Case Detail ───────────────────────────────────────────────────────────
//     if (caseIdFromRoute && route.startsWith("/cases/")) {
//       return <CaseDetailPage caseId={caseIdFromRoute} navigate={navigate} />;
//     }

//     // ── Cases List ────────────────────────────────────────────────────────────
//     if (route === "/cases") {
//       return <CasesPage navigate={navigate} />;
//     }

//     // ── Field Inspection ──────────────────────────────────────────────────────
//     if (route === "/field-inspection" || route.startsWith("/field-inspection?")) {
//       // Support ?caseId= query param passed via hash
//       const caseIdParam = route.includes("caseId=")
//         ? decodeURIComponent(route.split("caseId=")[1].split("&")[0])
//         : undefined;
//       return <FieldInspectionPage navigate={navigate} caseId={caseIdParam} />;
//     }

//     // ── Construction Status (standalone) ─────────────────────────────────────
//     if (route === "/construction-status") {
//       return <ConstructionStatusForm navigate={navigate} />;
//     }

//     // ── Analytics ────────────────────────────────────────────────────────────
//     if (route === "/analytics") {
//       return <AnalyticsPage />;
//     }

//     // ── Officers ─────────────────────────────────────────────────────────────
//     if (route === "/officers") {
//       return <OfficersPage />;
//     }

//     // ── Settings ─────────────────────────────────────────────────────────────
//     if (route === "/settings") {
//       return <SettingsPage />;
//     }

//     // ── Coming Soon placeholders ──────────────────────────────────────────────
//     if (route === "/notices") {
//       return <ComingSoonPage title="Notices" />;
//     }

//     if (route === "/gis-map") {
//       return <ComingSoonPage title="GIS / Map View" />;
//     }

//     if (route === "/reports") {
//       return <ComingSoonPage title="Reports" />;
//     }

//     // ── Fallback: unknown route → dashboard ───────────────────────────────────
//     return (
//       <DashboardPage
//         navigate={navigate}
//         setSelectedComplaintId={setSelectedComplaintId}
//       />
//     );
//   };

//   // ── Shell Layout ────────────────────────────────────────────────────────────
//   return (
//     <div className="app-shell">
//       <Topbar
//         userName={userName}
//         userRole={userRole}
//         onLogout={handleLogout}
//       />

//       <div className="app-workspace">
//         <Sidebar
//           route={route}
//           userRole={userRole}
//           userName={userName}
//           navigate={navigate}
//           onLogout={handleLogout}
//         />

//         <main className="main-content">
//           {renderPage()}
//         </main>
//       </div>
//     </div>
//   );
// }

// export default App;



import { useState } from "react";
import "./App.css";

// Router
import { useRouter } from "./shared/hooks/useRouter";

// Types
import type { Role, AppComplaint } from "./shared/types";

// Layout
import Topbar from "./layout/Topbar";
import Sidebar from "./layout/Sidebar";

// Auth
import LoginScreen from "./features/auth/LoginScreen";

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
import AnalyticsPage from "./features/analytics/AnalyticsPage";
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

function App() {
  const { route, navigate } = useRouter();

  // ---------------------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------------------

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<Role>("Admin");
  const [userName, setUserName] = useState("Arjun Mehta");

  // ---------------------------------------------------------------------------
  // SHARED STATE
  // ---------------------------------------------------------------------------

  const [, setSelectedComplaintId] = useState("");

  // ---------------------------------------------------------------------------
  // AUTH HANDLERS
  // ---------------------------------------------------------------------------

  const handleLogin = (name: string) => {
    setUserName(name);
    setIsLoggedIn(true);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    navigate("/login");
  };

  // ---------------------------------------------------------------------------
  // ROUTE HELPERS
  // ---------------------------------------------------------------------------

  const getCaseIdFromRoute = (): string | null => {
    const match = route.match(
      /^\/cases\/([^/]+)(?:\/construction-status)?$/
    );

    return match ? decodeURIComponent(match[1]) : null;
  };

  const isCaseConstructionRoute = (): boolean => {
    return /^\/cases\/[^/]+\/construction-status$/.test(route);
  };

  const caseIdFromRoute = getCaseIdFromRoute();

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------

  if (!isLoggedIn) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onRoleChange={(role) => setUserRole(role)}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // PAGE ROUTING
  // ---------------------------------------------------------------------------

  const renderPage = () => {
    // Dashboard
    if (route === "/" || route === "/dashboard") {
      return (
        <DashboardPage
          navigate={navigate}
          setSelectedComplaintId={setSelectedComplaintId}
        />
      );
    }

    // -------------------------------------------------------------------------
    // COMPLAINT CREATION
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // COMPLAINT LIST
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // COMPLAINT DETAIL
    // -------------------------------------------------------------------------

    if (
      route.startsWith("/complaints/") &&
      route !== "/complaints"
    ) {
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

    // -------------------------------------------------------------------------
    // CASE CONSTRUCTION STATUS
    // IMPORTANT: keep this BEFORE /cases/:caseId
    // -------------------------------------------------------------------------

    if (isCaseConstructionRoute() && caseIdFromRoute) {
      return (
        <ConstructionStatusForm
          navigate={navigate}
          caseId={caseIdFromRoute}
        />
      );
    }

    // -------------------------------------------------------------------------
    // CASE DETAIL
    // -------------------------------------------------------------------------

    if (
      route.startsWith("/cases/") &&
      caseIdFromRoute
    ) {
      return (
        <CaseDetailPage
          caseId={caseIdFromRoute}
          navigate={navigate}
        />
      );
    }

    // -------------------------------------------------------------------------
    // CASE LIST
    // -------------------------------------------------------------------------

    if (route === "/cases") {
      return <CasesPage navigate={navigate} />;
    }

    // -------------------------------------------------------------------------
    // FIELD INSPECTION
    // -------------------------------------------------------------------------

    if (
      route === "/field-inspection" ||
      route.startsWith("/field-inspection?")
    ) {
      const searchParams = new URLSearchParams(
        route.split("?")[1] ?? ""
      );

      const caseId = searchParams.get("caseId") ?? undefined;

      return (
        <FieldInspectionPage
          navigate={navigate}
          caseId={caseId}
        />
      );
    }

    // -------------------------------------------------------------------------
    // STANDALONE CONSTRUCTION STATUS
    // Keep temporarily for existing navigation.
    // Primary workflow should use /cases/:caseId/construction-status
    // -------------------------------------------------------------------------

    if (route === "/construction-status") {
      return <ConstructionStatusForm navigate={navigate} />;
    }

    // -------------------------------------------------------------------------
    // ANALYTICS
    // -------------------------------------------------------------------------

    if (route === "/analytics") {
      return <AnalyticsPage />;
    }

    // -------------------------------------------------------------------------
    // OFFICERS
    // -------------------------------------------------------------------------

    if (route === "/officers") {
      return <OfficersPage />;
    }

    // -------------------------------------------------------------------------
    // SETTINGS
    // -------------------------------------------------------------------------

    if (route === "/settings") {
      return <SettingsPage />;
    }

    // -------------------------------------------------------------------------
    // COMING SOON
    // -------------------------------------------------------------------------

    if (route === "/notices") {
      return <ComingSoonPage title="Notices" />;
    }

    if (route === "/gis-map") {
      return <ComingSoonPage title="GIS / Map View" />;
    }

    if (route === "/reports") {
      return <ComingSoonPage title="Reports" />;
    }

    // -------------------------------------------------------------------------
    // FALLBACK
    // -------------------------------------------------------------------------

    return (
      <DashboardPage
        navigate={navigate}
        setSelectedComplaintId={setSelectedComplaintId}
      />
    );
  };

  // ---------------------------------------------------------------------------
  // APP SHELL
  // ---------------------------------------------------------------------------

  return (
    <div className="app-shell">
      <Topbar
        userName={userName}
        userRole={
          userRole === "Admin"
            ? "Building Branch (Staff)"
            : userRole
        }
        onLogout={handleLogout}
      />

      <div className="app-workspace">
        <Sidebar
          route={route}
          userRole={userRole}
          userName={userName}
          navigate={navigate}
          onLogout={handleLogout}
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