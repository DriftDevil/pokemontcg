
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
    console.error('[API /user/me/collection/cards/add] External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }

  const token = getTokenFromCookies();
  if (!token) {
    console.warn(`[API ${request.nextUrl.pathname}] No session token found. Responding with 401.`);
    return NextResponse.json({ message: 'Unauthorized. No session token found.' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!payload.cardIds || !Array.isArray(payload.cardIds) || payload.cardIds.length === 0) {
    return NextResponse.json({ message: 'cardIds array is required and cannot be empty.' }, { status: 400 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/me/collection/cards/add`;
  console.log(`[API ${request.nextUrl.pathname}] Forwarding add to collection request to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Try to parse JSON, but handle cases where backend might not return JSON (e.g. 204 No Content)
    let responseData;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
    } else {
        responseData = await response.text(); // Or handle as empty if 204
    }
    
    if (!response.ok) {
      console.error(`[API ${request.nextUrl.pathname}] External API (${externalUrl}) failed: ${response.status}`, responseData);
      return NextResponse.json(
        { message: typeof responseData === 'string' ? `External API Error: ${responseData}` : (responseData?.message || `Failed to add cards to collection. Status: ${response.status}`), details: responseData?.details },
        { status: response.status }
      );
    }
    // If successful, pass through the response (could be 200 with data, or 204)
    if (response.status === 204 || !responseData) {
        return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(responseData, { status: response.status });

  } catch (error: any) {
    console.error(`[API ${request.nextUrl.pathname}] Failed to call External API (${externalUrl}):`, error);
    return NextResponse.json({ message: 'Failed to add cards to collection due to a server error', details: error.message }, { status: 500 });
  }
}
