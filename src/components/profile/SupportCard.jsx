import { Instagram, MessageCircle, Send } from 'lucide-react';

const WHATSAPP_NUMBER = '8218732250';

const CHANNELS = [
  {
    label: 'WhatsApp',
    hint: 'Chat with our support team',
    href: `https://wa.me/91${WHATSAPP_NUMBER}`,
    icon: MessageCircle,
    live: true,
  },
  {
    label: 'Instagram',
    hint: 'Coming soon',
    href: null,
    icon: Instagram,
    live: false,
  },
  {
    label: 'Telegram',
    hint: 'Coming soon',
    href: null,
    icon: Send,
    live: false,
  },
];

export default function SupportCard() {
  return (
    <section className="glass rounded-[26px] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Customer support
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Stuck with a slot or payment? Reach us.</p>

      <div className="mt-3 space-y-2">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const content = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium">{channel.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {channel.hint}
                </span>
              </span>
            </>
          );

          if (!channel.live) {
            return (
              <div
                key={channel.label}
                aria-disabled="true"
                className="glass-soft flex w-full cursor-not-allowed items-center gap-3 rounded-2xl px-3.5 py-2.5 opacity-50"
              >
                {content}
              </div>
            );
          }

          return (
            <a
              key={channel.label}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-soft flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-foreground transition-colors hover:bg-white/10"
            >
              {content}
            </a>
          );
        })}
      </div>
    </section>
  );
}