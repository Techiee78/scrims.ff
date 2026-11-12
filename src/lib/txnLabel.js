// One place for how a wallet row is titled in the history and its detail sheet.
export function txnLabel(item) {
  if (!item) return '';
  if (item.kind === 'deposit') return 'Deposit';
  if (item.kind === 'withdrawal') return 'Withdrawal';
  if (item.type === 'credit' && /prize|per-?kill|winning/i.test(item.label || '')) {
    const match = (item.label || '').split('·')[1]?.trim();
    return match ? `Winning · ${match}` : 'Winning';
  }
  if (item.label) return item.label;
  return item.type === 'credit' ? 'Tournament winnings' : 'Entry fee';
}