import { useEffect, useState } from 'react';
import { QrCode, Zap } from 'lucide-react';
import UpiSettingsForm from '@/components/admin/UpiSettingsForm';
import NexupiSettingsForm from '@/components/admin/NexupiSettingsForm';

const TABS = [
  { key: 'manual', label: 'Manual UPI', icon: QrCode },
  { key: 'automatic', label: 'Automatic', icon: Zap },
];

// Only one payment setup is shown at a time, so the manual UPI fields and the
// automatic NexUPI fields never sit mixed together on the page.
export default function PaymentSetupTabs({ settings, nexupi, webhookUrl, onSaved }) {
  const live = settings?.mode === 'automatic' ? 'automatic' : 'manual';
  const [tab, setTab] = useState(live);

  // Switching the live mode brings that mode's setup forward.
  useEffect(() => setTab(live), [live]);

  return (
    <div className="space-y-3">
      <div className="glass-soft flex gap-1.5 rounded-full p-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium transition-colors ${
                active ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {live === key && (
                <span
                  className={`rounded-full px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide ${
                    active ? 'bg-primary-foreground/20' : 'bg-emerald-400/15 text-emerald-300'
                  }`}
                >
                  live
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'manual' ? (
        <UpiSettingsForm settings={settings} onSaved={onSaved} />
      ) : (
        <NexupiSettingsForm settings={nexupi} webhookUrl={webhookUrl} onSaved={onSaved} />
      )}
    </div>
  );
}