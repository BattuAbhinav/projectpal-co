import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/routes/_app/dashboard";

export const Route = createFileRoute("/_app/projects/$projectId")({ component: ProjectDetail });

type Project = { id: string; name: string; description: string; owner_id: string };
type Profile = { id: string; full_name: string; email: string };
type Member = { id: string; user_id: string; role: "admin" | "member"; profiles: Profile | null };
type Task = {
  id: string; title: string; description: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignee_id: string | null; due_date: string | null;
  created_by: string; project_id: string;
};

const STATUSES: Task["status"][] = ["todo", "in_progress", "review", "done"];
const STATUS_LABEL: Record<Task["status"], string> = { todo: "To Do", in_progress: "In Progress", review: "Review", done: "Done" };
const PRIORITIES: Task["priority"][] = ["low", "medium", "high", "urgent"];

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { user, isSystemAdmin } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const isProjectAdmin = useMemo(() => {
    if (!user) return false;
    if (isSystemAdmin) return true;
    if (project?.owner_id === user.id) return true;
    return members.some((m) => m.user_id === user.id && m.role === "admin");
  }, [user, project, members, isSystemAdmin]);

  const load = useCallback(async () => {
    const { data: p } = await supabase.from("projects").select("*").eq("id", projectId).single();
    setProject(p as Project | null);
    const { data: t } = await supabase.from("tasks").select("*").eq("project_id", projectId).order("created_at");
    setTasks((t ?? []) as Task[]);
    const { data: m } = await supabase.from("project_members").select("id, user_id, role, profiles(id, full_name, email)").eq("project_id", projectId);
    setMembers((m ?? []) as unknown as Member[]);
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (taskId: string, status: Task["status"]) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) return toast.error(error.message);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Task deleted");
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  if (!project) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Projects</Link>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{project.description || "No description"}</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New task</Button></DialogTrigger>
          <TaskDialog
            members={members}
            projectId={projectId}
            currentUserId={user!.id}
            onClose={() => setCreating(false)}
            onSaved={() => { setCreating(false); load(); }}
          />
        </Dialog>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUSES.map((s) => (
              <div key={s} className="bg-muted/40 rounded-lg p-3 min-h-64">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{STATUS_LABEL[s]}</h3>
                  <span className="text-xs text-muted-foreground">{tasks.filter((t) => t.status === s).length}</span>
                </div>
                <div className="space-y-2">
                  {tasks.filter((t) => t.status === s).map((t) => (
                    <button key={t.id} onClick={() => setEditingTask(t)}
                      className="w-full text-left bg-card border border-border rounded-md p-3 hover:border-primary/40 hover:shadow-soft transition">
                      <div className="font-medium text-sm">{t.title}</div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <PriorityChip p={t.priority} />
                        {t.due_date && <span className="text-xs text-muted-foreground">{t.due_date}</span>}
                        {t.assignee_id && (
                          <span className="text-xs text-muted-foreground truncate">
                            {members.find((m) => m.user_id === t.assignee_id)?.profiles?.full_name?.split(" ")[0] ?? "—"}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card className="p-4">
            {tasks.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No tasks yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.map((t) => (
                  <li key={t.id} className="py-3 flex items-center gap-3 flex-wrap">
                    <button onClick={() => setEditingTask(t)} className="flex-1 min-w-0 text-left">
                      <div className="font-medium truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.due_date ?? "no due date"}</div>
                    </button>
                    <PriorityChip p={t.priority} />
                    <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v as Task["status"])}>
                      <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (<SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <StatusBadge status={t.status} />
                    {isProjectAdmin && (
                      <Button size="icon" variant="ghost" onClick={() => deleteTask(t.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <MembersPanel projectId={projectId} members={members} canManage={isProjectAdmin} onChange={load} />
        </TabsContent>
      </Tabs>

      {editingTask && (
        <Dialog open onOpenChange={(o) => !o && setEditingTask(null)}>
          <TaskDialog
            members={members}
            projectId={projectId}
            currentUserId={user!.id}
            task={editingTask}
            canDelete={isProjectAdmin}
            onClose={() => setEditingTask(null)}
            onSaved={() => { setEditingTask(null); load(); }}
            onDelete={async () => { await deleteTask(editingTask.id); setEditingTask(null); }}
          />
        </Dialog>
      )}
    </div>
  );
}

function PriorityChip({ p }: { p: Task["priority"] }) {
  const map: Record<Task["priority"], string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-primary/10 text-primary",
    high: "bg-warning/20 text-warning-foreground",
    urgent: "bg-destructive/15 text-destructive",
  };
  return <Badge variant="secondary" className={map[p]}>{p}</Badge>;
}

function TaskDialog({
  members, projectId, currentUserId, task, canDelete, onClose, onSaved, onDelete,
}: {
  members: Member[]; projectId: string; currentUserId: string;
  task?: Task; canDelete?: boolean; onClose: () => void; onSaved: () => void; onDelete?: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<Task["status"]>(task?.status ?? "todo");
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority ?? "medium");
  const [assignee, setAssignee] = useState<string>(task?.assignee_id ?? "none");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return toast.error("Title too short");
    const payload = {
      title: title.trim(),
      description: description.trim(),
      status, priority,
      assignee_id: assignee === "none" ? null : assignee,
      due_date: dueDate || null,
    };
    if (task) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
      if (error) return toast.error(error.message);
      toast.success("Task updated");
    } else {
      const { error } = await supabase.from("tasks").insert({ ...payload, project_id: projectId, created_by: currentUserId });
      if (error) return toast.error(error.message);
      toast.success("Task created");
    }
    onSaved();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div><Label htmlFor="t-title">Title</Label><Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required /></div>
        <div><Label htmlFor="t-desc">Description</Label><Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email || "User"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="t-due">Due date</Label><Input id="t-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
        <DialogFooter className="gap-2">
          {task && canDelete && onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">{task ? "Save" : "Create"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function MembersPanel({ projectId, members, canManage, onChange }: { projectId: string; members: Member[]; canManage: boolean; onChange: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data: profile, error: pErr } = await supabase.from("profiles").select("id").eq("email", email.trim()).maybeSingle();
    if (pErr || !profile) { setBusy(false); return toast.error("No user with that email. They must sign up first."); }
    const { error } = await supabase.from("project_members").insert({ project_id: projectId, user_id: profile.id, role });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Member added");
    setEmail("");
    onChange();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("project_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  };

  return (
    <Card className="p-5 space-y-5">
      {canManage && (
        <form onSubmit={add} className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-48"><Label htmlFor="m-email">Add member by email</Label><Input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy} className="gap-2"><UserPlus className="h-4 w-4" /> Add</Button>
        </form>
      )}
      <ul className="divide-y divide-border">
        {members.map((m) => (
          <li key={m.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{m.profiles?.full_name || "—"}</div>
              <div className="text-xs text-muted-foreground">{m.profiles?.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className={m.role === "admin" ? "bg-primary/15 text-primary" : ""}>{m.role}</Badge>
              {canManage && (
                <Button size="icon" variant="ghost" onClick={() => remove(m.id)} aria-label="Remove">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
