import { useState, useEffect } from "react";
import { X, Lock, Mail, Loader2, AlertCircle, CheckCircle2, Shield } from "lucide-react";
import { signInWithEmailAndPassword, auth } from "@/lib/firebase";
import { useNavigate } from "@tanstack/react-router";
import { LOGO_SRC } from "./nav";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Lock background scroll strictly when modal is open to prevent screen movement on mobile touch/drag
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const preventDefaultTouch = (e: TouchEvent) => {
      // Only prevent default if touching outside form inputs or modal card
      const target = e.target as HTMLElement;
      if (!target.closest(".login-modal-card")) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventDefaultTouch, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
      document.removeEventListener("touchmove", preventDefaultTouch);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        setLoading(false);
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          void navigate({ to: "/admin" });
        }
      }, 600);
    } catch (err: unknown) {
      setLoading(false);
      const message = err instanceof Error ? err.message : "Failed to sign in.";
      if (
        message.includes("user-not-found") ||
        message.includes("invalid-credential") ||
        message.includes("wrong-password")
      ) {
        setError("Invalid email or password. Please check your credentials.");
      } else if (message.includes("too-many-requests")) {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Sign in error. Please verify your credentials.");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-hidden overscroll-none touch-none select-none transition-all duration-300 animate-in fade-in"
      onClick={onClose}
      onTouchMove={(e) => {
        if ((e.target as HTMLElement).classList.contains("fixed")) {
          e.preventDefault();
        }
      }}
    >
      <div
        className="login-modal-card relative my-auto w-full max-w-md overflow-hidden rounded-3xl bg-[#12141A] border border-white/10 p-6 sm:p-8 shadow-2xl shadow-black/90 transition-all scale-in touch-auto select-text"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#E50914]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/10 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Branding */}
        <div className="text-center space-y-3 pt-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
            <img src={LOGO_SRC} alt="7Shows" className="h-8 w-auto object-contain" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Login to 7Shows
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400">
              Sign in to access your account & management
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Successfully authenticated! Redirecting...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 block">Email Address</label>
            <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-3 text-white transition focus-within:ring-2 focus-within:ring-[#E50914] focus-within:border-[#E50914]">
              <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@7shows.com"
                className="w-full bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 block">Password</label>
            <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-3 text-white transition focus-within:ring-2 focus-within:ring-[#E50914] focus-within:border-[#E50914]">
              <Lock className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] active:scale-[0.98] py-3 text-sm font-bold text-white shadow-lg shadow-[#E50914]/25 transition disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Login to 7Shows</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3 text-neutral-500" />
            <span>Secure Authorized Access Only</span>
          </p>
        </div>
      </div>
    </div>
  );
}
