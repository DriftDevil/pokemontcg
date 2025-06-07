
import {NextResponse, type NextRequest} from 'next/server';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    console.error('External API base URL not configured for /api/usage');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/usage`;

  // TODO: Implement proper authentication forwarding if the external API /usage endpoint requires it.
  // For example, if it needs an admin-level OAuth token or API key.
  // const token = request.headers.get('Authorization'); // Or some other mechanism to get an admin token

  try {
    const response = await fetch(externalUrl, {
      headers: {
        // If authentication is needed:
        // 'Authorization': `Bearer ${admin_token_goes_here}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`External API (${externalUrl}) failed: ${response.status}`, errorData);
      return NextResponse.json({ error: `External API error: ${response.status}`, details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Failed to fetch or parse from External API (${externalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch or parse data from external usage API' }, { status: 500 });
  }
}

    