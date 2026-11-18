import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { callFunction } from '@/lib/callFunction';
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
      const res = await callFunction('manageTeammates', await withAuth({ action: 'list' }));
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

  // Optimistic roster changes: apply now, undo only if the server refuses.
  const applyTeammate = (next, previous) =>
    setTeammates((prev) =>
      previous
        ? prev.map((item) => (item.id === previous.id ? { ...next, id: previous.id } : item))
        : [...prev, next]
    );

  const undoTeammate = (next, previous) =>
    setTeammates((prev) =>
      previous
        ? prev.map((item) => (item.id === previous.id ? previous : item))
        : prev.filter((item) => item.id !== next.id)
    );

  // Swap the temporary row for the one the server saved.
  const settleTeammate = (saved, optimisticId) =>
    setTeammates((prev) =>
      prev.map((item) => (item.id === optimisticId && saved ? saved : item))
    );

  const remove = async () => {
    if (!removeTarget) return;
    const target = removeTarget;

    // Gone from the list at once; restored below if the server says no.
    setTeammates((prev) => prev.filter((item) => item.id !== target.id));
    setRemoveTarget(null);
    setRemoving(true);

    try {
      const res = await callFunction(
        'manageTeammates',
        await withAuth({ action: 'delete', id: target.id })
      );
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Teammate removed' });
    } catch (err) {
      setTeammates((prev) =>
        [...prev, target].sort(
          (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
        )
      );
      toast({
        title: 'Could not remove',
        description: err?.message,
        variant: 'destructive',
      });
    } finally {
      setRemoving(false);
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
          <p className="mt-1 text-sm text-muted-foreground">
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
            <button
              type="button"
              onClick={load}
              className="tap-target flex h-11 items-center px-2 text-sm font-semibold text-primary"
            >
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
              <p className="truncate text-sm font-semibold">{mate.ign}</p>
              <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
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
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Remove teammate"
                onClick={() => setRemoveTarget(mate)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <TeammateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        teammate={editing}
        onOptimistic={applyTeammate}
        onRollback={undoTeammate}
        onSettled={settleTeammate}
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