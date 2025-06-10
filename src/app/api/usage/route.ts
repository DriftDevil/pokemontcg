
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/usage] External API base URL not configured.');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  const cookieStore = cookies();
  // Prioritize OIDC access token if available, otherwise use password-based token
  const oidcAccessToken = cookieStore.get('access_token')?.value;
  const passwordAccessToken = cookieStore.get('password_access_token')?.value;
  
  let token: string | undefined = oidcAccessToken || passwordAccessToken;

  if (!token) {
    console.warn('[API /api/usage] No authentication token found in cookies.');
    return NextResponse.json({ error: 'Unauthorized. No session token found.' }, { status: 401 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/usage`;
  console.log(`[API /api/usage] Forwarding request to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure fresh data
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
