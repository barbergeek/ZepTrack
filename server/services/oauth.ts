import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!client) {
    client = new OAuth2Client(GOOGLE_CLIENT_ID);
  }
  return client;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null> {
  if (!GOOGLE_CLIENT_ID) {
    console.error('GOOGLE_CLIENT_ID not configured');
    return null;
  }

  try {
    const ticket = await getClient().verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return null;

    return {
      sub: payload.sub!,
      email: payload.email!,
      emailVerified: payload.email_verified || false,
      name: payload.name || payload.email!,
      picture: payload.picture || '',
    };
  } catch (error) {
    console.error('Google token verification failed:', error);
    return null;
  }
}
