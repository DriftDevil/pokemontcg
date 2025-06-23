
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieStore = cookies();
  return cookieStore.get('session_token')?.value;
}

export async function GET(request: NextRequest, { params }: { params: { userID: string, setID: string } }) {
  const { userID, setID } = params;
  const CONTEXT = `API /admin/users/${userID}/collection/cards/set/${setID}`;

  if (!EXTERNAL_API_BASE_URL) {
    logger.error(CONTEXT, 'External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }

  if (!userID) {
    return NextResponse.json({ message: 'User ID is required in the path.' }, { status: 400 });
  }
  if (!setID) {
    return NextResponse.json({ message: 'Set ID is required in the path.' }, { status: 400 });
  }
  
  const token = getTokenFromRequest(request);
  if (!token) {
    logger.warn(CONTEXT, 'No token found. Responding with 401.');
    return NextResponse.json({ message: 'Unauthorized. No token provided.' }, { status: 401 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/admin/${userID}/collection/cards/set/${setID}`;
  logger.info(CONTEXT, `Forwarding get collection for user ${userID}, set ${setID} request to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', 
    });

    const responseBodyText = await response.text();
    let responseData;

    if (!response.ok) {
      try {
        responseData = JSON.parse(responseBodyText);
      } catch (e) {
        responseData = responseBodyText; 
      }
      logger.error(CONTEXT, `External API (${externalUrl}) failed: ${response.status}`, responseData);
      return NextResponse.json(
        { message: typeof responseData === 'string' ? `External API Error: ${responseData}` : (responseData?.message || `Failed to fetch collection for set. Status: ${response.status}`), details: responseData?.details },
        { status: response.status }
      );
    }

    try {
        responseData = JSON.parse(responseBodyText);
    } catch (e) {
        logger.error(CONTEXT, `External API (${externalUrl}) returned non-JSON success response: ${responseBodyText.substring(0, 200)}`);
        return NextResponse.json({ message: 'Received malformed success response from external API.' }, { status: 502 });
    }
    
    return NextResponse.json(responseData, { status: response.status });

  } catch (error: any) {
    logger.error(CONTEXT, `Failed to call External API (${externalUrl}):`, error);
    return NextResponse.json({ message: 'Failed to fetch collection for set due to a server error', details: error.message }, { status: 500 });
  }
}
