import { Navigate, Outlet } from "react-router";

export default function AdminLayout() {
  // Cloudflare Access sits in front of /admin*; this layout just renders the
  // dashboard shell once authenticated. The index route redirects to links.
  return (
    <div className="min-h-screen bg-muted/40">
      <Navigate to="/admin/links" replace />
      <Outlet />
    </div>
  );
}