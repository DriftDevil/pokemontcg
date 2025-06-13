
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

function getTokenFromCookies(): string | undefined {
  // In Route Handlers, cookies() is the way to get HttpOnly cookies
  const cookieStore = cookies();
  return cookieStore.get('session_token')?.value;
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;

  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/users/remove] External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }

  if (!userId) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  const token = getTokenFromCookies();
  if (!token) {
    console.warn(`[API ${request.nextUrl.pathname}] No token found from cookies. Responding with 401.`);
    return NextResponse.json({ message: 'Unauthorized. No session token found.' }, { status: 401 });
  }

  // Assuming the external API expects DELETE /user/remove/{userId}
  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/remove/${userId}`;
  console.log(`[API ${request.nextUrl.pathname}] Forwarding delete user request to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json', // Usually not needed for DELETE but can be included
      },
    });

    // If the external API returns no content on successful delete (e.g., 204 No Content)
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    // For other statuses, try to parse JSON
    const responseData = await response.json().catch(() => ({})); // Gracefully handle non-JSON or empty responses

    if (!response.ok) {
      console.error(`[API ${request.nextUrl.pathname}] External API (${externalUrl}) failed: ${response.status}`, responseData);
      return NextResponse.json(
        { message: responseData.message || `Failed to delete user via external API. Status: ${response.status}`, details: responseData.details }, 
        { status: response.status }
      );
    }

    // If external API returns JSON on successful delete (e.g., 200 OK with a message)
    return NextResponse.json(responseData, { status: response.status });
  } catch (error: any) {
    console.error(`[API ${request.nextUrl.pathname}] Failed to call External API (${externalUrl}):`, error);
    return NextResponse.json({ message: 'Failed to delete user via external API', details: error.message }, { status: 500 });
  }
}
