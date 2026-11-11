import { useEffect, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { standingsUrl } from '@/lib/standingsStorage';
import { Image } from '@/components/ui/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export default function AdminStandingsPreview({ registration }) {
  const [signed, setSigned] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const uri = registration?.standings_screenshot;

  useEffect(() => {
    let active = true;
    if (!uri) {
      setSigned(null);
      return;
    }
    setLoading(true);
    standingsUrl(uri)
      .then((url) => {
        if (active) setSigned(url);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uri]);

  if (!uri) return null;

  return (
    <div className="mt-2.5 border-t border-white/10 pt-2.5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 text-left transition-colors hover:bg-white/10"
      >
        {loading ? (
          <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />
        ) : signed ? (
          <Image src={signed} alt="Standings" fittingType="fill" className="h-9 w-9 rounded-lg" />
        ) : (
          <ImagePlus className="h-9 w-9 text-muted-foreground" />
        )}
        <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
          View standings screenshot
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] gap-3 p-4">
          <DialogTitle className="text-sm font-semibold">
            {registration.ff_ign || registration.user_name || 'Player'} — Standings
          </DialogTitle>
          {signed ? (
            <Image src={signed} alt="Standings" fittingType="fit" className="max-h-[72vh] w-full rounded-xl" />
          ) : (
            <p className="text-xs text-muted-foreground">Loading…</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}