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
        
        <div className="max-w-md px-8 relative z-10 animate-fade-in text-center">
          {/* Monogram */}
          <div
            className="mx-auto mb-6 w-20 h-20 rounded-full border-2 border-accent/50 flex items-center justify-center relative animate-scale-in transition-shadow duration-700 hover:shadow-[0_0_28px_hsl(38_55%_52%/0.3),0_0_8px_hsl(38_55%_52%/0.15)]"
            style={{ boxShadow: '0 0 24px hsl(38 55% 52% / 0.1)', animationDuration: '0.8s', animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <span className="font-display text-lg font-semibold text-accent tracking-[0.08em]" style={{ lineHeight: 1 }}>
              FV<span className="text-accent/50 mx-[2px]">&</span>C
            </span>
          </div>

          {/* Decorative rule */}
          <div className="mx-auto mb-6 flex items-center gap-3 justify-center">
            <div className="h-px w-12 bg-accent/30" />
            <div className="w-1.5 h-1.5 rotate-45 border border-accent/40" />
            <div className="h-px w-12 bg-accent/30" />
          </div>

          <h1 className="font-display text-[2.75rem] font-semibold text-primary-foreground tracking-tight leading-[1.1]" style={{ letterSpacing: '0.04em' }}>
            Far View
          </h1>
          <p className="font-display text-[2rem] font-normal text-primary-foreground/70 tracking-widest leading-none mt-1" style={{ letterSpacing: '0.18em' }}>
            &amp; Chase
          </p>

          {/* Decorative rule */}
          <div className="mx-auto mt-6 flex items-center gap-3 justify-center">
            <div className="h-px w-12 bg-accent/30" />
            <div className="w-1.5 h-1.5 rotate-45 border border-accent/40" />
            <div className="h-px w-12 bg-accent/30" />
          </div>

          <p className="mt-6 font-display text-sm text-primary-foreground/50 tracking-[0.2em] uppercase">
            Assurance Portal
          </p>
          <p className="mt-5 text-[12px] text-primary-foreground/30 leading-relaxed max-w-[260px] mx-auto italic">
            Third-party due diligence conducted with clarity, confidence, and discretion.
          </p>

          {/* Established mark */}
          <p className="mt-8 text-[10px] text-primary-foreground/20 tracking-[0.25em] uppercase">
            Est. London
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
