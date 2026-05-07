import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CheckSquare, LayoutDashboard, FolderKanban, LogOut, Shield } from "lucide-react";
import type { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut, isSystemAdmin } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Projects", icon: FolderKanban },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-sidebar-border bg-sidebar p-5 flex flex-col gap-1 sticky top-0 h-screen">
        <Link to="/dashboard" className="flex items-center gap-2 mb-8 px-2">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-none">TaskFlow</div>
            <div className="text-xs text-muted-foreground">Team workspace</div>
          </div>
        </Link>

        {nav.map((n) => {
          const active = path === n.to || path.startsWith(n.to + "/");
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
              }`}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          );
        })}

        <div className="mt-auto border-t border-sidebar-border pt-4">
          <div className="px-2 mb-3">
            <div className="text-sm font-medium truncate">{user?.email}</div>
            {isSystemAdmin && (
              <div className="inline-flex items-center gap-1 text-xs text-primary mt-1">
                <Shield className="h-3 w-3" /> System Admin
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-8 max-w-[1400px] mx-auto w-full">{children}</main>
    </div>
  );
}
