
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

function getTokenFromCookies(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get('session_token')?.value;
}

export async function GET(request: NextRequest, { params }: { params: { setId: string } }) {
  const { setId } = params;
  const CONTEXT = `API /user/me/collection/set/${setId}`;

  if (!EXTERNAL_API_BASE_URL) {
    logger.error(CONTEXT, 'External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }

  if (!setId) {
    return NextResponse.json({ message: 'Set ID is required in the path.' }, { status: 400 });
  }
  
  const token = getTokenFromCookies();
  if (!token) {
    logger.warn(CONTEXT, 'No session token found. Responding with 401.');
    return NextResponse.json({ message: 'Unauthorized. No session token found.' }, { status: 401 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/me/collection/set/${setId}`;
  logger.info(CONTEXT, `Forwarding get collection for set request to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure fresh data for collections
    });

    // It's important to read the body regardless of status for logging/error details
    const responseBodyText = await response.text();
    let responseData;

    if (!response.ok) {
      try {
        responseData = JSON.parse(responseBodyText);
      } catch (e) {
        responseData = responseBodyText; // If not JSON, use text
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
        // This case implies the API responded with 2xx but non-JSON body, which is unexpected for GET
        logger.error(CONTEXT, `External API (${externalUrl}) returned non-JSON success response: ${responseBodyText.substring(0, 200)}`);
        return NextResponse.json({ message: 'Received malformed success response from external API.' }, { status: 502 });
    }
    
    // Assuming the external API returns { data: [ { cardId: string, quantity: number, cardDetails: {...} }, ... ] }
    return NextResponse.json(responseData, { status: response.status });

  } catch (error: any) {
    logger.error(CONTEXT, `Failed to call External API (${externalUrl}):`, error);
    return NextResponse.json({ message: 'Failed to fetch collection for set due to a server error', details: error.message }, { status: 500 });
  }
}
