
'use server';
import {NextResponse, type NextRequest} from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET(request: NextRequest) {
  console.log(`[API /api/users/all] GET request received. URL: ${request.url}`);

  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/users/all] External API base URL not configured for /api/users/all');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const oidcAccessToken = cookieStore.get('access_token')?.value;
  const passwordAccessToken = cookieStore.get('password_access_token')?.value;
  
  const tokenToForward = oidcAccessToken || passwordAccessToken;

  if (!tokenToForward) {
    console.warn('[API /api/users/all] No authentication token found in cookies.');
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
      cache: 'no-store', // Ensure fresh data
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

