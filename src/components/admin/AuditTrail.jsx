import { format } from 'date-fns';
import { History } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';

const LABELS = {
  'deposit.approve': 'Approved deposit',
  'deposit.reject': 'Rejected deposit',
  'settings.update': 'Updated UPI settings',
  'withdrawal.approve': 'Approved withdrawal',
  'withdrawal.reject': 'Rejected withdrawal',
};

export default function AuditTrail({ entries = [] }) {
  if (entries.length === 0) {
    return (
      <div className="glass rounded-[24px] px-5 py-8 text-center text-xs text-muted-foreground">
        No admin actions logged yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const when = entry.created_at ? format(new Date(entry.created_at), 'd MMM · h:mm a') : '';
        const coins = entry.details?.coins;
        return (
          <div key={entry.id} className="glass-soft flex items-start gap-3 rounded-[20px] px-3.5 py-2.5">
            <span className="glass-soft mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
              <History className="h-3.5 w-3.5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{LABELS[entry.action] || entry.action}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {entry.actor_email}
                {entry.target_email ? ` · ${entry.target_email}` : ''}
                {coins ? ` · ${formatCoins(coins)} coins` : ''}
              </p>
              {entry.details?.reason && (
                <p className="text-[10px] text-muted-foreground">Reason: {entry.details.reason}</p>
              )}
            </div>
            <p className="shrink-0 text-[10px] text-muted-foreground">{when}</p>
          </div>
        );
      })}
    </div>
  );
}