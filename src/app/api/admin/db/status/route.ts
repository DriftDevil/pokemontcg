
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

export async function GET(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    console.error(`[API /admin/db/status] External API base URL not configured.`);
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }
  
  const token = getTokenFromRequest(request);
  if (!token) {
    console.warn(`[API ${request.nextUrl.pathname}] No token found. Responding with 401.`);
    return NextResponse.json({ message: 'Unauthorized. No token provided.' }, { status: 401 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/admin/db/status`;
  console.log(`[API ${request.nextUrl.pathname}] Forwarding GET request to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', 
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`[API ${request.nextUrl.pathname}] External API (${externalUrl}) failed: ${response.status}`, responseData);
      return NextResponse.json(
        { message: responseData.message || `Failed to fetch DB status. Status: ${response.status}`, details: responseData.details },
        { status: response.status }
      );
    }
    
    return NextResponse.json(responseData, { status: response.status });

  } catch (error: any) {
    console.error(`[API ${request.nextUrl.pathname}] Failed to call External API (${externalUrl}):`, error);
    return NextResponse.json({ message: 'Failed to fetch DB status due to a server error', details: error.message }, { status: 500 });
  }
}
