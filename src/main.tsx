import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "./styles.css";
import PublicPage from "./pages/PublicPage";

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const LinksTab = lazy(() => import("./pages/admin/LinksTab"));
const BrandingTab = lazy(() => import("./pages/admin/BrandingTab"));
const AnalyticsTab = lazy(() => import("./pages/admin/AnalyticsTab"));

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