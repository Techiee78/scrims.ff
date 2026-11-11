import { useAuth } from '@/lib/AuthContext';
import { initials } from '@/lib/format';
import PlayerStats from '@/components/profile/PlayerStats';
import PlayerDetailsForm from '@/components/profile/PlayerDetailsForm';
import TeammateRoster from '@/components/profile/TeammateRoster';
import AccountActions from '@/components/profile/AccountActions';
import SupportCard from '@/components/profile/SupportCard';
import PullToRefresh from '@/components/common/PullToRefresh';

export default function Profile() {
  const { user, refreshUser } = useAuth();

  return (
    <PullToRefresh onRefresh={refreshUser}>
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="font-display text-2xl font-semibold">Profile</h1>
        <p className="text-xs text-muted-foreground">
          Your player details, saved teammates and record.
        </p>
      </div>

      <section className="glass rounded-[26px] p-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-xl font-semibold text-primary-foreground">
            {initials(user)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold">
              {user?.full_name || 'Player'}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <PlayerStats user={user} />
      </section>

      <PlayerDetailsForm user={user} onSaved={refreshUser} />

      <TeammateRoster />

      <SupportCard />

      <AccountActions user={user} />
    </div>
    </PullToRefresh>
  );
}