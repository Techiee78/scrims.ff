import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';
import DepositStatusPill from '@/components/wallet/DepositStatusPill';

function when(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, 'd MMM · h:mm a');
}

export default function WithdrawalRequestCard({ request, onDecide }) {
  const [mode, setMode] = useState('idle');
  const [reason, setReason] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const player = request.player || {};
  const decided = request.status !== 'pending';

  const run = async (action) => {
    setBusy(action);
    setError('');
    try {
      await onDecide(request.id, action, { reason: reason.trim(), payoutRef: payoutRef.trim() });
      setMode('idle');
      setReason('');
      setPayoutRef('');
    } catch (err) {
      setError(err.message || 'The decision could not be saved.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="glass space-y-2 rounded-[22px] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {player.full_name || request.user_email?.split('@')[0] || 'Player'}
            {player.ff_ign ? (
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">IGN {player.ff_ign}</span>
            ) : null}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{request.user_email}</p>
        </div>
        <DepositStatusPill status={request.status} />
      </div>

      <div className="rounded-2xl bg-white/[0.03] px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-semibold">
            ₹{formatCoins(request.coins)}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              {formatCoins(request.coins)} coins
            </span>
          </p>
          <p className="text-right text-[10px] text-muted-foreground">{when(request.created_at)}</p>
        </div>
        <p className="mt-1 break-all font-mono text-[10px] text-foreground/80">
          {request.payout_upi} · {request.account_name}
        </p>
      </div>

      {request.player_note && (
        <p className="text-[10px] text-muted-foreground">Note: {request.player_note}</p>
      )}

      {decided ? (
        <p className="text-[10px] text-muted-foreground">
          {request.decision?.admin_email ? `By ${request.decision.admin_email} · ` : ''}
          {when(request.decision?.created_at)}
          {request.decision?.payout_ref ? ` · paid ref ${request.decision.payout_ref}` : ''}
          {request.decision?.reason ? ` · ${request.decision.reason}` : ''}
          {request.decision?.balance_after != null
            ? ` · balance ${formatCoins(request.decision.balance_after)}`
            : ''}
        </p>
      ) : mode === 'idle' ? (
        <div className="flex gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setMode('approve')}
            disabled={busy !== ''}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-[11px] font-semibold text-primary-foreground disabled:opacity-40"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => setMode('reject')}
            disabled={busy !== ''}
            className="glass-soft flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[11px] font-medium text-muted-foreground disabled:opacity-40"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {mode === 'approve' ? (
            <>
              <p className="text-[10px] text-muted-foreground">
                Pay ₹{formatCoins(request.coins)} to {request.payout_upi} first, then approve.
              </p>
              <input
                type="text"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                placeholder="Payout UTR / reference (optional)"
                className="h-9 w-full rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] uppercase outline-none focus:border-primary/60"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => run('approve')}
                  disabled={busy !== ''}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-[11px] font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Confirm approve
                </button>
                <button
                  type="button"
                  onClick={() => setMode('idle')}
                  disabled={busy !== ''}
                  className="glass-soft h-9 flex-1 rounded-full text-[11px] font-medium text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (shown to the player)"
                className="h-9 w-full rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] outline-none focus:border-destructive/60"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => run('reject')}
                  disabled={busy !== '' || reason.trim().length < 3}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-destructive text-[11px] font-semibold text-destructive-foreground disabled:opacity-40"
                >
                  {busy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Confirm reject
                </button>
                <button
                  type="button"
                  onClick={() => setMode('idle')}
                  disabled={busy !== ''}
                  className="glass-soft h-9 flex-1 rounded-full text-[11px] font-medium text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}