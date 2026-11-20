import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { coins as formatCoins } from '@/lib/format';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium">{value || '—'}</span>
    </div>
  );
}

export default function AdminUserProfileDialog({ user, balance, open, onOpenChange }) {
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-sm rounded-[26px] border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display">{user?.full_name || user?.email || 'User'}</DialogTitle>
          <DialogDescription className="text-xs">Player profile (view only)</DialogDescription>
        </DialogHeader>
        <div className="glass-soft rounded-2xl px-3.5">
          <Row label="Email" value={user?.email} />
          <Row label="Free Fire IGN" value={user?.ff_ign} />
          <Row label="Free Fire UID" value={user?.ff_uid} />
          <Row label="WhatsApp" value={user?.whatsapp} />
          <Row label="Role" value={user?.role === 'admin' ? 'Admin' : 'User'} />
          <Row label="Wallet" value={`${formatCoins(balance ?? 0)} coins`} />
          <Row label="Joined" value={joined} />
        </div>
      </DialogContent>
    </Dialog>
  );
}