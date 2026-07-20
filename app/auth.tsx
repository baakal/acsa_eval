'use client';

import { FormEvent, useState } from 'react';
import { usePersistentValue, writePersistentValue } from './use-persistent-state';

export type AccountRole = 'Country' | 'Solution Provider';
export type Account = {
  id: string;
  role: AccountRole;
  name: string;
  email: string;
  organization: string;
  country: string;
  passwordHash: string;
};

export const SESSION_KEY = 'acsa-current-account';
const ACCOUNTS_KEY = 'acsa-accounts';

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function AuthScreen() {
  const [accounts, setAccounts] = usePersistentValue<Account[]>(ACCOUNTS_KEY, []);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<AccountRole>('Country');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email')).trim().toLowerCase();
    const passwordHash = await hashPassword(String(data.get('password')));
    const account = accounts.find((candidate) => candidate.email === email && candidate.passwordHash === passwordHash);
    if (!account) {
      setError('Email or password is incorrect.');
      setBusy(false);
      return;
    }
    writePersistentValue(SESSION_KEY, account);
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email')).trim().toLowerCase();
    if (accounts.some((account) => account.email === email)) {
      setError('An account with this email already exists.');
      setBusy(false);
      return;
    }
    const account: Account = {
      id: window.crypto.randomUUID(),
      role,
      name: String(data.get('name')).trim(),
      email,
      organization: String(data.get('organization')).trim(),
      country: String(data.get('country')).trim(),
      passwordHash: await hashPassword(String(data.get('password'))),
    };
    setAccounts([...accounts, account]);
    writePersistentValue(SESSION_KEY, account);
  }

  return <main className="authPage">
    <section className="authIntro"><div className="brand authBrand"><span className="mark">A</span><span>ACSA <b>Evaluation</b></span></div><div><span className="eyebrow">ACSA CORE REQUIREMENTS SCREENING</span><h1>Assess digital civil registration solutions with confidence.</h1><p>Complete requirements, attach evidence, collaborate with reviewers, and respond to requested changes in one workspace.</p></div><small>For participating countries and solution providers</small></section>
    <section className="authPanel"><div className="authBox"><span className="eyebrow">SECURE WORKSPACE</span><h2>{view === 'login' ? 'Welcome back' : 'Create your account'}</h2><p>{view === 'login' ? 'Sign in to continue your assessment.' : 'Tell us who you represent to configure your workspace.'}</p>
      {view === 'register' && <div className="rolePicker"><button className={role === 'Country' ? 'selected' : ''} onClick={() => setRole('Country')}><b>Country</b><small>Government or national programme</small></button><button className={role === 'Solution Provider' ? 'selected' : ''} onClick={() => setRole('Solution Provider')}><b>Solution provider</b><small>Product or implementation team</small></button></div>}
      <form onSubmit={view === 'login' ? login : register}>
        {view === 'register' && <><label>Full name<input name="name" required autoComplete="name"/></label><label>Organisation<input name="organization" required/></label><label>Country<input name="country" required autoComplete="country-name"/></label></>}
        <label>Email address<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" minLength={8} required autoComplete={view === 'login' ? 'current-password' : 'new-password'}/></label>
        {error && <div className="authError">{error}</div>}
        <button className="authSubmit" disabled={busy}>{busy ? 'Please wait…' : view === 'login' ? 'Sign in' : `Register as ${role}`}</button>
      </form>
      <button className="authSwitch" onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }}>{view === 'login' ? 'New to ACSA? Create an account' : 'Already registered? Sign in'}</button>
    </div></section>
  </main>;
}
