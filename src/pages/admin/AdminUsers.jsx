import { useEffect, useState, useCallback } from 'react';
import { Shield, ShieldOff, Search, Users as UsersIcon, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function initials(name, email) {
  const base = (name || email || '?').trim();
  if (!base) return '?';
  const parts = base.split(/[\s@._]+/).filter(Boolean);
  return (parts[0]?.[0] || '').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('manageUsers', { action: 'list' });
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      setUsers(data?.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleRole = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    setUpdatingId(u.id);
    try {
      const res = await base44.functions.invoke('manageUsers', {
        action: 'update',
        user_id: u.id,
        role: newRole,
      });
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    } catch (err) {
      setError(err.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.ff_ign || '').toLowerCase().includes(q)
    );
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-lg font-semibold">Users</h1>
        <p className="text-[11px] text-muted-foreground">
          {users.length} total · {adminCount} admin{adminCount === 1 ? '' : 's'} · promote or demote from here.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or IGN"
          className="pl-10 h-11"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-soft rounded-2xl px-4 py-8 text-center text-xs text-muted-foreground">
          <UsersIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
          No users found.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const isAdmin = u.role === 'admin';
            const isSelf = u.id === currentUser?.id;
            return (
              <div
                key={u.id}
                className="glass-soft flex items-center gap-3 rounded-2xl px-3.5 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {initials(u.full_name, u.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {u.full_name || u.email?.split('@')[0] || 'Unknown'}
                    {isSelf && (
                      <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                  {u.ff_ign && (
                    <p className="truncate text-[10px] text-muted-foreground">IGN: {u.ff_ign}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isAdmin
                        ? 'bg-primary/20 text-primary'
                        : 'bg-white/8 text-muted-foreground'
                    }`}
                  >
                    {isAdmin ? 'ADMIN' : 'USER'}
                  </span>
                  <Button
                    size="sm"
                    variant={isAdmin ? 'outline' : 'default'}
                    disabled={isSelf || updatingId === u.id}
                    onClick={() => toggleRole(u)}
                    className="h-7 rounded-full px-2.5 text-[11px]"
                  >
                    {updatingId === u.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isAdmin ? (
                      <>
                        <ShieldOff className="w-3 h-3 mr-1" />
                        Demote
                      </>
                    ) : (
                      <>
                        <Shield className="w-3 h-3 mr-1" />
                        Make admin
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}