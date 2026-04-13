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
    :root {
      --twitch-purple: #9146FF;
      --bg-dark: #0e0e10;
      --card-bg: #18181b;
      --text-main: #efeff1;
      --text-muted: #adadb8;
    }
    body {
      font-family: 'Roobert', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; margin: 0;
      background: var(--bg-dark); color: var(--text-main);
      overflow: hidden;
    }
    .card {
      text-align: center; padding: 3rem 4rem;
      background: var(--card-bg); border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
      border-top: 4px solid var(--twitch-purple);
      transform: translateY(20px);
      opacity: 0;
      animation: floatUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      max-width: 400px;
      transition: border-color 0.4s ease;
    }
    @keyframes floatUp {
      to { transform: translateY(0); opacity: 1; }
    }
    .icon-container {
      width: 80px; height: 80px;
      margin: 0 auto 1.5rem;
      background: rgba(145, 70, 255, 0.1);
      border-radius: 50%;
      display: flex; justify-content: center; align-items: center;
      color: var(--twitch-purple);
      transition: all 0.4s ease;
    }
    .icon-container svg {
      width: 40px; height: 40px;
      stroke-dasharray: 100; stroke-dashoffset: 100;
      animation: drawCheck 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.1s forwards;
    }
    @keyframes drawCheck {
      to { stroke-dashoffset: 0; }
    }
    h1 {
      margin: 0 0 0.5rem 0; font-size: 1.6rem; font-weight: 600;
    }
    p {
      color: var(--text-muted); font-size: 1rem; line-height: 1.5; margin: 0;
    }
    .status-text {
      margin-top: 2rem; font-size: 0.9rem; font-weight: 500;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.1);
      border-top-color: var(--twitch-purple); border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .success-text { color: #00e676; }
    .error-text { color: #ff5252; }
    
    /* Background subtle glow */
    .bg-glow {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(145,70,255,0.05) 0%, rgba(14,14,16,0) 70%);
      pointer-events: none; z-index: -1;
    }
  </style>
</head>
<body>
  <div class="bg-glow"></div>
  <div class="card" id="card">
    <div class="icon-container" id="iconBox">
      <!-- Default state: Spinner -->
      <div class="spinner" id="spinner" style="width: 32px; height: 32px; border-width: 3px;"></div>
    </div>
    <h1 id="title">Authenticating</h1>
    <p id="desc">Securing connection with Twitch...</p>
    
    <div class="status-text" id="statusMessage">
      <div class="spinner"></div> Processing...
    </div>
  </div>

  <script>
    const svgCheck = '<svg fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';
    const svgX = '<svg fill="none" stroke="#ff5252" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>';

    const updateUI = (state) => {
      const iconBox = document.getElementById('iconBox');
      const title = document.getElementById('title');
      const desc = document.getElementById('desc');
      const statusMessage = document.getElementById('statusMessage');

      iconBox.style.background = state === 'success' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 82, 82, 0.1)';
      iconBox.style.color = state === 'success' ? '#00e676' : '#ff5252';
      iconBox.innerHTML = state === 'success' ? svgCheck : svgX;

      title.textContent = state === 'success' ? 'Authorization Successful!' : 'Authorization Failed';
      desc.innerHTML = state === 'success' 
        ? 'Your token has been securely saved.<br>You can safely close this tab.' 
        : 'No valid token received.<br>Please try logging in again.';

      statusMessage.className = 'status-text ' + (state === 'success' ? 'success-text' : 'error-text');
      statusMessage.innerHTML = state === 'success' ? 'Ready to use XantaTTS' : 'Connection rejected';
      
      if (state === 'error') document.getElementById('card').style.borderTopColor = '#ff5252';
      if (state === 'success') document.getElementById('card').style.borderTopColor = '#00e676';
    };

    (async () => {
      const fragment = window.location.hash.substring(1);
      const params = new URLSearchParams(fragment);
      const token = params.get('access_token');
      
      // Simulate slight delay for smooth animation transition
      await new Promise(r => setTimeout(r, 600));

      if (token) {
        await fetch('/token?t=' + encodeURIComponent(token));
        updateUI('success');
      } else {
        updateUI('error');
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
