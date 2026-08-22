import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "./styles.css";
import PublicPage from "./pages/PublicPage";

/**
 * Loads a lazy chunk, retrying once with a cache-busting query param if the
 * initial load hits a stale-hash 404 / MIME mismatch (common across Worker
 * redeploys before the browser's cached HTML has expired).
 */
function resilientLazy<T extends React.ComponentType<object>>(loader: () => Promise<{ default: T }>) {
  return lazy(() =>
    loader().catch((err) => {
      if (sessionStorage.getItem("cf-stale-reload")) throw err;
      sessionStorage.setItem("cf-stale-reload", "1");
      window.location.reload();
      return new Promise<never>(() => {});
    }),
  );
}

const AdminLayout = resilientLazy(() => import("./pages/admin/AdminLayout"));
const LinksTab = resilientLazy(() => import("./pages/admin/LinksTab"));
const BrandingTab = resilientLazy(() => import("./pages/admin/BrandingTab"));
const AnalyticsTab = resilientLazy(() => import("./pages/admin/AnalyticsTab"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  { path: "/", element: <PublicPage /> },
  {
    path: "/admin",
    element: (
      <Suspense fallback={null}>
        <AdminLayout />
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/links" replace /> },
      { path: "links", element: <LinksTab /> },
      { path: "branding", element: <BrandingTab /> },
      { path: "analytics", element: <AnalyticsTab /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  </StrictMode>,
);