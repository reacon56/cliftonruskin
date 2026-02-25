import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Account created",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden"
      >
        {/* London skyline background */}
        <img
          src="/images/london-skyline.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Navy overlay with transparency */}
        <div className="absolute inset-0" style={{ background: "hsl(220 40% 10% / 0.55)" }} />
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(40 25% 97%) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }} />
        
        <div className="max-w-md px-8 relative z-10 animate-fade-in">
          <h1 className="font-display text-[2.75rem] font-semibold text-primary-foreground tracking-tight leading-[1.1]">
            Far View &amp; Chase
          </h1>
          <div className="mt-4 h-px w-20 bg-accent/80" />
          <p className="mt-6 font-display text-xl text-primary-foreground/70 leading-relaxed italic">
            Assurance Portal
          </p>
          <p className="mt-5 text-[13px] text-primary-foreground/40 leading-relaxed max-w-[280px]">
            Manage third-party due diligence with clarity, confidence, and discretion.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden mb-10">
            <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
              Far View &amp; Chase
            </h1>
            <div className="fvc-gold-rule mt-2" />
          </div>

          <h2 className="font-display text-[1.75rem] font-semibold text-foreground leading-none">
            {isLogin ? "Sign in" : "Create account"}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {isLogin
              ? "Enter your credentials to access the portal."
              : "Register for access to the assurance portal."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {!isLogin && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="James Pemberton"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="j.pemberton@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-11 text-[13px] font-medium tracking-wide" disabled={loading}>
              {loading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="fvc-link text-accent"
            >
              {isLogin ? "Register" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
