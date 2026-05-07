import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Name too short").max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
  role: z.enum(["admin", "member"]),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && user) navigate({ to: "/dashboard" }); }, [user, loading, navigate]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl">
          <CheckSquare /> TaskFlow
        </Link>
        <div>
          <h1 className="font-display text-5xl font-bold leading-tight mb-4">
            Ship work,<br />not status updates.
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            Projects, kanban boards, and role-based access — all in one calm workspace for your team.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/70">© TaskFlow</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="login"><LoginForm /></TabsContent>
            <TabsContent value="signup"><SignupForm /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
  };
  return (
    <Card className="p-6">
      <h2 className="font-display text-2xl font-semibold mb-1">Welcome back</h2>
      <p className="text-sm text-muted-foreground mb-6">Sign in to your TaskFlow account.</p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div><Label htmlFor="li-email">Email</Label><Input id="li-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label htmlFor="li-pwd">Password</Label><Input id="li-pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </Card>
  );
}

function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ fullName, email, password, role });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, role },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you're signed in!");
  };
  return (
    <Card className="p-6">
      <h2 className="font-display text-2xl font-semibold mb-1">Create your account</h2>
      <p className="text-sm text-muted-foreground mb-6">Start managing your team's work.</p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div><Label htmlFor="su-name">Full name</Label><Input id="su-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
        <div><Label htmlFor="su-email">Email</Label><Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label htmlFor="su-pwd">Password</Label><Input id="su-pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <div>
          <Label>Account type</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(["member", "admin"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`border rounded-md px-3 py-2 text-sm capitalize transition ${role === r ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted"}`}>
                {r === "admin" ? "Admin" : "Member"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Admins have access to all projects across the system.</p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
    </Card>
  );
}
