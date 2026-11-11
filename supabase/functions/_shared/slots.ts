// Slot capacity rules: Full Map holds 48 (Solo), 24 (Duo), 12 (Squad);
// CS always runs on 2 slots no matter the team type.
const FULL_MAP_SLOTS: Record<string, number> = { Solo: 48, Duo: 24, Squad: 12 };

export function slotCapacity(mode: string, teamType: string) {
  if (mode === 'CS') return 2;
  return FULL_MAP_SLOTS[teamType] || FULL_MAP_SLOTS.Solo;
}