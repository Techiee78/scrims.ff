import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function PlayerDetailsForm({ user, onSaved }) {
  const { toast } = useToast();
  const [ign, setIgn] = useState('');
  const [uid, setUid] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIgn(user?.ff_ign || '');
    setUid(user?.ff_uid || '');
    setWhatsapp(user?.whatsapp || '');
  }, [user?.ff_ign, user?.ff_uid, user?.whatsapp]);

  const save = async () => {
    setError('');
    if (!ign.trim()) return setError('Free Fire IGN cannot be left empty once saved.');
    if (!uid.trim()) return setError('Free Fire UID cannot be left empty once saved.');
    if (whatsapp.replace(/\D/g, '').length < 10) {
      return setError('Enter a valid 10-digit WhatsApp number.');
    }
    setSaving(true);
    try {
      const supa = await getSupabase();
      const { data: { session } } = await supa.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Not signed in');

      const { error: updateError } = await supa
        .from('profiles')
        .update({
          ff_ign: ign.trim(),
          ff_uid: uid.trim(),
          whatsapp: whatsapp.replace(/\D/g, ''),
        })
        .eq('id', userId);
      if (updateError) throw updateError;

      await onSaved?.();
      toast({ title: 'Details saved' });
    } catch (err) {
      toast({ title: 'Could not save', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass rounded-[26px] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Your player details
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        We prefill these when you join a match. Once saved you can change them, but not leave them
        empty.
      </p>

      <div className="mt-3 space-y-3">
        <div className="space-y-2">
          <Label htmlFor="profile-ign" className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Free Fire IGN
          </Label>
          <Input
            id="profile-ign"
            value={ign}
            onChange={(event) => setIgn(event.target.value)}
            placeholder="Your in-game name"
            className="glass-soft h-11 rounded-2xl border-white/10"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="profile-uid" className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Free Fire UID
            </Label>
            <Input
              id="profile-uid"
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              placeholder="123456789"
              inputMode="numeric"
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-whatsapp" className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              WhatsApp
            </Label>
            <Input
              id="profile-whatsapp"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              placeholder="10-digit number"
              inputMode="tel"
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <Button
        onClick={save}
        disabled={saving}
        className="mt-4 h-11 w-full rounded-full font-display font-semibold"
      >
        {saving ? 'Saving…' : 'Save details'}
      </Button>
    </section>
  );
}