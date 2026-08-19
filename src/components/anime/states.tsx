import { Link } from "@tanstack/react-router";
import { IconAlert, IconSad } from "./icons";

export function ErrorState({
  message = "Something went wrong while loading anime.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="fade-up glass mx-auto my-16 flex max-w-md flex-col items-center gap-3 rounded-2xl p-8 text-center border border-white/10">
      <span className="rounded-full bg-destructive/15 p-3 text-destructive">
        <IconAlert width={22} height={22} />
      </span>
      <h3 className="text-base font-semibold text-white">Couldn&apos;t load this</h3>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "No Anime Found",
  hint = "No anime available in this section yet.",
  showExplore = true,
}: {
  title?: string;
  hint?: string;
  showExplore?: boolean;
}) {
  return (
    <div className="fade-up mx-auto my-16 flex max-w-md flex-col items-center gap-4 rounded-3xl bg-[#111622]/80 border border-white/[0.08] p-8 text-center backdrop-blur-xl shadow-2xl shadow-black/60">
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-2 rounded-full bg-[#6366f1]/20 blur-xl animate-pulse" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 text-[#818cf8]">
          <IconSad width={32} height={32} />
        </span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        {hint && <p className="mt-1.5 text-xs sm:text-sm text-[#94a3b8] leading-relaxed">{hint}</p>}
      </div>
      {showExplore && (
        <div className="mt-2 flex flex-wrap gap-2.5 justify-center">
          <Link
            to="/browse"
            className="rounded-full bg-[#6366f1] hover:bg-[#4f46e5] px-5 py-2 text-xs font-semibold text-white transition active:scale-95 shadow-lg shadow-[#6366f1]/30"
          >
            Browse Anime
          </Link>
          <Link
            to="/"
            className="rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/10 px-5 py-2 text-xs font-semibold text-white transition active:scale-95"
          >
            Go Home
          </Link>
        </div>
      )}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="fade-up mb-6">
      {eyebrow && (
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
      )}
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
      )}
    </div>
  );
}
