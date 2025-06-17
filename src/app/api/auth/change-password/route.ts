
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

function getTokenFromCookies(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get('session_token')?.value;
}

export async function POST(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/auth/change-password] External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }

  const token = getTokenFromCookies();
  if (!token) {
    console.warn(`[API ${request.nextUrl.pathname}] No session token found from cookies. Responding with 401.`);
    return NextResponse.json({ message: 'Unauthorized. No session token found.' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!payload.currentPassword || !payload.newPassword) {
    return NextResponse.json({ message: 'Current password and new password are required.' }, { status: 400 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/auth/local/me/change-password`;
  console.log(`[API ${request.nextUrl.pathname}] Forwarding change password request to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      }),
    });

    if (response.status === 204) {
      // Successfully changed password, no content to return
      return new NextResponse(null, { status: 204 });
    }

    // For other statuses, try to parse JSON error response
    const responseData = await response.json().catch(() => ({})); // Gracefully handle non-JSON or empty responses

    if (!response.ok) {
      console.error(`[API ${request.nextUrl.pathname}] External API (${externalUrl}) failed: ${response.status}`, responseData);
      return NextResponse.json(
        { message: responseData.message || `Failed to change password via external API. Status: ${response.status}`, details: responseData.details },
        { status: response.status }
      );
    }

    // Should not happen if 204 is the success, but handle other 2xx if external API changes
    return NextResponse.json(responseData, { status: response.status });

  } catch (error: any) {
    console.error(`[API ${request.nextUrl.pathname}] Failed to call External API (${externalUrl}):`, error);
    return NextResponse.json({ message: 'Failed to change password due to a server error', details: error.message }, { status: 500 });
  }
}
