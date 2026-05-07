import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, FolderKanban } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects/")({ component: ProjectsPage });

type Project = { id: string; name: string; description: string; created_at: string };

function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects((data ?? []) as Project[]);
  };
  useEffect(() => { load(); }, []);

  const create = async (name: string, description: string) => {
    if (!user) return;
    const { error } = await supabase.from("projects").insert({ name, description, owner_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Project created");
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">Spaces where your team gets things done.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New project</Button></DialogTrigger>
          <NewProjectDialog onCreate={create} />
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first project to start tracking work.</p>
          <Button onClick={() => setOpen(true)}>Create project</Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }}>
              <Card className="p-5 hover:border-primary/40 hover:shadow-elevated transition cursor-pointer h-full">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3"><FolderKanban className="h-5 w-5" /></div>
                <h3 className="font-display font-semibold text-lg">{p.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 min-h-10">{p.description || "No description"}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NewProjectDialog({ onCreate }: { onCreate: (name: string, description: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 2) return toast.error("Name too short"); onCreate(name.trim(), desc.trim()); }}>
        <div className="space-y-4">
          <div><Label htmlFor="p-name">Name</Label><Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></div>
          <div><Label htmlFor="p-desc">Description</Label><Textarea id="p-desc" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} /></div>
        </div>
        <DialogFooter className="mt-4"><Button type="submit">Create</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
