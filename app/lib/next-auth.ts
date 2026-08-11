import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import * as jose from 'jose';

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    roles: string[];
    organizationName?: string;
    assessmentId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    roles?: string[];
    organizationName?: string;
    assessmentId?: string;
    providerSub?: string;
  }
}

async function signBackendToken(token: JWT): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
  return new jose.SignJWT({
    sub: token.providerSub ?? token.sub,
    email: token.email ?? '',
    name: token.name ?? '',
    roles: token.roles ?? [],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export const nextAuthOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? '',
      tenantId: process.env.AZURE_AD_TENANT_ID ?? 'common',
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.providerSub = account.providerAccountId;
      }
      // Refresh the backend token on every JWT rotation
      token.accessToken = await signBackendToken(token);
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.accessToken = token.accessToken ?? '';
      session.roles = token.roles ?? [];
      session.organizationName = token.organizationName;
      session.assessmentId = token.assessmentId;
      return session;
    },
  },
};
