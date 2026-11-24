import AdminMfaCard from '@/components/admin/AdminMfaCard';

export default function AdminSecurity() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-lg font-semibold">Security</h1>
        <p className="text-[11px] text-muted-foreground">
          Protect the admin panel with a second factor.
        </p>
      </div>

      <AdminMfaCard />

      <div className="glass-soft rounded-2xl px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        Every admin action is authorised on the server against your account's role and, once
        two-factor is on, a verified session. Role changes, coin adjustments, deposit approvals,
        withdrawals, tournaments and results are all recorded in the audit trail.
      </div>
    </div>
  );
}