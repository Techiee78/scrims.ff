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
import { slotCapacity } from '@/lib/slots';
import { withAuth } from '@/lib/authToken';
import { isoToIstInput, istInputToIso } from '@/lib/format';
import { CalendarClock } from 'lucide-react';
import FormSelect from '@/components/admin/FormSelect';
import InputShell from '@/components/common/InputShell';

const blank = {
  title: '',
  mode: 'Full Map',
  team_type: 'Solo',
  map: '',
  entry_fee: 0,
  prize_pool: 0,
  prize_1st: 0,
  prize_2nd: 0,
  prize_3rd: 0,
  per_kill: 0,
  match_time: '',
  banner_url: '',
  room_id: '',
  room_password: '',
  featured: false,
  status: 'upcoming',
};

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-tight text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

const triggerClass = 'glass-soft h-11 w-full rounded-2xl border-white/10 px-3 text-sm';

export default function TournamentFormDialog({ open, onOpenChange, tournament, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (tournament) {
      setForm({
        ...blank,
        ...tournament,
        match_time: isoToIstInput(tournament.match_time),
      });
    } else {
      setForm(blank);
    }
  }, [open, tournament]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const capacity = slotCapacity(form.mode, form.team_type);
  const pool = Number(form.prize_pool) || 0;
  const splitTotal =
    (Number(form.prize_1st) || 0) + (Number(form.prize_2nd) || 0) + (Number(form.prize_3rd) || 0);
  const splitOver = splitTotal > pool;
  const leftForKills = Math.max(0, pool - splitTotal);

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        mode: form.mode,
        team_type: form.team_type,
        map: form.map,
        entry_fee: Number(form.entry_fee) || 0,
        prize_pool: Number(form.prize_pool) || 0,
        prize_1st: Number(form.prize_1st) || 0,
        prize_2nd: Number(form.prize_2nd) || 0,
        prize_3rd: Number(form.prize_3rd) || 0,
        per_kill: Number(form.per_kill) || 0,
        match_time: istInputToIso(form.match_time),
        total_slots: capacity,
        banner_url: form.banner_url,
        room_id: form.room_id,
        room_password: form.room_password,
        featured: form.featured,
        status: form.status,
      };
      const body = tournament
        ? { action: 'update', tournament_id: tournament.id, data: payload }
        : { action: 'create', data: payload };
      const res = await callFunction('manageTournament', await withAuth(body));
      const data = res?.data ?? res;
      if (data?.error) {
        toast({ title: 'Could not save', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: tournament ? 'Tournament updated' : 'Tournament created' });
      onSaved?.();
    } catch (err) {
      toast({
        title: 'Could not save',
        description: err?.response?.data?.error || err?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-[28px] border-white/10 sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-lg">
            {tournament ? 'Edit tournament' : 'New tournament'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Set up match details, rewards and room credentials.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="e.g. Bermuda Showdown #43"
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mode">
              <FormSelect
                value={form.mode}
                onChange={(value) => set('mode', value)}
                options={[
                  { value: 'Full Map', label: 'Full Map' },
                  { value: 'CS', label: 'CS' },
                ]}
                className={triggerClass}
              />
            </Field>
            <Field label="Team type">
              <FormSelect
                value={form.team_type}
                onChange={(value) => set('team_type', value)}
                options={[
                  { value: 'Solo', label: 'Solo' },
                  { value: 'Duo', label: 'Duo' },
                  { value: 'Squad', label: 'Squad' },
                ]}
                className={triggerClass}
              />
            </Field>
          </div>

          <Field label="Map">
            <Input
              value={form.map}
              onChange={(event) => set('map', event.target.value)}
              placeholder="e.g. Bermuda"
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </Field>

          <Field label="Match time (IST)">
            <InputShell>
              <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                type="datetime-local"
                aria-label="Match time in IST"
                value={form.match_time}
                onChange={(event) => set('match_time', event.target.value)}
                className="h-full w-full border-0 bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </InputShell>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry fee">
              <Input
                type="number" inputMode="numeric" min={0}
                value={form.entry_fee}
                onChange={(event) => set('entry_fee', event.target.value)}
                className="glass-soft h-11 rounded-2xl border-white/10"
              />
            </Field>
            <Field label="Prize pool (total)">
              <Input
                type="number" inputMode="numeric" min={0}
                value={form.prize_pool}
                onChange={(event) => set('prize_pool', event.target.value)}
                className="glass-soft h-11 rounded-2xl border-white/10"
              />
            </Field>
          </div>

          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-3">
              <Field label="1st prize">
                <Input
                  type="number" inputMode="numeric" min={0}
                  value={form.prize_1st}
                  onChange={(event) => set('prize_1st', event.target.value)}
                  className="glass-soft h-11 rounded-2xl border-white/10"
                />
              </Field>
              <Field label="2nd prize">
                <Input
                  type="number" inputMode="numeric" min={0}
                  value={form.prize_2nd}
                  onChange={(event) => set('prize_2nd', event.target.value)}
                  className="glass-soft h-11 rounded-2xl border-white/10"
                />
              </Field>
              <Field label="3rd prize">
                <Input
                  type="number" inputMode="numeric" min={0}
                  value={form.prize_3rd}
                  onChange={(event) => set('prize_3rd', event.target.value)}
                  className="glass-soft h-11 rounded-2xl border-white/10"
                />
              </Field>
            </div>
            <p
              className={`text-xs ${splitOver ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {splitOver
                ? `1st + 2nd + 3rd (${splitTotal}) is more than the ${pool} coin prize pool.`
                : `${splitTotal} of ${pool} coins goes to the podium · ${leftForKills} left for per-kill rewards.`}
            </p>
          </div>

          <Field label="Per kill (paid from prize pool)">
            <Input
              type="number" inputMode="numeric" min={0}
              value={form.per_kill}
              onChange={(event) => set('per_kill', event.target.value)}
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </Field>

          <Field label="Banner URL">
            <Input
              value={form.banner_url}
              onChange={(event) => set('banner_url', event.target.value)}
              placeholder="https://…"
              className="glass-soft h-11 rounded-2xl border-white/10"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Room ID">
              <Input
                value={form.room_id}
                onChange={(event) => set('room_id', event.target.value)}
                className="glass-soft h-11 rounded-2xl border-white/10"
              />
            </Field>
            <Field label="Room password">
              <Input
                value={form.room_password}
                onChange={(event) => set('room_password', event.target.value)}
                className="glass-soft h-11 rounded-2xl border-white/10"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <FormSelect
                value={form.status}
                onChange={(value) => set('status', value)}
                options={[
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'completed', label: 'Completed' },
                ]}
                className={triggerClass}
              />
              <p className="text-xs text-muted-foreground">
                Live is automatic once the match time is reached.
              </p>
            </Field>
            <Field label={`Slots (auto: ${capacity})`}>
              <div className="glass-soft flex h-11 items-center rounded-2xl border-white/10 px-3 text-sm text-muted-foreground">
                {capacity} for {form.mode} · {form.team_type}
              </div>
            </Field>
          </div>

          <label className="glass-soft flex items-center justify-between rounded-2xl px-3 py-2.5">
            <span className="text-xs font-medium">Feature on home</span>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => set('featured', event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="h-11 w-full rounded-full font-display font-semibold"
        >
          {saving ? 'Saving…' : tournament ? 'Save changes' : 'Create tournament'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}