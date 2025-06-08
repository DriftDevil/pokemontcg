
import {NextResponse, type NextRequest} from 'next/server';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET(request: NextRequest) {
  console.log(`[API /api/users/all] GET request received. URL: ${request.url}`);

  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /api/users/all] External API base URL not configured for /api/users/all');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/all`;
  
  // TODO: Implement proper authentication forwarding if the external API requires it.
  // For now, assuming it's either open or auth is handled elsewhere (e.g., proxy headers).
  // const token = request.headers.get('Authorization'); 

  try {
    const response = await fetch(externalUrl, {
      headers: {
        // 'Authorization': token || '', // Forward token if available
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[API /api/users/all] External API (${externalUrl}) failed: ${response.status}`, errorData);
      return NextResponse.json({ error: `External API error: ${response.status}`, details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API /api/users/all] Failed to fetch from External API (${externalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch data from external API' }, { status: 500 });
  }
}

