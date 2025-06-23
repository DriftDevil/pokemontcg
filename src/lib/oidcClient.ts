
'use server';
import { Issuer, custom } from 'openid-client';
import type { Client } from 'openid-client';
import logger from '@/lib/logger';

let oidcClientInstance: Client | null = null;
let oidcClientPromise: Promise<Client> | null = null;

custom.setHttpOptionsDefaults({
  timeout: 10000, // Increase timeout to 10 seconds
});

async function initializeClient(): Promise<Client> {
  const CONTEXT = "OIDC Client Initialization";
  if (!process.env.AUTHENTIK_ISSUER) {
    throw new Error('AUTHENTIK_ISSUER environment variable is not set');
  }
  if (!process.env.AUTHENTIK_CLIENT_ID) {
    throw new Error('AUTHENTIK_CLIENT_ID environment variable is not set');
  }
  if (!process.env.AUTHENTIK_CLIENT_SECRET) {
    throw new Error('AUTHENTIK_CLIENT_SECRET environment variable is not set');
  }
  
  const appUrl = process.env.APP_URL || (() => {
    if (process.env.NODE_ENV === 'development') {
      logger.warn(CONTEXT, 'APP_URL environment variable is not set, defaulting to http://localhost:9002 for OIDC client in development.');
      return 'http://localhost:9002';
    }
    // In production or other environments, APP_URL must be set.
    throw new Error('APP_URL environment variable is not set. This is required for OIDC client initialization in non-development environments.');
  })();
  
  const redirect_uri = `${appUrl}/api/auth/callback`;

  try {
    const issuer = await Issuer.discover(process.env.AUTHENTIK_ISSUER);
    
    const client = new issuer.Client({
      client_id: process.env.AUTHENTIK_CLIENT_ID,
      client_secret: process.env.AUTHENTIK_CLIENT_SECRET,
      redirect_uris: [redirect_uri],
      response_types: ['code'],
      // Consider making id_token_signed_response_alg configurable if needed
      // id_token_signed_response_alg: 'ES256', // Set based on your Authentik app config
    });
    
    oidcClientInstance = client;
    return client;
  } catch (error) {
    logger.error(CONTEXT, 'Failed to discover OIDC issuer or configure client:', error);
    oidcClientPromise = null; // Reset promise on failure to allow retry
    if (error instanceof Error) {
        throw new Error(`OIDC client initialization failed: ${error.message}`);
    }
    throw new Error('OIDC client initialization failed due to an unknown error.');
  }
}

export async function getOidcClient(): Promise<Client> {
  if (oidcClientInstance) {
    return Promise.resolve(oidcClientInstance);
  }
  if (!oidcClientPromise) {
    oidcClientPromise = initializeClient();
  }
  return oidcClientPromise;
}
