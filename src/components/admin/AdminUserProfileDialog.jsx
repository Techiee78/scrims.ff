import { X } from 'lucide-react';
import { coins as formatCoins } from '@/lib/format';
import { Button } from '@/components/ui/button';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium">{value || '—'}</span>
    </div>
  );
}

export default function AdminUserProfileDialog({ user, balance, open, onOpenChange }) {
  if (!open || !user) return null;
  const joined = user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold truncate">{user.full_name || user.email || 'User'}</p>
          <p className="text-xs text-muted-foreground">Player profile (view only)</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          aria-label="Close profile"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="mx-auto w-full max-w-xl px-4 py-6">
        <div className="glass rounded-[26px] px-4">
          <Row label="Email" value={user.email} />
          <Row label="Free Fire IGN" value={user.ff_ign} />
          <Row label="Free Fire UID" value={user.ff_uid} />
          <Row label="WhatsApp" value={user.whatsapp} />
          <Row label="Role" value={user.role === 'admin' ? 'Admin' : 'User'} />
          <Row label="Wallet" value={`${formatCoins(balance ?? 0)} coins`} />
          <Row label="Joined" value={joined} />
        </div>
      </div>
    </div>
  );
}