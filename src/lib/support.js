import { Instagram, MessageCircle, Send } from 'lucide-react';

export const WHATSAPP_NUMBER = '8218732250';

export const SUPPORT_CHANNELS = [
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