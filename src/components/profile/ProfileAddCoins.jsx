import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { fetchMyDeposits } from '@/lib/deposits';
import AddCoinsDialog from '@/components/wallet/AddCoinsDialog';

// Shortcut on the profile page: opens the same manual UPI deposit dialog as the wallet.
export default function ProfileAddCoins() {
  const [settings, setSettings] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mine = await fetchMyDeposits();
        if (alive) setSettings(mine?.settings || null);
      } catch (_e) {
        if (alive) setSettings(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-soft flex h-8 items-center gap-1.5 rounded-full px-3 font-display text-[11px] font-semibold text-foreground"
      >
        <Plus className="h-3.5 w-3.5 text-primary" />
        Add coins
      </button>

      <AddCoinsDialog open={open} onOpenChange={setOpen} settings={settings} />
    </>
  );
}