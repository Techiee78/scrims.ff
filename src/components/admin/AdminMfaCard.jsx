import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { getSupabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const digitsOnly = (value) => String(value || '').replace(/\D/g, '').slice(0, 6);

// Admin two-factor (native Supabase TOTP).
//
// The server gates in the admin Edge Functions require an aal2 session once a
// factor is enrolled, so this card is what makes that protection real. It also
// covers the step-up case: after a normal password sign-in the session is aal1,
// so an admin with a factor enrolled verifies here to unlock admin actions
// instead of being locked out.
export default function AdminMfaCard() {
  const [loading, setLoading] = useState(true);
  const [aal, setAal] = useState('aal1');
  const [factor, setFactor] = useState(null);
  const [mode, setMode] = useState('idle'); // idle | setup | verify | disable
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const supa = await getSupabase();
      const [{ data: list }, { data: levels }] = await Promise.all([
        supa.auth.mfa.listFactors(),
        supa.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      const verified = (list?.totp || []).find((f) => f.status === 'verified') || null;
      setFactor(verified);
      setAal(levels?.currentLevel || 'aal1');
    } catch (err) {
      setError(err?.message || 'Could not read your two-factor settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startSetup = async () => {
    setBusy(true);
    setError('');
    setCode('');
    try {
      const supa = await getSupabase();
      // Clear abandoned, never-verified attempts so the account never carries
      // more than one authenticator.
      const { data: list } = await supa.auth.mfa.listFactors();
      const stale = (list?.totp || []).filter((f) => f.status !== 'verified');
      for (const f of stale) await supa.auth.mfa.unenroll({ factorId: f.id });

      const { data, error: enrollError } = await supa.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Scrims.ff admin',
      });
      if (enrollError) throw enrollError;

      setEnrollment({
        factorId: data.id,
        qr: data.totp?.qr_code || '',
        secret: data.totp?.secret || '',
      });
      setMode('setup');
    } catch (err) {
      setError(err?.message || 'Could not start two-factor setup.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    const pendingId = enrollment?.factorId;
    setMode('idle');
    setEnrollment(null);
    setCode('');
    setError('');
    if (pendingId) {
      try {
        const supa = await getSupabase();
        await supa.auth.mfa.unenroll({ factorId: pendingId });
      } catch {
        // Abandoned factors are cleared on the next setup attempt.
      }
    }
  };

  const submitCode = async () => {
    const factorId = mode === 'setup' ? enrollment?.factorId : factor?.id;
    if (!factorId) return;
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const supa = await getSupabase();
      const { data: challenge, error: challengeError } = await supa.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supa.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      if (mode === 'disable') {
        const { error: offError } = await supa.auth.mfa.unenroll({ factorId });
        if (offError) throw offError;
      }

      setCode('');
      setEnrollment(null);
      setMode('idle');
      await load();
    } catch (err) {
      setError(err?.message || 'That code did not work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const status = !factor ? 'off' : aal === 'aal2' ? 'on' : 'locked';

  const pill =
    status === 'on'
      ? { label: 'On', className: 'bg-primary/20 text-primary' }
      : status === 'locked'
        ? { label: 'Verify', className: 'bg-amber-400/15 text-amber-300' }
        : { label: 'Off', className: 'bg-white/8 text-muted-foreground' };

  return (
    <section className="glass rounded-[26px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold">Two-factor authentication</p>
            <p className="text-[11px] text-muted-foreground">Authenticator app (TOTP)</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${pill.className}`}
        >
          {pill.label}
        </span>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your settings…
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {/* Off — nothing enrolled yet */}
          {mode === 'idle' && !factor && (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Add a code from Google Authenticator, Authy or any TOTP app. Once it is on, coin
                adjustments, role changes, approvals, tournaments and results all require it.
              </p>
              <Button
                onClick={startSetup}
                disabled={busy}
                className="h-11 w-full rounded-full font-display font-semibold"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set up two-factor'}
              </Button>
            </>
          )}

          {/* Setup — scan then confirm */}
          {mode === 'setup' && enrollment && (
            <>
              <p className="text-xs text-muted-foreground">
                Scan this code with your authenticator app, then enter the 6-digit code it shows.
              </p>
              {enrollment.qr && (
                <div className="flex justify-center rounded-2xl bg-white p-3">
                  <img src={enrollment.qr} alt="Authenticator setup QR code" className="h-40 w-40" />
                </div>
              )}
              {enrollment.secret && (
                <div className="glass-soft rounded-2xl px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Can't scan? Enter this key
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">{enrollment.secret}</p>
                </div>
              )}
              <CodeField code={code} setCode={setCode} id="mfa-setup-code" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={cancel}
                  disabled={busy}
                  className="h-11 flex-1 rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitCode}
                  disabled={busy}
                  className="h-11 flex-1 rounded-full font-display font-semibold"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Turn on'}
                </Button>
              </div>
            </>
          )}

          {/* Enrolled but this session is password-only — step up */}
          {mode === 'idle' && factor && aal !== 'aal2' && (
            <>
              <div className="rounded-2xl bg-amber-400/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-200">
                Two-factor is on for this account. Verify now to unlock admin actions for this
                session.
              </div>
              <CodeField code={code} setCode={setCode} id="mfa-verify-code" />
              <Button
                onClick={submitCode}
                disabled={busy}
                className="h-11 w-full rounded-full font-display font-semibold"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
            </>
          )}

          {/* Enrolled and verified for this session */}
          {mode === 'idle' && factor && aal === 'aal2' && (
            <>
              <div className="flex items-start gap-2 rounded-2xl bg-primary/10 px-3 py-2.5 text-[11px] leading-relaxed text-primary">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>This session is verified. Admin actions are unlocked.</span>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setMode('disable');
                  setCode('');
                  setError('');
                }}
                className="h-11 w-full rounded-full"
              >
                <ShieldOff className="mr-1.5 h-4 w-4" />
                Turn off two-factor
              </Button>
            </>
          )}

          {/* Disable — confirm with a current code */}
          {mode === 'disable' && (
            <>
              <p className="text-xs text-muted-foreground">
                Enter a current code to turn two-factor off. Admin actions will then be protected by
                your password alone.
              </p>
              <CodeField code={code} setCode={setCode} id="mfa-disable-code" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode('idle');
                    setCode('');
                    setError('');
                  }}
                  disabled={busy}
                  className="h-11 flex-1 rounded-full"
                >
                  Keep it on
                </Button>
                <Button
                  variant="destructive"
                  onClick={submitCode}
                  disabled={busy}
                  className="h-11 flex-1 rounded-full font-display font-semibold"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Turn off'}
                </Button>
              </div>
            </>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </section>
  );
}

function CodeField({ code, setCode, id }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        6-digit code
      </Label>
      <Input
        id={id}
        value={code}
        onChange={(event) => setCode(digitsOnly(event.target.value))}
        placeholder="123456"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        className="glass-soft h-11 rounded-2xl border-white/10 text-center font-mono text-lg tracking-[0.3em]"
      />
    </div>
  );
}