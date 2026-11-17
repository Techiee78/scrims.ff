import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, Save } from 'lucide-react';
import { adminSaveNexupiSettings } from '@/lib/payments';
import { useToast } from '@/components/ui/use-toast';

export default function NexupiSettingsForm({ settings, webhookUrl, onSaved }) {
  const [token, setToken] = useState('');
  const [createUrl, setCreateUrl] = useState(settings?.createUrl || '');
  const [statusUrl, setStatusUrl] = useState(settings?.statusUrl || '');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setCreateUrl(settings?.createUrl || '');
    setStatusUrl(settings?.statusUrl || '');
  }, [settings?.createUrl, settings?.statusUrl]);

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_e) {
      toast({ title: 'Webhook URL', description: webhookUrl });
    }
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await adminSaveNexupiSettings({ token: token.trim(), createUrl: createUrl.trim(), statusUrl: statusUrl.trim() });
      setToken('');
      onSaved?.();
      toast({ title: 'NexUPI settings saved' });
    } catch (err) {
      setError(err.message || 'Could not save the NexUPI settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass space-y-3 rounded-[24px] p-4">
      <div>
        <h2 className="font-display text-sm font-semibold">NexUPI (automatic)</h2>
        <p className="text-[10px] text-muted-foreground">
          Copy these two endpoint URLs and the token from the NexUPI Developers page.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          API token (user_token)
        </span>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={settings?.tokenSet ? 'Saved — leave blank to keep it' : 'Paste your NexUPI token'}
          autoComplete="off"
          className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Create order URL
        </span>
        <input
          type="url"
          value={createUrl}
          onChange={(e) => setCreateUrl(e.target.value)}
          placeholder="https://… (Create order endpoint)"
          className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Check order status URL
        </span>
        <input
          type="url"
          value={statusUrl}
          onChange={(e) => setStatusUrl(e.target.value)}
          placeholder="https://… (Check order status endpoint)"
          className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-primary/60"
        />
      </label>

      {webhookUrl && (
        <div className="rounded-2xl bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Webhook URL for NexUPI</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-[10px] text-foreground/80">{webhookUrl}</code>
            <button
              type="button"
              onClick={copyWebhook}
              className="glass-soft flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[10px] font-medium"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save NexUPI settings
      </button>
    </section>
  );
}