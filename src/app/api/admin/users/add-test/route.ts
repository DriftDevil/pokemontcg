
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieStore = cookies();
  return cookieStore.get('session_token')?.value;
}

export async function POST(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/admin/users/add-test] External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }

  const token = getTokenFromRequest(request);
  if (!token) {
    console.warn(`[API ${request.nextUrl.pathname}] No token found for request. Responding with 401.`);
    return NextResponse.json({ message: 'Unauthorized. No token provided.' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  // Basic validation of payload structure, more detailed validation happens on the client/form
  if (!payload.baseName || typeof payload.count !== 'number' || !payload.emailPrefix || !payload.emailDomain) {
    return NextResponse.json({ message: 'Missing required fields for adding test users.' }, { status: 400 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/admin/add-test`;
  console.log(`[API ${request.nextUrl.pathname}] Forwarding add test users request to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({})); // Catch if body is not JSON

    if (!response.ok) {
      console.error(`[API ${request.nextUrl.pathname}] External API (${externalUrl}) failed: ${response.status}`, responseData);
      return NextResponse.json(
        { message: responseData.message || `Failed to add test users. Status: ${response.status}`, details: responseData.details },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData, { status: response.status });
  } catch (error: any) {
    console.error(`[API ${request.nextUrl.pathname}] Failed to call External API (${externalUrl}):`, error);
    return NextResponse.json({ message: 'Failed to add test users due to a server error', details: error.message }, { status: 500 });
  }
}
