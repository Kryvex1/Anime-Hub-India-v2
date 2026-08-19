import { ShieldAlert, Check, X } from "lucide-react";

export interface AdultConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AdultConfirmModal({ isOpen, onClose, onConfirm }: AdultConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[340px] overflow-hidden rounded-3xl border border-white/10 bg-[#0e1320] p-6 shadow-2xl backdrop-blur-xl text-center space-y-4 animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400">
          <ShieldAlert className="w-7 h-7" />
        </div>

        {/* Text */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
            Age Verification
          </span>
          <h3 className="text-lg font-bold text-white tracking-tight">Enable 18+ Content?</h3>
          <p className="text-xs text-slate-400">
            Mature & uncensored anime will appear in browse and search results.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition active:scale-98 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Yes, I Am 18+
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-98 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
