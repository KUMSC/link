import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet } from "react-router";
import { Link2, Palette, BarChart3 } from "lucide-react";
import { getAdminData } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Card, CardContent } from "../../components/ui/card";

const tabs = [
  { to: "/admin/links", label: "Links", icon: Link2 },
  { to: "/admin/branding", label: "Branding", icon: Palette },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-data"],
    queryFn: getAdminData,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  // Cloudflare Access sits in front of /admin*; if the API rejects us,
  // render a friendly message instead of a blank page.
  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="max-w-sm p-8 text-center">
            <h1 className="text-lg font-semibold">Access required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your Cloudflare Access session is missing or expired. Please sign in through the
              Access login page and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{data.profile.orgName}</h1>
          <p className="text-sm text-muted-foreground">Signed in as {data.email}</p>
        </div>
        <a href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          View public page →
        </a>
      </header>

            <nav className="mt-5 flex gap-1 rounded-xl border bg-card p-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <main className="mt-6 flex-1">
        <Outlet />
      </main>
    </div>
  );
}