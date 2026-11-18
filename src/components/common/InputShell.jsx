import { cn } from '@/lib/utils';

// Shared shell so a native control (date/time, number, text) looks like the
// same glass field as the rest of the app.
export default function InputShell({ children, className }) {
  return (
    <div
      className={cn(
        'glass-soft flex h-11 w-full items-center gap-2 rounded-2xl border border-white/10 px-3 transition-colors focus-within:border-primary/60',
        className
      )}
    >
      {children}
    </div>
  );
}