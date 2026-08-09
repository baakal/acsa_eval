import type { Account, SessionAccount } from './types';

export const SESSION_KEY = 'acsa-current-account';
export const ACCOUNTS_KEY = 'acsa-accounts';

const PASSWORD_HASH_ITERATIONS = 310_000;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBuffer(value: string) {
  return Uint8Array.from(value.match(/.{1,2}/g) ?? [], (byte) => parseInt(byte, 16)).buffer;
}

async function derivePasswordHash(password: string, salt: ArrayBuffer) {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: PASSWORD_HASH_ITERATIONS,
    },
    keyMaterial,
    256,
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

export async function hashPassword(password: string, salt: string) {
  return derivePasswordHash(password, hexToBuffer(salt));
}

export async function createPasswordRecord(password: string) {
  const saltBytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToHex(saltBytes);
  return {
    passwordSalt: salt,
    passwordHash: await derivePasswordHash(password, saltBytes.buffer),
  };
}

export async function hashLegacyPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

export function toSessionAccount(account: Account): SessionAccount {
  return {
    id: account.id,
    role: account.role,
    name: account.name,
    email: account.email,
    organization: account.organization,
    country: account.country,
  };
}
