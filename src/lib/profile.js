const digits = (value) => String(value || '').replace(/\D/g, '');

// A player can only join a match once their own profile is ready:
// Free Fire IGN, UID and a 10-digit WhatsApp number.
export function missingProfileFields(user) {
  const missing = [];
  if (!String(user?.ff_ign || '').trim()) missing.push('Free Fire IGN');
  if (!String(user?.ff_uid || '').trim()) missing.push('Free Fire UID');
  if (digits(user?.whatsapp).length !== 10) missing.push('WhatsApp number');
  return missing;
}

export function isProfileComplete(user) {
  return missingProfileFields(user).length === 0;
}