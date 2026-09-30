import { cn } from "@/lib/utils";

interface BrandBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * 7Shows Brand Badge based on the exact header logo emblem
 */
export function BrandBadge({ className, size = "sm" }: BrandBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[6px] select-none shrink-0 transition-all duration-200",
        "bg-[#0a0d14]/90 border border-white/[0.12] p-0.5 pr-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.7)] backdrop-blur-md",
        size === "sm" ? "h-[19px]" : "h-[22px]",
        className,
      )}
    >
      {/* Header-Identical "7" Emblem Box */}
      <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-[4px] bg-gradient-to-tr from-[#E50914] via-[#b80710] to-[#f97316] p-[1px] shadow-sm shadow-[#E50914]/40 shrink-0">
        <span className="flex h-full w-full items-center justify-center rounded-[3px] bg-[#141414]/95">
          <span className="text-[9px] font-black tracking-tighter text-white leading-none">7</span>
        </span>
      </span>

      {/* Clean 7Shows in Title Case (No Capital / All-Caps) */}
      <span className="text-[9px] font-black tracking-tight leading-none bg-gradient-to-r from-white via-neutral-100 to-[#E50914] bg-clip-text text-transparent">
        7Shows
      </span>
    </span>
  );
}
