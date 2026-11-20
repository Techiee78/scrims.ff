import { useState } from 'react';
import { Check, Coins, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JoinDialog from '@/components/tournaments/JoinDialog';
import { coins } from '@/lib/format';
import { slotCapacity } from '@/lib/slots';
import { getTimeStatus } from '@/lib/tournamentTime';

const Note = ({ icon: Icon, tone = 'muted', children }) => (
  <div
    className={`glass-soft flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-medium ${
      tone === 'bad' ? 'text-destructive' : tone === 'good' ? 'text-accent' : 'text-muted-foreground'
    }`}
  >
    <Icon className="h-4 w-4" />
    {children}
  </div>
);

export default function MatchJoinBar({ tournament, user, joined, onOptimistic, onRollback, onSettled }) {
  const [open, setOpen] = useState(false);
  const capacity = slotCapacity(tournament.mode, tournament.team_type);
  const full = (tournament.filled_slots || 0) >= capacity;
  const status = getTimeStatus(tournament);
  const fee = Number(tournament.entry_fee || 0);

  if (joined) return <Note icon={Check} tone="good">Slot booked — room details are in My Matches</Note>;
  if (status === 'live') return <Note icon={Zap} tone="bad">Match is live — entry closed</Note>;
  if (status === 'completed') return <Note icon={Lock}>Entry closed — match completed</Note>;
  if (full) return <Note icon={Lock}>All slots are full</Note>;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-12 w-full rounded-full font-display font-semibold"
      >
        <Coins className="h-4 w-4" />
        {fee ? `Join · ${coins(fee)} coins` : 'Join free'}
      </Button>
      <JoinDialog
        tournament={tournament}
        open={open}
        onOpenChange={setOpen}
        user={user}
        onOptimistic={onOptimistic}
        onRollback={onRollback}
        onSettled={onSettled}
      />
    </>
  );
}