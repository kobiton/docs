import { Env } from '../lib/config';
import { handleCallback, handleLogout } from '../lib/auth';
import { renderErrorPage } from '../lib/error-page';

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const path = url.pathname;

    if (path === '/auth/callback') {
      return handleCallback(context.request, context.env);
    }

    if (path === '/auth/logout') {
      return handleLogout(context.request, context.env);
    }

    // Unknown auth route
    return renderErrorPage('Not Found', 'The requested page could not be found.', 404);
  } catch (error) {
    console.error('Auth route error:', error);
    return renderErrorPage(
      'Authentication Error',
      'We encountered a problem processing your request. Please try again.',
      500
    );
  }
};
