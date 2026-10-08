import { WifiOff, Hourglass } from 'lucide-react';
import useConnection from '@/hooks/useConnection';

// A slim banner that sits at the top of any page and surfaces
// no-internet / slow-internet states globally.
export default function ConnectionBanner() {
  const { online, slow } = useConnection();

  if (!online) {
    return (
      <div className="glass-soft mx-1 mb-3 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-destructive">
        <WifiOff className="h-3.5 w-3.5" />
        You're offline. Check your connection.
      </div>
    );
  }
  if (slow) {
    return (
      <div className="glass-soft mx-1 mb-3 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-muted-foreground">
        <Hourglass className="h-3.5 w-3.5" />
        Slow connection detected. Some rooms may load slowly.
      </div>
    );
  }
  return null;
}