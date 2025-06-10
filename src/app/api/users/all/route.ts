
'use server';
import {NextResponse, type NextRequest} from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

// Helper to parse cookies from a string, e.g., from request.headers.get('Cookie')
function parseCookieString(cookieString: string | null): Record<string, string> {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((acc, cookie) => {
    const [name, ...rest] = cookie.split('=');
    acc[name.trim()] = decodeURIComponent(rest.join('='));
    return acc;
  }, {} as Record<string, string>);
}

export async function GET(request: NextRequest) {
  console.log(`[API /api/users/all] GET request received. URL: ${request.url}`);

  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/users/all] External API base URL not configured for /api/users/all');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  let tokenToForward: string | undefined;

  // Try next/headers.cookies() first
  try {
    const cookieStore = cookies(); // Use synchronous cookies()
    tokenToForward = cookieStore.get('session_token')?.value;
     if (tokenToForward) {
      console.log('[API /api/users/all] Token found using next/headers.cookies().');
    }
  } catch (e) {
    console.warn('[API /api/users/all] Error using next/headers.cookies():', e, '- Will try parsing header directly.');
  }
  
  // Fallback: If token not found via cookies(), try parsing the Cookie header directly
  if (!tokenToForward) {
    const rawCookieHeader = request.headers.get('Cookie');
    if (rawCookieHeader) {
      console.log('[API /api/users/all] Attempting to parse token from raw Cookie header:', rawCookieHeader);
      const parsedCookies = parseCookieString(rawCookieHeader);
      tokenToForward = parsedCookies['session_token'];
      if (tokenToForward) {
        console.log('[API /api/users/all] Token found by parsing raw Cookie header.');
      } else {
         console.log('[API /api/users/all] session_token not found in raw Cookie header.');
      }
    } else {
       console.log('[API /api/users/all] No raw Cookie header found in request.');
    }
  }


  if (!tokenToForward) {
    console.warn('[API /api/users/all] No session_token found in cookies (checked both methods).');
    return NextResponse.json({ error: 'Unauthorized. No session token found.' }, { status: 401 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/all`;
  console.log(`[API /api/users/all] Forwarding request to external API: ${externalUrl} with token.`);
  
  try {
    const response = await fetch(externalUrl, {
      headers: {
        'Authorization': `Bearer ${tokenToForward}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', 
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[API /api/users/all] External API (${externalUrl}) failed: ${response.status}`, errorData);
      return NextResponse.json({ error: `External API error: ${response.status}`, details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[API /api/users/all] Failed to fetch from External API (${externalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch data from external API', details: error.message }, { status: 500 });
  }
}
