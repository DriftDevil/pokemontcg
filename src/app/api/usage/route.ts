
'use server';
import { NextRequest, NextResponse } from 'next/server';
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
  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/usage] External API base URL not configured.');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  let token: string | undefined;
  
  // Try next/headers.cookies() first
  try {
    const cookieStore = cookies(); // This might throw if used incorrectly or in wrong context
    token = cookieStore.get('session_token')?.value;
    if (token) {
      console.log('[API /api/usage] Token found using next/headers.cookies().');
    }
  } catch (e) {
    console.warn('[API /api/usage] Error using next/headers.cookies():', e, '- Will try parsing header directly.');
  }

  // Fallback: If token not found via cookies(), try parsing the Cookie header directly from the incoming request
  if (!token) {
    const rawCookieHeader = request.headers.get('Cookie');
    if (rawCookieHeader) {
      console.log('[API /api/usage] Attempting to parse token from raw Cookie header:', rawCookieHeader);
      const parsedCookies = parseCookieString(rawCookieHeader);
      token = parsedCookies['session_token'];
      if (token) {
        console.log('[API /api/usage] Token found by parsing raw Cookie header.');
      } else {
        console.log('[API /api/usage] session_token not found in raw Cookie header.');
      }
    } else {
      console.log('[API /api/usage] No raw Cookie header found in request.');
    }
  }


  if (!token) {
    console.warn('[API /api/usage] No session_token found in cookies (checked both methods).');
    return NextResponse.json({ error: 'Unauthorized. No session token found.' }, { status: 401 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/usage`;
  console.log(`[API /api/usage] Forwarding request to external API: ${externalUrl} with token.`);

  try {
    const response = await fetch(externalUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', 
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[API /api/usage] External API (${externalUrl}) failed: ${response.status}`, errorBody);
      return NextResponse.json({ error: `External API error: ${response.status}`, details: errorBody }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[API /api/usage] Failed to fetch from External API (${externalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch data from external usage API', details: error.message }, { status: 500 });
  }
}
