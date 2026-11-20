import { ScrollText } from 'lucide-react';

// The standard rule sheet every match follows. A match with its own
// description on the admin side shows that text instead.
const DEFAULT_RULES = [
  {
    title: '⚔️ Match restrictions',
    items: [
      'Double Vector is NOT allowed (Single Vector allowed)',
      'M79 Launcher is strictly banned',
      'Gun Attributes must be ON',
    ],
  },
  {
    title: '🚫 Violations',
    items: [
      'Any rule violation will result in immediate action',
      'Account ban',
      'Disqualification',
      'Rewards forfeited',
    ],
  },
  {
    title: '📋 Entry requirements',
    items: ['Minimum level 40+', 'Use your In Game Name (IGN), not UID', 'Entry fee is per individual player'],
  },
  {
    title: '🎮 Match process',
    items: [
      'Room ID and password are shared 5 minutes before the match',
      'The match starts 5 minutes after room details are shared',
      'Join on time — no refund for late entry',
      'First come, first serve',
    ],
  },
  {
    title: '🕹️ Gameplay rules',
    items: [
      'Teaming and griefing are strictly prohibited',
      'Do not change your position after joining the room',
      'Only mobile devices allowed — no emulators or hacks',
      'Hackers are permanently banned',
    ],
  },
  {
    title: '🏆 Rewards',
    items: ['Rewards are paid per kill — check the app for details'],
  },
  {
    title: '🎥 Fair play',
    items: [
      'Record your gameplay',
      'If you are kicked or the room is full, record before joining and until the match starts, then send the proof on Telegram',
    ],
  },
  {
    title: '⚠️ Hacker reporting',
    items: ['Report a hacker with proof — the hacker is banned and your entry is refunded'],
  },
  {
    title: '🙏 Player behavior',
    items: ['Respect others, no abuse — violators lose their account and winnings'],
  },
  {
    title: '👥 Squad rule',
    items: ['The squad leader is responsible for team behavior', 'No bullying or toxic behavior'],
  },
  {
    title: '📌 General rules',
    items: [
      'Contact Telegram support for any issue',
      'Matches may be rescheduled if there are fewer players',
      'Do not share the Room ID or password',
      'This is a paid match — entry fee is required',
      'Players are responsible for their own technical issues',
      'No match restart for personal problems',
    ],
  },
  {
    title: '📱 In game rules',
    items: ['Latest game version is required', 'Standard in-game rules apply', 'Teaming leads to disqualification'],
  },
];

export default function MatchRules({ description }) {
  const custom = String(description || '').trim();

  return (
    <section className="glass-soft space-y-3 rounded-2xl px-3.5 py-3.5">
      <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-accent">
        <ScrollText className="h-3.5 w-3.5" />
        About this match
      </h2>

      {custom ? (
        <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{custom}</p>
      ) : (
        <div className="space-y-3">
          {DEFAULT_RULES.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <p className="border-b border-white/10 pb-1 text-xs font-semibold">{section.title}</p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <span className="text-accent">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="pt-1 text-center text-xs font-semibold text-primary">
            🔥 Play Fair. Play Hard. Good Luck! 🔥
          </p>
        </div>
      )}
    </section>
  );
}