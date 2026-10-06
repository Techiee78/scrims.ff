import { useEffect, useState } from 'react';
import { LayoutDashboard, LogOut, Trash2, User as UserIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initials } from '@/lib/format';
import PlayerStats from '@/components/profile/PlayerStats';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

export default function ProfileSheet({ open, onOpenChange, user, onSaved }) {
  const [ign, setIgn] = useState('');
  const [uid, setUid] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser, logout } = useAuth();

  useEffect(() => {
    if (!open) return;
    setIgn(user?.ff_ign || '');
    setUid(user?.ff_uid || '');
  }, [open, user]);

  const save = async () => {
    setSaving(true);
    try {
      const supa = await getSupabase();
      const { data: { session } } = await supa.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Not signed in');
      const cleanIgn = ign.trim();
      const cleanUid = uid.trim();
      const { error: updateError } = await supa
        .from('profiles')
        .update({ ff_ign: cleanIgn, ff_uid: cleanUid })
        .eq('id', userId);
      if (updateError) throw updateError;
      await refreshUser();
    } catch (err) {
      toast({ title: 'Could not save', description: err?.message, variant: 'destructive' });
      setSaving(false);
      return;
    }
    setSaving(false);
    onOpenChange(false);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await base44.functions.invoke('requestAccountDeletion');
      const data = res?.data ?? res;
      if (data?.error) {
        toast({ title: 'Could not submit request', description: data.error, variant: 'destructive' });
        setDeleting(false);
        return;
      }
      toast({ title: 'Deletion request sent', description: 'Our team will process it. Logging you out.' });
      setDeleteOpen(false);
      onOpenChange(false);
      setTimeout(() => logout(), 600);
    } catch (err) {
      toast({ title: 'Could not submit request', description: err?.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[28px] border-white/10 px-5 pb-8 pt-6"
      >
        <SheetHeader className="px-0 text-left">
          <SheetTitle className="sr-only">Profile</SheetTitle>
          <SheetDescription className="sr-only">
            Your Scrims.ff player profile
          </SheetDescription>
        </SheetHeader>

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

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ff-ign" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Free Fire IGN
            </Label>
            <Input
              id="ff-ign"
              value={ign}
              onChange={(event) => setIgn(event.target.value)}
              placeholder="Your in-game name"
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ff-uid" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Free Fire UID
            </Label>
            <Input
              id="ff-uid"
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              placeholder="e.g. 123456789"
              inputMode="numeric"
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button
            onClick={save}
            disabled={saving}
            className="h-11 flex-1 rounded-full font-display font-semibold"
          >
            {saving ? 'Saving…' : 'Save details'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => logout()}
            className="h-11 rounded-full text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>

        {!user?.ff_ign && (
          <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <UserIcon className="h-3.5 w-3.5" />
            Add your IGN and UID once — we'll prefill them when you join a match.
          </p>
        )}

        {user?.role === 'admin' && (
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              navigate('/admin');
            }}
            className="mt-4 h-11 w-full rounded-full border-white/10"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Admin panel
          </Button>
        )}

        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete account
        </button>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="glass-strong rounded-[28px] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Delete account?</AlertDialogTitle>
              <AlertDialogDescription>
                This sends a removal request to our team. Your data will be reviewed and permanently removed, and you'll be logged out immediately. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-2">
              <AlertDialogCancel className="mt-0 flex-1 rounded-full">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteAccount}
                disabled={deleting}
                className="flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Sending…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}