import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Headset, X } from 'lucide-react';
import { SUPPORT_CHANNELS } from '@/lib/support';

export default function FloatingSupport() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="fixed right-4 z-40 flex flex-col items-end gap-2"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6.5rem)' }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-60 rounded-[26px] border border-border bg-card p-2 shadow-2xl"
          >
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Customer support
            </p>
            <div className="space-y-1">
              {SUPPORT_CHANNELS.map((channel) => {
                const Icon = channel.icon;
                const inner = (
                  <>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-xs font-medium">{channel.label}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {channel.hint}
                      </span>
                    </span>
                  </>
                );

                if (!channel.live) {
                  return (
                    <div
                      key={channel.label}
                      aria-disabled="true"
                      className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-2xl px-2 py-2 opacity-50"
                    >
                      {inner}
                    </div>
                  );
                }

                return (
                  <a
                    key={channel.label}
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-2xl px-2 py-2 text-foreground transition-colors hover:bg-white/10"
                  >
                    {inner}
                  </a>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Customer support"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_10px_30px_rgba(3,2,12,0.6)] transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-5 w-5" /> : <Headset className="h-5 w-5" />}
      </button>
    </div>
  );
}