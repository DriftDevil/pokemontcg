
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('[API /api/usage] Token found in Authorization header.');
    return authHeader.substring(7); // Remove "Bearer "
  }

  try {
    const cookieStore = cookies();
    const tokenFromCookie = cookieStore.get('session_token')?.value;
    if (tokenFromCookie) {
      console.log('[API /api/usage] Token found in session_token cookie.');
      return tokenFromCookie;
    }
  } catch (e) {
    console.warn('[API /api/usage] Error accessing cookies using next/headers.cookies():', e);
  }
  
  console.log('[API /api/usage] Token not found in Authorization header or session_token cookie.');
  return undefined;
}

export async function GET(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/usage] External API base URL not configured.');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  const token = getTokenFromRequest(request);

  if (!token) {
    console.warn('[API /api/usage] No token found in Authorization header or cookies. Responding with 401.');
    return NextResponse.json({ error: 'Unauthorized. No token provided.' }, { status: 401 });
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
