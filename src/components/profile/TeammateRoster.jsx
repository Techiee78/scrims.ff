import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
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
import { withAuth } from '@/lib/authToken';
import TeammateFormDialog from './TeammateFormDialog';

const MAX_TEAMMATES = 5;

export default function TeammateRoster() {
  const { toast } = useToast();
  const [teammates, setTeammates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('manageTeammates', await withAuth({ action: 'list' }));
      const data = res?.data ?? res;
      if (data?.error) {
        setError(data.error);
        setTeammates([]);
        return;
      }
      setTeammates(data?.teammates ?? []);
    } catch (err) {
      setError(err?.message || "Couldn't load your teammates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await base44.functions.invoke(
        'manageTeammates',
        await withAuth({ action: 'delete', id: removeTarget.id })
      );
      const data = res?.data ?? res;
      if (data?.error) {
        toast({ title: 'Could not remove', description: data.error, variant: 'destructive' });
        return;
      }
      setTeammates((prev) => prev.filter((item) => item.id !== removeTarget.id));
      toast({ title: 'Teammate removed' });
    } catch (err) {
      toast({ title: 'Could not remove', description: err?.message, variant: 'destructive' });
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  };

  const full = teammates.length >= MAX_TEAMMATES;

  return (
    <section className="glass rounded-[26px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Saved teammates · {teammates.length}/{MAX_TEAMMATES}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {full
              ? `You have saved the maximum of ${MAX_TEAMMATES}. Remove one to add another.`
              : 'Add once, then pick them for any duo or squad match.'}
          </p>
        </div>
        <Button
          size="sm"
          disabled={full}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="shrink-0 rounded-full"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {loading && [0, 1].map((key) => (
          <div key={key} className="h-16 animate-pulse rounded-2xl bg-white/5" />
        ))}

        {!loading && error && (
          <div className="glass-soft flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3">
            <p className="text-xs text-destructive">{error}</p>
            <button type="button" onClick={load} className="text-[11px] font-semibold text-primary">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && teammates.length === 0 && (
          <div className="glass-soft flex items-center gap-2 rounded-2xl px-3.5 py-3 text-xs text-muted-foreground">
            <Users className="h-4 w-4" />
            No teammates saved yet.
          </div>
        )}

        {!loading && !error && teammates.map((mate) => (
          <div
            key={mate.id}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-[10px] font-semibold text-primary-foreground">
              {mate.ign.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{mate.ign}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                UID {mate.ff_uid} · {mate.whatsapp}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Edit teammate"
                onClick={() => {
                  setEditing(mate);
                  setFormOpen(true);
                }}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Remove teammate"
                onClick={() => setRemoveTarget(mate)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <TeammateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        teammate={editing}
        onSaved={load}
      />

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent className="glass-strong rounded-[28px] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Remove teammate?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.ign} will be removed from your saved teammates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="mt-0 flex-1 rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              disabled={removing}
              className="flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}