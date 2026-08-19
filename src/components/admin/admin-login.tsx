import { useState } from "react";
import { verifyAdminCredentials } from "@/lib/admin-auth";
import { Logo } from "@/components/anime/nav";
import { IconLock, IconKey, IconSparkles, IconShield, IconUsers } from "@/components/anime/icons";
import { toast } from "sonner";

interface AdminLoginProps {
  onSuccess?: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const u = username.trim();
    const p = passcode.trim();

    if (!u || !p) {
      setError("Please enter your Admin Username and Passcode.");
      return;
    }

    setLoading(true);

    try {
      const isValid = await verifyAdminCredentials(u, p);
      if (isValid) {
        toast.success("Security Clearance Granted. Welcome Admin!");
        onSuccess?.();
      } else {
        setError("Access Denied: Invalid Admin Username or Security Passcode.");
        toast.error("Invalid credentials. Access forbidden.");
      }
    } catch (err) {
      console.error(err);
      setError("Authentication error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4 py-12">
      {/* Ambient Cyber Glows */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/25 blur-[130px] animate-pulse" />
      <div className="pointer-events-none absolute -bottom-20 right-1/4 h-80 w-80 rounded-full bg-accent/20 blur-[120px]" />

      <div className="glass relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/15 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        {/* Top Lock Badge */}
        <div className="text-center">
          <div className="mx-auto flex justify-center">
            <div className="relative inline-block">
              <Logo className="scale-110" />
              <span className="absolute -top-1.5 -right-5 rounded-full bg-primary px-2 py-0.5 text-[9px] font-black tracking-widest text-primary-foreground uppercase shadow-md shadow-primary/40">
                PRO
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <IconLock width={16} height={16} />
            </span>
            <h1 className="text-xl font-black tracking-tight text-foreground md:text-2xl">
              Admin Gateway
            </h1>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Enter authorized master credentials to manage multi-server stream pipelines.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="fade-up mt-5 flex items-start gap-3 rounded-2xl border border-destructive/50 bg-destructive/15 p-3.5 text-xs text-destructive-foreground">
            <span className="shrink-0 text-base">⛔</span>
            <div className="space-y-0.5">
              <p className="font-semibold">{error}</p>
              <p className="text-[11px] text-destructive-foreground/80">
                Please verify your Admin Username and Passcode.
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5">
              Admin Username
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <IconUsers width={16} height={16} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                disabled={loading}
                autoComplete="username"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-muted-foreground">Security Passcode</label>
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <IconKey width={16} height={16} />
              </div>
              <input
                type={showPass ? "text" : "password"}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••"
                disabled={loading}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-4 pl-10 text-sm font-mono tracking-widest text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-brand to-brand-glow py-3.5 px-4 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Verifying Access Clearance...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Unlock Control Center
                <IconSparkles width={16} height={16} />
              </span>
            )}
          </button>
        </form>

        {/* Footer Security Notice */}
        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
            <IconShield width={13} height={13} className="text-primary" />
            Protected by Cryptographic Salted Signature Verification
          </div>
        </div>
      </div>
    </div>
  );
}
