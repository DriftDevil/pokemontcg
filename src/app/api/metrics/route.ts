
import {NextResponse, type NextRequest} from 'next/server';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    console.error('External API base URL not configured for /api/metrics');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/metrics`;
  
  // TODO: Implement proper authentication forwarding if the external API requires it.
  // For now, assuming it's either public or auth is handled elsewhere (e.g., proxy headers).
  // const token = request.headers.get('Authorization'); 

  try {
    const response = await fetch(externalUrl, {
      headers: {
        // 'Authorization': token || '', // Forward token if available
        'Content-Type': 'application/json', // Assuming JSON response from /metrics
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`External API (${externalUrl}) failed: ${response.status}`, errorData);
      return NextResponse.json({ error: `External API error: ${response.status}`, details: errorData }, { status: response.status });
    }

    // Try to parse as JSON. If it's Prometheus format, this will fail.
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Failed to fetch or parse from External API (${externalUrl}):`, error);
    // If parsing fails, it might be Prometheus format. For now, return generic error.
    // A more robust solution would check Content-Type or try-catch Prometheus parsing.
    return NextResponse.json({ error: 'Failed to fetch or parse data from external metrics API' }, { status: 500 });
  }
}

    