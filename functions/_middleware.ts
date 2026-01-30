import { Env } from './lib/config';
import { getSession, isExpired, createSessionCookie } from './lib/session';
import { initiateLogin, refreshSession } from './lib/auth';
import { renderErrorPage } from './lib/error-page';

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);

    // Skip auth routes - let them be handled by auth/[[path]].ts
    if (url.pathname.startsWith('/auth/')) {
      return context.next();
    }

    const session = await getSession(context.request, context.env);

    if (!session) {
      return initiateLogin(context.request, context.env);
    }

    if (isExpired(session)) {
      const refreshed = await refreshSession(session, context.env);
      if (!refreshed) {
        return initiateLogin(context.request, context.env);
      }
      // Set refreshed session cookie and continue
      const response = await context.next();
      response.headers.append(
        'Set-Cookie',
        await createSessionCookie(refreshed, context.env)
      );
      return response;
    }

    return context.next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return renderErrorPage(
      'Authentication Error',
      'We encountered a problem verifying your identity. Please try again or contact support if the issue persists.',
      503
    );
  }
};
