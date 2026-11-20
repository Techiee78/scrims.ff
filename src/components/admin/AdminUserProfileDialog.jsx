import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { initials } from '@/lib/format';
import { callFunction } from '@/lib/callFunction';
import { withAuth } from '@/lib/authToken';
import AdminUserRecord from '@/components/admin/AdminUserRecord';

function Field({ label, value }) {
  return (
    <div className="glass-soft rounded-2xl px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

export default function AdminUserProfileDialog({ user, open, onOpenChange }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user?.id) return;
    setDetail(null);
    setLoading(true);
    (async () => {
      try {
        const res = await callFunction('manageUsers', await withAuth({ action: 'profile', user_id: user.id }));
        setDetail(res?.data ?? res);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user?.id]);

  if (!open || !user) return null;
  const profile = detail?.profile ?? user;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background px-4 pb-10 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="glass-soft flex h-11 w-11 items-center justify-center rounded-full"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-semibold">Player profile</p>
            <p className="text-sm text-muted-foreground">View only.</p>
          </div>
        </div>

        <section className="glass rounded-[26px] p-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-xl font-semibold text-primary-foreground">
              {initials(profile)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold">{profile.full_name || 'Player'}</p>
              <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <div className="mt-5">
            {loading || !detail ? (
              <div className="glass-soft h-[66px] animate-pulse rounded-2xl" />
            ) : (
              <AdminUserRecord registrations={detail.registrations} />
            )}
          </div>
        </section>

        <section className="glass rounded-[26px] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Player details
          </p>
          <div className="mt-3 grid gap-2">
            <Field label="Free Fire IGN" value={profile.ff_ign} />
            <Field label="Free Fire UID" value={profile.ff_uid} />
            <Field label="WhatsApp" value={profile.whatsapp} />
          </div>
        </section>
      </div>
    </div>
  );
}