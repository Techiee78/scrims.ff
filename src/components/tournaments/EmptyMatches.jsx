import { Ghost } from 'lucide-react';

export default function EmptyMatches({ title, hint }) {
  return (
    <div className="glass flex flex-col items-center gap-2 rounded-[26px] px-6 py-10 text-center">
      <Ghost className="h-6 w-6 text-muted-foreground" />
      <p className="font-display text-sm font-semibold">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}