
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/usage] External API base URL not configured.');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  let token: string | undefined;
  
  try {
    const cookieStore = cookies();
    token = cookieStore.get('session_token')?.value;
    if (token) {
      console.log('[API /api/usage] Token found using next/headers.cookies().');
    } else {
      console.log('[API /api/usage] session_token not found using next/headers.cookies().');
    }
  } catch (e) {
    console.warn('[API /api/usage] Error using next/headers.cookies():', e);
    // If cookies() itself throws, we definitely don't have a token from it.
  }

  if (!token) {
    console.warn('[API /api/usage] No session_token found. Responding with 401.');
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

    