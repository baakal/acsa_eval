export const SESSION_KEY = 'acsa-current-account';
export const ACCOUNTS_KEY = 'acsa-accounts';

export async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
