import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, ListTodo, FolderKanban } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

type Stats = { total: number; done: number; inProgress: number; overdue: number };
type Task = { id: string; title: string; status: string; due_date: string | null; project_id: string; projects?: { name: string } | null };

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, done: 0, inProgress: 0, overdue: 0 });
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: tasks } = await supabase
        .from("tasks").select("id, title, status, due_date, project_id, projects(name)")
        .eq("assignee_id", user.id).order("due_date", { ascending: true, nullsFirst: false });
      const t = (tasks ?? []) as Task[];
      setMyTasks(t);
      const today = new Date().toISOString().slice(0, 10);
      setStats({
        total: t.length,
        done: t.filter((x) => x.status === "done").length,
        inProgress: t.filter((x) => x.status === "in_progress").length,
        overdue: t.filter((x) => x.due_date && x.due_date < today && x.status !== "done").length,
      });

      const { count } = await supabase.from("projects").select("id", { count: "exact", head: true });
      setProjectCount(count ?? 0);
    })();
  }, [user]);

  const cards = [
    { label: "My tasks", value: stats.total, icon: ListTodo, tint: "bg-accent text-accent-foreground" },
    { label: "In progress", value: stats.inProgress, icon: Clock, tint: "bg-primary/10 text-primary" },
    { label: "Completed", value: stats.done, icon: CheckCircle2, tint: "bg-success/15 text-success" },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, tint: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your work at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className={`h-10 w-10 rounded-lg grid place-items-center mb-3 ${c.tint}`}><c.icon className="h-5 w-5" /></div>
            <div className="text-3xl font-display font-bold">{c.value}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">My tasks</h2>
            <Link to="/projects" className="text-sm text-primary hover:underline">View projects</Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No tasks assigned to you yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {myTasks.slice(0, 8).map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.projects?.name ?? "—"}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.due_date && <span className="text-xs text-muted-foreground">{t.due_date}</span>}
                    <StatusBadge status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-display font-semibold text-lg mb-4">Workspace</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <FolderKanban className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">{projectCount} projects</div>
                <div className="text-xs text-muted-foreground">accessible to you</div>
              </div>
            </div>
            <Link to="/projects" className="block text-sm text-primary hover:underline px-1">Manage projects →</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    todo: { label: "To do", cls: "bg-muted text-muted-foreground" },
    in_progress: { label: "In progress", cls: "bg-primary/15 text-primary" },
    review: { label: "Review", cls: "bg-warning/20 text-warning-foreground" },
    done: { label: "Done", cls: "bg-success/20 text-success" },
  };
  const m = map[status] ?? map.todo;
  return <Badge variant="secondary" className={m.cls}>{m.label}</Badge>;
}
