import { Env, JWK, JWKS, UserInfo } from './config';

let jwksCache: { keys: Map<string, JWK>; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL = 3600000; // 1 hour

function getJwksUrl(env: Env): string {
  return `https://cognito-idp.${env.COGNITO_REGION}.amazonaws.com/${env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
}

function getIssuer(env: Env): string {
  return `https://cognito-idp.${env.COGNITO_REGION}.amazonaws.com/${env.COGNITO_USER_POOL_ID}`;
}

async function fetchJwks(env: Env): Promise<Map<string, JWK>> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL) {
    return jwksCache.keys;
  }

  const response = await fetch(getJwksUrl(env));
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  const jwks: JWKS = await response.json();
  const keysMap = new Map<string, JWK>();
  for (const key of jwks.keys) {
    keysMap.set(key.kid, key);
  }

  jwksCache = { keys: keysMap, fetchedAt: Date.now() };
  return keysMap;
}

async function getPublicKey(kid: string, env: Env): Promise<CryptoKey> {
  const keys = await fetchJwks(env);
  const jwk = keys.get(kid);

  if (!jwk) {
    // Key not found, try refreshing cache
    jwksCache = null;
    const refreshedKeys = await fetchJwks(env);
    const refreshedJwk = refreshedKeys.get(kid);
    if (!refreshedJwk) {
      throw new Error(`Key ${kid} not found in JWKS`);
    }
    return importPublicKey(refreshedJwk);
  }

  return importPublicKey(jwk);
}

async function importPublicKey(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
      alg: jwk.alg,
      use: jwk.use,
    },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const decoded = atob(base64 + padding);
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
}

interface JwtHeader {
  alg: string;
  kid: string;
}

interface JwtPayload {
  sub: string;
  iss: string;
  aud?: string;
  client_id?: string;
  token_use: string;
  exp: number;
  iat: number;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export async function validateIdToken(
  idToken: string,
  env: Env
): Promise<UserInfo> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header: JwtHeader = JSON.parse(
    new TextDecoder().decode(base64UrlDecode(headerB64))
  );
  const payload: JwtPayload = JSON.parse(
    new TextDecoder().decode(base64UrlDecode(payloadB64))
  );

  // Validate claims
  const expectedIssuer = getIssuer(env);
  if (payload.iss !== expectedIssuer) {
    throw new Error(`Invalid issuer: expected ${expectedIssuer}, got ${payload.iss}`);
  }

  // ID tokens use 'aud', access tokens use 'client_id'
  const audience = payload.aud || payload.client_id;
  if (audience !== env.COGNITO_CLIENT_ID) {
    throw new Error(`Invalid audience: expected ${env.COGNITO_CLIENT_ID}, got ${audience}`);
  }

  if (payload.token_use !== 'id') {
    throw new Error(`Invalid token_use: expected 'id', got ${payload.token_use}`);
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new Error('Token has expired');
  }

  // Verify signature
  const publicKey = await getPublicKey(header.kid, env);
  const signatureData = base64UrlDecode(signatureB64);
  const dataToVerify = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signatureData,
    dataToVerify
  );

  if (!isValid) {
    throw new Error('Invalid token signature');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    ...extractCustomClaims(payload),
  };
}

function extractCustomClaims(payload: JwtPayload): Record<string, unknown> {
  const standardClaims = [
    'sub', 'iss', 'aud', 'client_id', 'token_use', 'exp', 'iat',
    'auth_time', 'nonce', 'acr', 'amr', 'azp', 'at_hash',
    'email', 'email_verified', 'name', 'given_name', 'family_name',
    'middle_name', 'nickname', 'preferred_username', 'profile',
    'picture', 'website', 'gender', 'birthdate', 'zoneinfo',
    'locale', 'phone_number', 'phone_number_verified', 'address',
    'updated_at', 'cognito:username', 'cognito:groups',
  ];

  const customClaims: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!standardClaims.includes(key)) {
      customClaims[key] = value;
    }
  }
  return customClaims;
}
