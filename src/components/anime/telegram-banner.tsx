import { IconExternalLink, IconTelegram } from "./icons";

const TELEGRAM_LINK = "https://t.me/+zq2bSX8u785jZDg1";

export function TelegramBanner() {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-4 md:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D111C]/90 p-4 sm:p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-sky-500/30">
        <div className="relative z-10 flex flex-col items-center justify-between gap-3.5 sm:flex-row text-center sm:text-left">
          {/* Icon + Brief Text */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <IconTelegram className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Join Community on Telegram
                </h3>
                <span className="inline-flex items-center rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
                  Updates
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#94a3b8]">
                Get new episode alerts, Hindi dub drops, and direct links instantly.
              </p>
            </div>
          </div>

          {/* Clean Action Button */}
          <a
            href={TELEGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-sky-500/25 transition-all duration-200 hover:bg-sky-400 active:scale-95 cursor-pointer shrink-0"
          >
            <IconTelegram className="h-4 w-4" />
            <span>Join Telegram</span>
            <IconExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </div>
    </section>
  );
}
