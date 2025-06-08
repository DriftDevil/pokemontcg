'use server';
import { Issuer, custom } from 'openid-client';
import type { Client } from 'openid-client';

let oidcClient: Client | null = null;

custom.setHttpOptionsDefaults({
  timeout: 10000, // Increase timeout to 10 seconds
});

export async function getOidcClient(): Promise<Client> {
  if (oidcClient) {
    return oidcClient;
  }

  if (!process.env.AUTHENTIK_ISSUER) {
    throw new Error('AUTHENTIK_ISSUER environment variable is not set');
  }
  if (!process.env.AUTHENTIK_CLIENT_ID) {
    throw new Error('AUTHENTIK_CLIENT_ID environment variable is not set');
  }
  if (!process.env.AUTHENTIK_CLIENT_SECRET) {
    throw new Error('AUTHENTIK_CLIENT_SECRET environment variable is not set');
  }
  if (!process.env.APP_URL) {
    console.warn('APP_URL environment variable is not set, defaulting to http://localhost:9002 for OIDC client.');
  }

  const appUrl = process.env.APP_URL || 'http://localhost:9002';
  const redirect_uri = `${appUrl}/api/auth/callback`;

  try {
    const issuer = await Issuer.discover(process.env.AUTHENTIK_ISSUER);
    
    oidcClient = new issuer.Client({
      client_id: process.env.AUTHENTIK_CLIENT_ID,
      client_secret: process.env.AUTHENTIK_CLIENT_SECRET,
      redirect_uris: [redirect_uri],
      response_types: ['code'],
      // id_token_signed_response_alg: 'ES256', // Set based on your Authentik app config
    });
    
    return oidcClient;
  } catch (error) {
    console.error('Failed to discover OIDC issuer or configure client:', error);
    throw new Error('OIDC client initialization failed.');
  }
}
