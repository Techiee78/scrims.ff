// Shared player-detail validation used by joinTournament and manageTeammates.
// Every player (the joiner and each teammate) is identified by in-game name
// (IGN), Free Fire UID and WhatsApp number.

export interface PlayerInput {
  ign: string;
  whatsapp: string;
  ff_uid: string;
}

export function normalizePlayer(input: any): { error?: string; player?: PlayerInput } {
  const ign = String(input?.ign ?? '').trim();
  const ff_uid = String(input?.ff_uid ?? '').trim();
  let whatsapp = String(input?.whatsapp ?? '').replace(/[^\d]/g, '');
  // Only the 10-digit Indian number is stored: a country code is dropped.
  if (whatsapp.length === 12 && whatsapp.startsWith('91')) whatsapp = whatsapp.slice(2);

  if (!ign) return { error: 'In-game name (IGN) is required' };
  if (!ff_uid) return { error: 'Free Fire UID is required' };
  if (whatsapp.length !== 10) return { error: 'Enter a valid 10-digit WhatsApp number' };

  return { player: { ign, whatsapp, ff_uid } };
}

// Solo = 1 player, Duo = 2, Squad = 4.
export function teamSizeOf(teamType: string) {
  if (teamType === 'Duo') return 2;
  if (teamType === 'Squad') return 4;
  return 1;
}