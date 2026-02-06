import { LEAGUE_CONFIG } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-border/50 pb-20 md:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 py-8 text-center sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-navy/30" />
          <p className="text-xs font-medium text-text-muted">
            {LEAGUE_CONFIG.name} &middot; Est. {LEAGUE_CONFIG.established}
          </p>
        </div>
        <p className="text-xs text-text-muted/60">
          Powered by Sleeper API
        </p>
      </div>
    </footer>
  );
}
