
'use server';
import {NextResponse, type NextRequest} from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

// Mock user data, aligning with the structure expected by the frontend (ApiUser interface)
const MOCK_ADMIN_FOR_USER_LIST = {
  id: 'mock-admin-id-007',
  name: 'Mock Admin Dev',
  email: 'mockadmin@develop.ment',
  preferredUsername: 'mockadmin',
  avatarUrl: `https://placehold.co/96x96.png?text=MA`,
  isAdmin: true,
  createdAt: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
};

const MOCK_USER_2 = {
  id: 'mock-user-id-002',
  name: 'Mock User Two',
  email: 'mockuser2@develop.ment',
  preferredUsername: 'mockuser2',
  avatarUrl: `https://placehold.co/96x96.png?text=MU`,
  isAdmin: false,
  createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
  lastSeen: new Date(Date.now() - 3600000).toISOString(),   // An hour ago
};


function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log(`[API ${request.nextUrl.pathname}] Token found in Authorization header.`);
    return authHeader.substring(7); // Remove "Bearer "
  }
  // console.log(`[API ${request.nextUrl.pathname}] Token NOT found in Authorization header. All headers:`, JSON.stringify(Object.fromEntries(request.headers.entries())));


  try {
    const cookieStore = cookies(); // This is Next.js specific cookies() for Route Handlers
    const tokenFromCookie = cookieStore.get('session_token')?.value;
    if (tokenFromCookie) {
      console.log(`[API ${request.nextUrl.pathname}] Token found in session_token cookie as fallback.`);
      return tokenFromCookie;
    }
    // console.log(`[API ${request.nextUrl.pathname}] Token NOT found in session_token cookie as fallback. All request cookies:`, JSON.stringify(cookieStore.getAll()));
  } catch (e) {
    console.warn(`[API ${request.nextUrl.pathname}] Error accessing cookies using next/headers.cookies() for fallback:`, e);
  }
  
  console.log(`[API ${request.nextUrl.pathname}] Token not found in Authorization header or session_token cookie.`);
  return undefined;
}

export async function GET(request: NextRequest) {
  // --- Development Mock Users ---
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_USER === 'true') {
    console.warn("[API /api/users/all] MOCK ADMIN USER ENABLED. Returning mock user list.");
    const mockUsersResponse = {
      data: [MOCK_ADMIN_FOR_USER_LIST, MOCK_USER_2],
      total: 2, // Corresponds to total users count
    };
    return NextResponse.json(mockUsersResponse);
  }
  // --- End Development Mock Users ---

  // console.log(`[API ${request.nextUrl.pathname}] GET request received. URL: ${request.url}`);

  if (!EXTERNAL_API_BASE_URL) {
    console.error(`[API ${request.nextUrl.pathname}] External API base URL not configured.`);
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  const tokenToForward = getTokenFromRequest(request);
  
  // Enhanced logging for the token
  if (tokenToForward) {
    console.log(`[API ${request.nextUrl.pathname}] Token to forward to external API (first 15 chars): ${tokenToForward.substring(0, 15)}...`);
  } else {
    console.warn(`[API ${request.nextUrl.pathname}] No token found to forward. Responding with 401.`);
    return NextResponse.json({ error: 'Unauthorized. No token provided.' }, { status: 401 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/admin/all`;
  // console.log(`[API ${request.nextUrl.pathname}] Forwarding request to external API: ${externalUrl} with token.`);
  
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
