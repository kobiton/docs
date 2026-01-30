export interface Env {
  COGNITO_DOMAIN: string;
  COGNITO_CLIENT_ID: string;
  COGNITO_CLIENT_SECRET: string;
  COGNITO_REGION: string;
  COGNITO_USER_POOL_ID: string;
  SESSION_SECRET: string;
}

export interface Session {
  refreshToken: string;
  expiresAt: number;
  userInfo: UserInfo;
}

export interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface JWK {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

export interface JWKS {
  keys: JWK[];
}
