import { Env, Session } from './config';

const COOKIE_NAME = '__session';
const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: ENCODER.encode('cognito-session-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(data: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    ENCODER.encode(data)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedData: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return DECODER.decode(decrypted);
}

export async function getSession(
  request: Request,
  env: Env
): Promise<Session | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  const sessionCookie = cookies[COOKIE_NAME];
  if (!sessionCookie) return null;

  try {
    const decrypted = await decrypt(sessionCookie, env.SESSION_SECRET);
    return JSON.parse(decrypted) as Session;
  } catch {
    return null;
  }
}

export async function createSessionCookie(
  session: Session,
  env: Env
): Promise<string> {
  const sessionJson = JSON.stringify(session);
  const encrypted = await encrypt(sessionJson, env.SESSION_SECRET);
  const maxAge = Math.floor((session.expiresAt - Date.now()) / 1000);
  const cookie = `${COOKIE_NAME}=${encrypted}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

  console.log('Session cookie debug:', {
    jsonSize: sessionJson.length,
    encryptedSize: encrypted.length,
    cookieSize: cookie.length,
    maxAge,
  });

  if (cookie.length > 4096) {
    console.warn('WARNING: Cookie exceeds 4KB limit, may be rejected by browser');
  }

  return cookie;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function isExpired(session: Session): boolean {
  return Date.now() >= session.expiresAt - 60000; // 1 minute buffer
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies[name] = rest.join('=');
    }
  }
  return cookies;
}

export function getStateCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  return cookies['__auth_state'] || null;
}

export function getCodeVerifierCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  return cookies['__code_verifier'] || null;
}

export function getReturnToCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  return cookies['__return_to'] || null;
}

export function createAuthStateCookies(
  state: string,
  codeVerifier: string,
  returnTo: string
): string[] {
  const maxAge = 600; // 10 minutes
  return [
    `__auth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
    `__code_verifier=${codeVerifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
    `__return_to=${encodeURIComponent(returnTo)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
  ];
}

export function clearAuthStateCookies(): string[] {
  return [
    '__auth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    '__code_verifier=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    '__return_to=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  ];
}
