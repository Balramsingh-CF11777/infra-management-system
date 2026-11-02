import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { getCurrentUserContext } from "@/api/auth";
import { queryKeys } from "@/api/keys";
import { setUnauthorizedHandler } from "@/api/client";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PendingPage } from "@/features/pending/PendingPage";
import { RequestListPage } from "@/features/proposedBranch/RequestListPage";
import {
  ActivityTab,
  DetailsSectionTab,
  OverviewTab,
  QueriesTab,
  RequestWorkspace,
} from "@/features/proposedBranch/RequestWorkspace";
import { DocumentsPage } from "@/features/documents/DocumentsPage";
import { DocumentPage } from "@/features/documents/DocumentPage";
import { MisRequestListPage } from "@/features/mis/MisRequestListPage";
import { CreateNewBranchPage } from "@/features/newBranch/CreateNewBranchPage";
import { NewBranchPage } from "@/features/newBranch/NewBranchPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { LeadHomePage } from "@/features/leads/LeadHomePage";
import { CreateLeadPage } from "@/features/leads/CreateLeadPage";
import { LeadDetailPage } from "@/features/leads/LeadDetailPage";
import { SiteImageCapturePage } from "@/features/leads/SiteImageCapturePage";
import { SiteVerificationPage } from "@/features/leads/SiteVerificationPage";
import { PropertyVerificationPage } from "@/features/leads/PropertyVerificationPage";
import { LeadDocumentUploadPage } from "@/features/leads/LeadDocumentUploadPage";
import { LeadFacilityDetailsPage } from "@/features/leads/LeadFacilityDetailsPage";
import { LeadLoiPage } from "@/features/leads/LeadLoiPage";
import { LeadOwnerDetailsPage } from "@/features/leads/LeadOwnerDetailsPage";
import { LeadPropertyDetailsPage } from "@/features/leads/LeadPropertyDetailsPage";
import { ApprovalDeskPage } from "@/features/leads/ApprovalDeskPage";
import { usesMisDashboard } from "@/lib/misAccess";
import { homePathForUser } from "@/lib/arbmAccess";
import { useSession } from "@/stores/session";
import { SkeletonBlock } from "@/components/common/EmptyState";

function HomeRedirect() {
  const user = useSession((state) => state.user);
  const activeRole = useSession((state) => state.activeRole);
  return <Navigate to={homePathForUser(user, activeRole)} replace />;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const setUser = useSession((state) => state.setUser);
  const clear = useSession((state) => state.clear);
  const user = useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: getCurrentUserContext,
    retry: false,
  });

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clear();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    });
  }, [clear]);

  useEffect(() => {
    if (user.data) setUser(user.data);
  }, [user.data, setUser]);

  const sessionUser = useSession((state) => state.user);

  if (user.isLoading) return <SkeletonBlock className="m-6 h-40" />;
  if (user.isError || !user.data) return <Navigate to="/login" replace />;
  // Wait until the store has the context so child queries pick the right API mode.
  if (sessionUser?.user !== user.data.user || sessionUser.api_mode !== user.data.api_mode) {
    return <SkeletonBlock className="m-6 h-40" />;
  }
  return children;
}

/** IMS MIS users only have the MIS dashboard and the request pages it links to. */
function HiddenForMisDashboard() {
  const user = useSession((state) => state.user);
  return usesMisDashboard(user) ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/mis/requests" element={<MisRequestListPage />} />
        <Route path="/documents/:doctype/:name" element={<DocumentPage />} />
        <Route element={<HiddenForMisDashboard />}>
          <Route path="/pending" element={<PendingPage />} />
          <Route path="/chola360/leads" element={<LeadHomePage />} />
          <Route path="/chola360/leads/new" element={<CreateLeadPage />} />
          <Route path="/chola360/leads/:id/site-images" element={<SiteImageCapturePage />} />
          <Route path="/chola360/leads/:id/property-verification" element={<PropertyVerificationPage />} />
          <Route path="/chola360/leads/:id/property-details" element={<LeadPropertyDetailsPage />} />
          <Route path="/chola360/leads/:id/owner-details" element={<LeadOwnerDetailsPage />} />
          <Route path="/chola360/leads/:id/facility-details" element={<LeadFacilityDetailsPage />} />
          <Route path="/chola360/leads/:id/documents" element={<LeadDocumentUploadPage />} />
          <Route path="/chola360/leads/:id/loi" element={<LeadLoiPage />} />
          <Route path="/chola360/leads/:id" element={<LeadDetailPage />} />
          <Route path="/chola360/leads/:id/site-verification" element={<SiteVerificationPage />} />
          <Route path="/chola360/leads/:id/approval" element={<ApprovalDeskPage />} />
          <Route path="/infra/requests" element={<RequestListPage />} />
          <Route path="/infra/requests/:id" element={<RequestWorkspace />}>
            <Route index element={<OverviewTab />} />
            <Route path="property-details" element={<DetailsSectionTab formTab="Property Details" />} />
            <Route path="commercial-details" element={<DetailsSectionTab formTab="Commercial Details" />} />
            <Route path="facility-details" element={<DetailsSectionTab formTab="Facility Details" />} />
            <Route path="owner-details" element={<DetailsSectionTab formTab="Owner Details" />} />
            {/* Legacy routes */}
            <Route path="property" element={<DetailsSectionTab formTab="Property Details" />} />
            <Route path="details" element={<DetailsSectionTab formTab="Request Info" />} />
            <Route path="queries" element={<QueriesTab />} />
            <Route path="activity" element={<ActivityTab />} />
          </Route>
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:doctype" element={<DocumentsPage />} />
          <Route path="/new-branch" element={<NewBranchPage />} />
          <Route path="/new-branch/new" element={<CreateNewBranchPage />} />
          <Route
            path="/operations"
            element={
              <PlaceholderPage
                title="Operations"
                body="Layout, BOQ, PO status, advance payments, and vendor code screens use the same workflow framework and will be added on top of this request workspace."
              />
            }
          />
          <Route
            path="/reports"
            element={
              <PlaceholderPage
                title="Reports"
                body="Pipeline, aging, and TAT reports will read the same permission-scoped APIs. System Manager stage counts are already on the dashboard."
              />
            }
          />
          <Route
            path="/admin"
            element={
              <PlaceholderPage
                title="Administration"
                body="User and role-master administration remains in Frappe for this delivery. The request page already shows an administrator diagnostic for workflow state, roles, and scope."
              />
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
