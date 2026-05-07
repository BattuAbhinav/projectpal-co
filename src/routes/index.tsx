import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CheckSquare, Kanban, ShieldCheck, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskFlow — Team task management" },
      { name: "description", content: "Projects, kanban boards, and role-based access for shipping teams." },
      { property: "og:title", content: "TaskFlow — Team task management" },
      { property: "og:description", content: "Projects, kanban boards, and role-based access." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && user) navigate({ to: "/dashboard" }); }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display font-bold text-xl">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center"><CheckSquare className="h-5 w-5" /></div>
          TaskFlow
        </div>
        <div className="flex gap-2">
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button>Get started</Button></Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-accent text-accent-foreground mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Built for fast-moving teams
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05]">
          Where teams turn plans into <span className="text-primary">progress</span>.
        </h1>
        <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto">
          TaskFlow is a calm, focused workspace for projects, tasks, and team accountability. Kanban boards, role-based access, and real-time tracking — all included.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth"><Button size="lg" className="gap-2">Start for free <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { icon: Kanban, title: "Kanban boards", desc: "Drag tasks across To Do, In Progress, Review, and Done." },
          { icon: Users, title: "Team projects", desc: "Invite teammates, assign owners, and ship together." },
          { icon: ShieldCheck, title: "Role-based access", desc: "System admins, project admins, and members — clear boundaries." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground grid place-items-center mb-4"><f.icon className="h-5 w-5" /></div>
            <h3 className="font-semibold text-lg">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
