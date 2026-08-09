import { ACCOUNTS_KEY, toSessionAccount } from './auth';
import type { Account, SessionAccount } from './types';

const DATABASE_NAME = 'acsa-evaluation';
const STORE_NAME = 'accounts';
const SESSION_STORE_NAME = 'sessions';
const PRIMARY_KEY = 'accounts';

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
      if (!database.objectStoreNames.contains(SESSION_STORE_NAME)) {
        database.createObjectStore(SESSION_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadAccounts() {
  const database = await openDatabase();
  return new Promise<Account[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(PRIMARY_KEY);
    request.onsuccess = () => {
      database.close();
      const indexedDbAccounts = (request.result as Account[] | undefined) ?? [];
      if (indexedDbAccounts.length > 0) {
        resolve(indexedDbAccounts);
        return;
      }

      try {
        const legacySnapshot = window.localStorage.getItem(ACCOUNTS_KEY);
        if (!legacySnapshot) {
          resolve([]);
          return;
        }
        const legacyAccounts = JSON.parse(legacySnapshot) as Account[];
        void saveAccounts(legacyAccounts);
        window.localStorage.removeItem(ACCOUNTS_KEY);
        resolve(legacyAccounts);
      } catch {
        resolve([]);
      }
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}

export async function saveAccounts(accounts: Account[]) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(accounts, PRIMARY_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function loadSessionAccount(accountId: string) {
  const accounts = await loadAccounts();
  const account = accounts.find((candidate) => candidate.id === accountId);
  return account ? (toSessionAccount(account) as SessionAccount) : null;
}

export async function createSession(accountId: string) {
  const database = await openDatabase();
  const token = globalThis.crypto.randomUUID();
  return new Promise<string>((resolve, reject) => {
    const transaction = database.transaction(SESSION_STORE_NAME, 'readwrite');
    transaction.objectStore(SESSION_STORE_NAME).put(accountId, token);
    transaction.oncomplete = () => {
      database.close();
      resolve(token);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function loadSessionAccountForToken(token: string) {
  const database = await openDatabase();
  return new Promise<SessionAccount | null>((resolve, reject) => {
    const transaction = database.transaction(SESSION_STORE_NAME, 'readonly');
    const request = transaction.objectStore(SESSION_STORE_NAME).get(token);
    request.onsuccess = async () => {
      database.close();
      const accountId = request.result as string | undefined;
      if (!accountId) {
        resolve(await loadSessionAccount(token));
        return;
      }
      resolve(await loadSessionAccount(accountId));
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}
