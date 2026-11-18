import { useEffect, useState } from 'react';
import { callFunction } from '@/lib/callFunction';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { withAuth } from '@/lib/authToken';

export default function TeammateFormDialog({
  open,
  onOpenChange,
  teammate,
  onOptimistic,
  onRollback,
  onSettled,
}) {
  const { toast } = useToast();
  const [ign, setIgn] = useState('');
  const [uid, setUid] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setIgn(teammate?.ign || '');
    setUid(teammate?.ff_uid || '');
    setWhatsapp(teammate?.whatsapp || '');
  }, [open, teammate]);

  const save = async () => {
    setError('');
    if (!ign.trim()) return setError('Teammate IGN is required.');
    if (!uid.trim()) return setError('Teammate Free Fire UID is required.');
    if (whatsapp.length !== 10) return setError('Enter a valid 10-digit WhatsApp number.');

    const previous = teammate || null;
    const draft = {
      id: previous?.id || `optimistic-${Date.now()}`,
      ign: ign.trim(),
      ff_uid: uid.trim(),
      whatsapp,
    };

    // Show it in the roster at once and close; a refusal rolls it back.
    onOptimistic?.(draft, previous);
    onOpenChange(false);
    setSaving(true);

    try {
      const payload = previous
        ? { action: 'update', id: previous.id, teammate: { ign: draft.ign, ff_uid: draft.ff_uid, whatsapp: draft.whatsapp } }
        : { action: 'create', teammate: { ign: draft.ign, ff_uid: draft.ff_uid, whatsapp: draft.whatsapp } };
      const res = await callFunction('manageTeammates', await withAuth(payload));
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      toast({ title: previous ? 'Teammate updated' : 'Teammate added' });
      onSettled?.(data?.teammate || null, draft.id);
    } catch (err) {
      onRollback?.(draft, previous);
      toast({
        title: previous ? 'Could not update teammate' : 'Could not add teammate',
        description: err?.response?.data?.error || err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-[28px] border-white/10 sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-lg">
            {teammate ? 'Edit teammate' : 'Add teammate'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Save once — pick them for any duo or squad match later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="mate-ign" className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Free Fire IGN
            </Label>
            <Input
              id="mate-ign"
              value={ign}
              onChange={(event) => setIgn(event.target.value)}
              placeholder="Teammate in-game name"
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mate-uid" className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Free Fire UID
              </Label>
              <Input
                id="mate-uid"
                value={uid}
                onChange={(event) => setUid(event.target.value)}
                placeholder="123456789"
                inputMode="numeric"
                className="glass-soft h-11 rounded-2xl border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mate-whatsapp" className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                WhatsApp
              </Label>
              <Input
                id="mate-whatsapp"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                inputMode="tel"
                maxLength={10}
                className="glass-soft h-11 rounded-2xl border-white/10"
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            onClick={save}
            disabled={saving}
            className="h-11 w-full rounded-full font-display font-semibold"
          >
            {saving ? 'Saving…' : teammate ? 'Save changes' : 'Add teammate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}