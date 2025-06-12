
'use server';
import {NextResponse, type NextRequest} from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log(`[API ${request.nextUrl.pathname}] Token found in Authorization header.`);
    return authHeader.substring(7); // Remove "Bearer "
  }
  console.log(`[API ${request.nextUrl.pathname}] Token NOT found in Authorization header. All headers:`, JSON.stringify(Object.fromEntries(request.headers.entries())));


  try {
    const cookieStore = cookies(); // This is Next.js specific cookies() for Route Handlers
    const tokenFromCookie = cookieStore.get('session_token')?.value;
    if (tokenFromCookie) {
      console.log(`[API ${request.nextUrl.pathname}] Token found in session_token cookie as fallback.`);
      return tokenFromCookie;
    }
    console.log(`[API ${request.nextUrl.pathname}] Token NOT found in session_token cookie as fallback. All request cookies:`, JSON.stringify(cookieStore.getAll()));
  } catch (e) {
    console.warn(`[API ${request.nextUrl.pathname}] Error accessing cookies using next/headers.cookies() for fallback:`, e);
  }
  
  console.log(`[API ${request.nextUrl.pathname}] Token not found in Authorization header or session_token cookie.`);
  return undefined;
}

export async function GET(request: NextRequest) {
  console.log(`[API ${request.nextUrl.pathname}] GET request received. URL: ${request.url}`);

  if (!EXTERNAL_API_BASE_URL) {
    console.error(`[API ${request.nextUrl.pathname}] External API base URL not configured.`);
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  const tokenToForward = getTokenFromRequest(request);
  
  if (!tokenToForward) {
    console.warn(`[API ${request.nextUrl.pathname}] No token found for request. Responding with 401.`);
    return NextResponse.json({ error: 'Unauthorized. No token provided.' }, { status: 401 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/all`;
  console.log(`[API ${request.nextUrl.pathname}] Forwarding request to external API: ${externalUrl} with token.`);
  
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
      console.error(`[API ${request.nextUrl.pathname}] External API (${externalUrl}) failed: ${response.status}`, errorData);
      return NextResponse.json({ error: `External API error: ${response.status}`, details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[API ${request.nextUrl.pathname}] Failed to fetch from External API (${externalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch data from external API', details: error.message }, { status: 500 });
  }
}

