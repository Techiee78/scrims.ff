// One place for how a wallet row is titled in the history and its detail sheet.
export function txnLabel(item) {
  if (!item) return '';
  if (item.kind === 'deposit') return 'Deposit';
  if (item.kind === 'withdrawal') return 'Withdrawal';
  if (item.type === 'credit' && /prize|per-?kill|winnings?/i.test(item.label || '')) return 'Winning';
  if (item.label) return item.label;
  return item.type === 'credit' ? 'Tournament winnings' : 'Entry fee';
}