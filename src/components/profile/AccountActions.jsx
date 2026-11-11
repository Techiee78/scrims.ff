import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Trash2 } from 'lucide-react';
import { callFunction } from '@/lib/callFunction';
import { useAuth } from '@/lib/AuthContext';
import { withAuth } from '@/lib/authToken';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
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

export default function AccountActions({ user }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await callFunction('requestAccountDeletion', await withAuth({}));
      const data = res?.data ?? res;
      if (data?.error) {
        toast({ title: 'Could not submit request', description: data.error, variant: 'destructive' });
        setDeleting(false);
        return;
      }
      toast({ title: 'Deletion request sent', description: 'Our team will process it. Logging you out.' });
      setDeleteOpen(false);
      setTimeout(() => logout(), 600);
    } catch (err) {
      toast({ title: 'Could not submit request', description: err?.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="glass rounded-[26px] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Account
      </p>

      <div className="mt-3 space-y-2">
        {user?.role === 'admin' && (
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="h-11 w-full rounded-full border-white/10"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Admin panel
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => logout()}
          className="h-11 w-full rounded-full text-muted-foreground hover:text-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete account
        </button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="glass-strong rounded-[28px] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends a removal request to our team. Your data will be reviewed and permanently
              removed, and you'll be logged out immediately. This can't be undone.
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
    </section>
  );
}