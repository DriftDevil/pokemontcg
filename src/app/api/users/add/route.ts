
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove "Bearer "
  }
  // Fallback for cookies if needed, though Authorization header is standard
  const cookieStore = cookies();
  return cookieStore.get('session_token')?.value;
}

export async function POST(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/users/add] External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }

  const token = getTokenFromRequest(request);
  if (!token) {
    console.warn(`[API ${request.nextUrl.pathname}] No token found for request. Responding with 401.`);
    return NextResponse.json({ message: 'Unauthorized. No token provided.' }, { status: 401 });
  }

  let newUserPayload;
  try {
    newUserPayload = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  // Validate required fields (basic example, use Zod for robust validation if needed)
  if (!newUserPayload.email || !newUserPayload.password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
  }

  // Assuming the admin add user endpoint is now /user/admin/add
  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/admin/add`; 
  console.log(`[API ${request.nextUrl.pathname}] Forwarding add user request to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUserPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`[API ${request.nextUrl.pathname}] External API (${externalUrl}) failed: ${response.status}`, responseData);
      return NextResponse.json(responseData, { status: response.status });
    }

    return NextResponse.json(responseData, { status: response.status }); // response.status could be 201 or 200
  } catch (error: any) {
    console.error(`[API ${request.nextUrl.pathname}] Failed to post to External API (${externalUrl}):`, error);
    return NextResponse.json({ message: 'Failed to add user via external API', details: error.message }, { status: 500 });
  }
}
