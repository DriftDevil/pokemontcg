
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const CONTEXT = "API /api/admin/users/remove-test";

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
    logger.error(CONTEXT, 'External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }

  const token = getTokenFromRequest(request);
  if (!token) {
    logger.warn(CONTEXT, 'No token found for request. Responding with 401.');
    return NextResponse.json({ message: 'Unauthorized. No token provided.' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!payload.emailPrefix || !payload.emailDomain || typeof payload.count !== 'number' || payload.count <= 0) {
    return NextResponse.json({ message: 'Missing or invalid fields for removing test users (emailPrefix, emailDomain, count > 0).' }, { status: 400 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/admin/delete-test-last`;
  logger.info(CONTEXT, `Forwarding remove test users request (with count: ${payload.count}) to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      method: 'POST', 
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload), // Forward the payload including count
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      logger.error(CONTEXT, `External API (${externalUrl}) failed: ${response.status}`, responseData);
      return NextResponse.json(
        { message: responseData.message || `Failed to remove test users. Status: ${response.status}`, details: responseData.details },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData, { status: response.status });
  } catch (error: any) {
    logger.error(CONTEXT, `Failed to call External API (${externalUrl}):`, error);
    return NextResponse.json({ message: 'Failed to remove test users due to a server error', details: error.message }, { status: 500 });
  }
}
