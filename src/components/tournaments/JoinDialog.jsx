import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Coins, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { coins } from '@/lib/format';
import { withAuth } from '@/lib/authToken';
import { cn } from '@/lib/utils';
import { missingProfileFields } from '@/lib/profile';

const digits = (value) => String(value || '').replace(/\D/g, '');

function teamSizeOf(teamType) {
  if (teamType === 'Duo') return 2;
  if (teamType === 'Squad') return 4;
  return 1;
}

export default function JoinDialog({ tournament, open, onOpenChange, user, onJoined }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ign, setIgn] = useState('');
  const [uid, setUid] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [roster, setRoster] = useState([]);
  const [picked, setPicked] = useState([]);
  const [balance, setBalance] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const teamSize = teamSizeOf(tournament?.team_type);
  const needed = Math.max(0, teamSize - 1);

  useEffect(() => {
    if (!open || !tournament || !user) return;
    const missing = missingProfileFields(user);
    if (missing.length > 0) {
      onOpenChange(false);
      toast({
        title: 'Complete your profile first',
        description: `Add ${missing.join(', ')} in your profile to join a match.`,
      });
      navigate('/profile');
      return;
    }
    setError('');
    setIgn(user.ff_ign || '');
    setUid(user.ff_uid || '');
    setWhatsapp(user.whatsapp || '');
    setPicked([]);
    setRoster([]);
    setBalance(null);
    (async () => {
      const [walletRes, rosterRes] = await Promise.all([
        base44.functions.invoke('getWalletOverview', await withAuth({})),
        base44.functions.invoke('manageTeammates', await withAuth({ action: 'list' })),
      ]);
      setBalance((walletRes?.data ?? walletRes)?.wallet?.balance ?? 0);
      setRoster((rosterRes?.data ?? rosterRes)?.teammates ?? []);
    })();
  }, [open, tournament, user]);

  if (!tournament) return null;

  const fee = tournament.entry_fee || 0;
  const shortOnCoins = balance !== null && balance < fee;
  const notEnoughSaved = needed > 0 && roster.length < needed;

  const toggle = (id) => {
    setError('');
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= needed) return prev;
      return [...prev, id];
    });
  };

  const submit = async () => {
    setError('');
    if (!ign.trim()) return setError('Enter your Free Fire IGN.');
    if (!uid.trim()) return setError('Enter your Free Fire UID.');
    if (digits(whatsapp).length < 10) return setError('Enter your WhatsApp number.');
    if (needed > 0 && picked.length !== needed) {
      return setError(
        `Pick ${needed} teammate${needed > 1 ? 's' : ''} saved in your profile for this ${tournament.team_type} match.`
      );
    }

    const teammates = picked.map((id) => {
      const mate = roster.find((item) => item.id === id);
      return {
        teammate_id: mate.id,
        ign: mate.ign,
        whatsapp: mate.whatsapp,
        ff_uid: mate.ff_uid,
      };
    });

    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('joinTournament', await withAuth({
        tournament_id: tournament.id,
        ff_ign: ign,
        ff_uid: uid,
        whatsapp,
        teammates,
      }));
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
      <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto rounded-[28px] border-white/10 sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-lg">{tournament.title}</DialogTitle>
          <DialogDescription className="text-xs">
            {tournament.mode} · {tournament.map || 'TBA'} · entry{' '}
            {fee ? `${coins(fee)} coins` : 'free'} · one slot per player
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Your details
            </p>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate('/profile');
              }}
              className="text-[11px] font-semibold text-primary"
            >
              Edit in profile
            </button>
          </div>

          <div className="glass-soft space-y-1.5 rounded-2xl px-3.5 py-3">
            {[
              ['Free Fire IGN', ign],
              ['Free Fire UID', uid],
              ['WhatsApp', whatsapp],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="truncate font-semibold">{value}</span>
              </div>
            ))}
          </div>

          {needed > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Teammates · {picked.length}/{needed}
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/profile');
                  }}
                  className="text-[11px] font-semibold text-primary"
                >
                  Manage teammates
                </button>
              </div>

              {roster.length === 0 ? (
                <p className="glass-soft rounded-2xl px-3.5 py-3 text-xs text-muted-foreground">
                  No saved teammates yet. Add their IGN, UID and WhatsApp once from your profile,
                  then pick them here for any match.
                </p>
              ) : (
                <div className="space-y-2">
                  {roster.map((mate) => {
                    const active = picked.includes(mate.id);
                    return (
                      <button
                        key={mate.id}
                        type="button"
                        onClick={() => toggle(mate.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                          active
                            ? 'border-primary/60 bg-primary/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                            active ? 'border-primary bg-primary text-primary-foreground' : 'border-white/20'
                          )}
                        >
                          {active && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">{mate.ign}</span>
                          <span className="block truncate text-[10px] text-muted-foreground">
                            UID {mate.ff_uid} · {mate.whatsapp}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {notEnoughSaved && roster.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  A {tournament.team_type} match needs {needed} saved teammate
                  {needed > 1 ? 's' : ''}.
                </p>
              )}
            </div>
          )}

          {needed === 0 && (
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Solo match — only your own slot is booked.
            </p>
          )}

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
            disabled={submitting || shortOnCoins || notEnoughSaved}
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