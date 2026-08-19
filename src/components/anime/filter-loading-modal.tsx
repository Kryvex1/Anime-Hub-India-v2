export interface FilterLoadingModalProps {
  isOpen: boolean;
}

export function FilterLoadingModal({ isOpen }: FilterLoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/65 backdrop-blur-md transition-all duration-300 animate-in fade-in">
      <div className="relative flex flex-col items-center justify-center">
        {/* Animated Glow Ring in Active Theme Color */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute h-14 w-14 rounded-full opacity-40 animate-ping"
            style={{ backgroundColor: "var(--brand-primary, #6366f1)" }}
          />
          <div
            className="h-12 w-12 rounded-full border-3 border-white/10 border-t-transparent animate-spin"
            style={{
              borderTopColor: "var(--brand-primary, #6366f1)",
              borderRightColor: "var(--brand-glow, #818cf8)",
              filter: "drop-shadow(0 0 10px var(--brand-primary, #6366f1))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
