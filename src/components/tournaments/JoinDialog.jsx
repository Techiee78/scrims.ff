import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { coins } from '@/lib/format';

export default function JoinDialog({ tournament, open, onOpenChange, user, onJoined }) {
  const { toast } = useToast();
  const [ign, setIgn] = useState('');
  const [uid, setUid] = useState('');
  const [balance, setBalance] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setIgn(user?.ff_ign || '');
    setUid(user?.ff_uid || '');
    setBalance(null);
    base44.functions
      .invoke('getWalletOverview', {})
      .then((res) => setBalance((res?.data ?? res)?.wallet?.balance ?? 0));
  }, [open, user]);

  if (!tournament) return null;

  const fee = tournament.entry_fee || 0;
  const shortOnCoins = balance !== null && balance < fee;

  const submit = async () => {
    setError('');
    if (!ign.trim() || !uid.trim()) {
      setError('Enter your Free Fire IGN and UID to join.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('joinTournament', {
        tournament_id: tournament.id,
        ff_ign: ign,
        ff_uid: uid,
      });
      const data = res?.data ?? res;
      if (data?.error) {
        setError(data.error);
      } else {
        toast({
          title: 'Slot booked',
          description: `You joined ${tournament.title}. Room details are in My Matches.`,
        });
        onJoined?.();
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not join this match.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-[28px] border-white/10 sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-lg">{tournament.title}</DialogTitle>
          <DialogDescription className="text-xs">
            {tournament.mode} · {tournament.map || 'TBA'} · entry{' '}
            {fee ? `${coins(fee)} coins` : 'free'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-ign" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Free Fire IGN
            </Label>
            <Input
              id="join-ign"
              value={ign}
              onChange={(event) => setIgn(event.target.value)}
              placeholder="Your in-game name"
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="join-uid" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Free Fire UID
            </Label>
            <Input
              id="join-uid"
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              placeholder="e.g. 123456789"
              inputMode="numeric"
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </div>

          <div className="glass-soft flex items-center justify-between rounded-2xl px-3.5 py-3">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5 text-primary" />
              Wallet balance
            </span>
            <span className="font-display text-sm font-semibold">
              {balance === null ? 'Loading…' : `${coins(balance)} coins`}
            </span>
          </div>

          {(error || shortOnCoins) && (
            <p className="text-xs text-destructive">
              {error || 'Not enough coins in your wallet for this entry fee.'}
            </p>
          )}

          <Button
            onClick={submit}
            disabled={submitting || shortOnCoins}
            className="h-12 w-full rounded-full font-display font-semibold"
          >
            {submitting
              ? 'Booking your slot…'
              : fee
                ? `Confirm & pay ${coins(fee)} coins`
                : 'Confirm my slot'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}