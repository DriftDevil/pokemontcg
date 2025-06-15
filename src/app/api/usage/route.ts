
'use server';
import { NextRequest, NextResponse } from 'next/server';
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
  // --- Development Mock Usage ---
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_USER === 'true') {
    console.warn("[API /api/usage] MOCK ADMIN USER ENABLED. Returning mock API usage data.");
    const mockUsageResponse = {
      requestCountLast24h: 1337, // Mock value for API requests in the last 24h
      // Add other mock fields if your component expects them from the /usage endpoint.
      // For example, if AdminDashboardPage expects other stats from this endpoint.
    };
    return NextResponse.json(mockUsageResponse);
  }
  // --- End Development Mock Usage ---

  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/usage] External API base URL not configured.');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  const token = getTokenFromRequest(request);

  if (!token) {
    console.warn(`[API ${request.nextUrl.pathname}] No token found for request. Responding with 401.`);
    return NextResponse.json({ error: 'Unauthorized. No token provided.' }, { status: 401 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/usage`;
  console.log(`[API ${request.nextUrl.pathname}] Forwarding request to external API: ${externalUrl} with token.`);

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
      console.error(`[API ${request.nextUrl.pathname}] External API (${externalUrl}) failed: ${response.status}`, errorBody);
      return NextResponse.json({ error: `External API error: ${response.status}`, details: errorBody }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[API ${request.nextUrl.pathname}] Failed to fetch from External API (${externalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch data from external usage API', details: error.message }, { status: 500 });
  }
}

