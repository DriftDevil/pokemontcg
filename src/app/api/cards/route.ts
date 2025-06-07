
import {NextResponse, type NextRequest} from 'next/server';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    console.error('External API base URL not configured');
    return NextResponse.json({ error: 'External API base URL not configured' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams.toString();
  const externalUrl = `${EXTERNAL_API_BASE_URL}/cards${searchParams ? `?${searchParams}` : ''}`;

  try {
    const response = await fetch(externalUrl);
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Error from external API (${externalUrl}): ${response.status}`, errorData);
      return NextResponse.json({ error: `External API error: ${response.status}`, details: errorData }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Failed to fetch from external API (${externalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch data from external API' }, { status: 500 });
  }
}
