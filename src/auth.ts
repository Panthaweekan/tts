import { createLogger } from './logger.ts';

const log = createLogger('auth');

const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = 'chat:read chat:edit';
const AUTH_TIMEOUT_MS = 120_000; // 2 minutes

/** HTML page served at the callback URL — extracts token from URL fragment */
const CALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XantaTTS — Authorization</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; margin: 0;
      background: #0e0e10; color: #efeff1;
    }
    .card {
      text-align: center; padding: 2rem 3rem;
      background: #18181b; border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    }
    .success { color: #00e676; font-size: 1.4rem; }
    .error { color: #ff5252; font-size: 1.4rem; }
    .sub { color: #adadb8; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="card" id="msg">
    <p class="sub">Processing authorization...</p>
  </div>
  <script>
    (async () => {
      const fragment = window.location.hash.substring(1);
      const params = new URLSearchParams(fragment);
      const token = params.get('access_token');
      if (token) {
        await fetch('/token?t=' + encodeURIComponent(token));
        document.getElementById('msg').innerHTML =
          '<p class="success">✅ Authorization successful!</p>' +
          '<p class="sub">You can close this tab and return to XantaTTS.</p>';
      } else {
        document.getElementById('msg').innerHTML =
          '<p class="error">❌ Authorization failed</p>' +
          '<p class="sub">No token received. Please try again.</p>';
      }
    })();
  </script>
</body>
</html>`;

/**
 * Authenticate with Twitch using the Implicit Grant Flow.
 * Opens a browser, captures the token via a local HTTP server.
 * @param clientId The user's Twitch Developer App Client ID
 * @returns The OAuth token in `oauth:TOKEN` format.
 */
export async function authenticateWithTwitch(clientId: string): Promise<string> {
  return new Promise<string>((_resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        server.stop();
        reject(new Error('Authorization timed out. Please try again.'));
      }
    }, AUTH_TIMEOUT_MS);

    function resolve(value: string) {
      clearTimeout(timeout);
      _resolve(value);
    }

    const server = Bun.serve({
      port: 3000,
      fetch(req) {
        const url = new URL(req.url);

        // Callback page — serves HTML that extracts the token fragment
        if (url.pathname === '/callback') {
          return new Response(CALLBACK_HTML, {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // Token relay — receives the token from the callback page's JS
        if (url.pathname === '/token') {
          const token = url.searchParams.get('t');
          if (token && !settled) {
            settled = true;
            const formatted = token.startsWith('oauth:') ? token : `oauth:${token}`;
            setTimeout(() => server.stop(), 500);
            resolve(formatted);
          }
          return new Response('OK', { status: 200 });
        }

        return new Response('Not Found', { status: 404 });
      },
    });

    // Open the browser to Twitch's authorization page
    const authUrl =
      `https://id.twitch.tv/oauth2/authorize` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}`;

    log.info('Opening browser for Twitch authorization...');
    openBrowser(authUrl);
  });
}

/** Open a URL in the default browser (Windows) */
function openBrowser(url: string): void {
  Bun.spawn(['cmd', '/c', 'start', url.replace(/&/g, '^&')], {
    stdout: 'ignore',
    stderr: 'ignore',
  });
}
