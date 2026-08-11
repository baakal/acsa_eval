'use client';

import { signIn } from 'next-auth/react';

export function AuthScreen() {
  return (
    <main className="authPage">
      <section className="authIntro">
        <div className="brand authBrand">
          <span className="mark">A</span>
          <span>
            ACSA <b>Evaluation</b>
          </span>
        </div>
        <div>
          <span className="eyebrow">ACSA CORE REQUIREMENTS SCREENING</span>
          <h1>Assess digital civil registration solutions with confidence.</h1>
          <p>
            Complete requirements, attach evidence, collaborate with reviewers, and
            respond to requested changes in one workspace.
          </p>
        </div>
        <small>For participating countries and solution providers</small>
      </section>
      <section className="authPanel">
        <div className="authBox">
          <span className="eyebrow">SECURE WORKSPACE</span>
          <h2>Welcome to ACSA Evaluation</h2>
          <p>Sign in with your organisation account to access your workspace.</p>
          <button
            className="authSubmit"
            onClick={() => signIn('google')}
          >
            Sign in with Google
          </button>
          <button
            className="authSubmit"
            onClick={() => signIn('azure-ad')}
          >
            Sign in with Microsoft
          </button>
        </div>
      </section>
    </main>
  );
}
