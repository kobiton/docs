import { Env, Session, TokenResponse } from './config';
import { validateIdToken } from './cognito';
import {
  createSessionCookie,
  createAuthStateCookies,
  clearAuthStateCookies,
  getStateCookie,
  getCodeVerifierCookie,
  getReturnToCookie,
  clearSessionCookie,
} from './session';
import { renderErrorPage } from './error-page';

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function getAuthorizeUrl(env: Env): string {
  return `https://${env.COGNITO_DOMAIN}/oauth2/authorize`;
}

function getTokenUrl(env: Env): string {
  return `https://${env.COGNITO_DOMAIN}/oauth2/token`;
}

function getLogoutUrl(env: Env): string {
  return `https://${env.COGNITO_DOMAIN}/logout`;
}

function getCallbackUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/auth/callback`;
}

export async function initiateLogin(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const returnTo = url.pathname + url.search;
  const callbackUrl = getCallbackUrl(request);

  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authorizeParams = new URLSearchParams({
    response_type: 'code',
    client_id: env.COGNITO_CLIENT_ID,
    redirect_uri: callbackUrl,
    scope: 'openid email profile',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authorizeUrl = `${getAuthorizeUrl(env)}?${authorizeParams.toString()}`;
  const stateCookies = createAuthStateCookies(state, codeVerifier, returnTo);

  console.log('InitiateLogin debug:', {
    callbackUrl,
    returnTo,
    statePrefix: state.substring(0, 16) + '...',
    numCookies: stateCookies.length,
  });

  return new Response(null, {
    status: 302,
    headers: [
      ['Location', authorizeUrl],
      ...stateCookies.map((cookie): [string, string] => ['Set-Cookie', cookie]),
    ],
  });
}

export async function handleCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return renderErrorPage(
      'Authentication Failed',
      errorDescription || 'The identity provider returned an error. Please try again.',
      400
    );
  }

  if (!code || !state) {
    return renderErrorPage(
      'Invalid Request',
      'The authentication response was incomplete. Please try logging in again.',
      400
    );
  }

  const savedState = getStateCookie(request);
  const codeVerifier = getCodeVerifierCookie(request);
  const returnTo = getReturnToCookie(request);

  // Debug logging
  const cookieHeader = request.headers.get('Cookie');
  console.log('Callback debug:', {
    hasCodeParam: !!code,
    hasStateParam: !!state,
    stateParam: state?.substring(0, 16) + '...',
    savedState: savedState ? savedState.substring(0, 16) + '...' : null,
    statesMatch: savedState === state,
    hasCodeVerifier: !!codeVerifier,
    hasReturnTo: !!returnTo,
    hasCookieHeader: !!cookieHeader,
    cookieHeaderLength: cookieHeader?.length,
  });

  if (!savedState || savedState !== state) {
    return renderErrorPage(
      'Session Expired',
      `Your login session has expired or is invalid. Debug: savedState=${savedState ? 'present' : 'missing'}, match=${savedState === state}`,
      400
    );
  }

  if (!codeVerifier) {
    return renderErrorPage(
      'Session Expired',
      'Your login session has expired. Please try logging in again.',
      400
    );
  }

  try {
    const callbackUrl = getCallbackUrl(request);
    const tokens = await exchangeCodeForTokens(code, codeVerifier, callbackUrl, env);
    const userInfo = await validateIdToken(tokens.id_token, env);

    const session: Session = {
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      userInfo,
    };

    const sessionCookie = await createSessionCookie(session, env);
    const clearAuthCookies = clearAuthStateCookies();
    const redirectTo = returnTo ? decodeURIComponent(returnTo) : '/';

    return new Response(null, {
      status: 302,
      headers: [
        ['Location', redirectTo],
        ['Set-Cookie', sessionCookie],
        ...clearAuthCookies.map((cookie): [string, string] => ['Set-Cookie', cookie]),
      ],
    });
  } catch (err) {
    console.error('Token exchange error:', err);
    return renderErrorPage(
      'Authentication Failed',
      'We could not complete your sign-in. Please try again or contact support if the issue persists.',
      500
    );
  }
}

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  callbackUrl: string,
  env: Env
): Promise<TokenResponse> {
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.COGNITO_CLIENT_ID,
    client_secret: env.COGNITO_CLIENT_SECRET,
    code: code,
    redirect_uri: callbackUrl,
    code_verifier: codeVerifier,
  });

  const response = await fetch(getTokenUrl(env), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function refreshSession(
  session: Session,
  env: Env
): Promise<Session | null> {
  try {
    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.COGNITO_CLIENT_ID,
      client_secret: env.COGNITO_CLIENT_SECRET,
      refresh_token: session.refreshToken,
    });

    const response = await fetch(getTokenUrl(env), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    const tokens: TokenResponse = await response.json();
    const userInfo = await validateIdToken(tokens.id_token, env);

    return {
      refreshToken: tokens.refresh_token || session.refreshToken,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      userInfo,
    };
  } catch (err) {
    console.error('Token refresh error:', err);
    return null;
  }
}

export function handleLogout(request: Request, env: Env): Response {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') || '/';

  // Build Cognito logout URL
  const logoutParams = new URLSearchParams({
    client_id: env.COGNITO_CLIENT_ID,
    logout_uri: new URL(returnTo, url.origin).toString(),
  });

  const logoutUrl = `${getLogoutUrl(env)}?${logoutParams.toString()}`;

  return new Response(null, {
    status: 302,
    headers: [
      ['Location', logoutUrl],
      ['Set-Cookie', clearSessionCookie()],
    ],
  });
}
