#!/usr/bin/env node
/**
 * One-time helper: obtains a GOOGLE_REFRESH_TOKEN for the dedicated platform
 * Gmail account.
 *
 *   npm run gmail:token
 *
 * This is DEV TOOLING. The application never imports it and performs no OAuth
 * authorization flow at runtime — it only exchanges the resulting refresh token
 * for access tokens. Run this once, paste the token into .env, and forget it.
 *
 * Unrelated to Supabase's Google sign-in, which authenticates *users*. This
 * authorizes the *platform's own* mailbox to send transactional mail.
 *
 * Prerequisites (see Backend/README.md → Email):
 *   1. Google Cloud project with the Gmail API enabled
 *   2. OAuth consent screen in "Testing", platform account added as a test user
 *   3. OAuth client (type: Web application) whose redirect URI matches
 *      GOOGLE_REDIRECT_URI below
 *   4. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET set in Backend/.env
 */
require('dotenv').config();

const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/oauth2callback';

if (!clientId || !clientSecret) {
  console.error('❌ GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in Backend/.env first.');
  console.error('   See Backend/README.md → Email → Gmail API setup.');
  process.exit(1);
}

const parsed = new URL(redirectUri);
const port = parsed.port || 80;

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

// access_type=offline + prompt=consent is what makes Google return a refresh token.
// Without both, you get an access token only and this script is pointless.
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES
});

console.log('\n📧 SkillKart — Gmail refresh token generator');
console.log('─'.repeat(60));
console.log('\n1. Open this URL and sign in as the PLATFORM email account:\n');
console.log(authUrl);
console.log(`\n2. Waiting for the redirect on ${redirectUri} ...\n`);

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith(parsed.pathname)) {
    res.writeHead(404).end();
    return;
  }

  const code = new URL(req.url, `http://localhost:${port}`).searchParams.get('code');
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Missing ?code');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(
        '<h2>No refresh token returned</h2><p>Revoke prior access and retry. See terminal.</p>'
      );
      console.error('\n❌ Google returned no refresh_token.');
      console.error('   This happens when the account already granted access.');
      console.error('   Revoke at https://myaccount.google.com/permissions and re-run.\n');
      server.close();
      process.exit(1);
    }

    oauth2Client.setCredentials(tokens);

    // We only request gmail.send, which grants no read access — so we can't look
    // the address up. Use the configured one; it's the account you just consented as.
    const account = process.env.GOOGLE_EMAIL || '<the account you just signed in as>';

    res.writeHead(200, { 'Content-Type': 'text/html' }).end(
      '<h2>✅ Success</h2><p>Refresh token printed in your terminal. You can close this tab.</p>'
    );

    console.log('✅ Success — add these to Backend/.env (and Railway variables):\n');
    console.log('─'.repeat(60));
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GOOGLE_EMAIL=${account}`);
    console.log('─'.repeat(60));
    console.log('\nThen set EMAIL_PROVIDER=gmail and restart the server.\n');
    console.log('⚠️  Treat the refresh token like a password — never commit it.\n');

    server.close();
    process.exit(0);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end(`Token exchange failed: ${error.message}`);
    console.error(`\n❌ Token exchange failed: ${error.message}`);
    console.error('   Check that GOOGLE_REDIRECT_URI exactly matches the OAuth client config.\n');
    server.close();
    process.exit(1);
  }
});

server.listen(port, () => {
  if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    console.log(`⚠️  GOOGLE_REDIRECT_URI host is "${parsed.hostname}" — this script only`);
    console.log('   captures redirects to localhost. Adjust the URI or paste the code manually.\n');
  }
});
