
import {NextResponse, type NextRequest} from 'next/server';

const PRIMARY_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const BACKUP_EXTERNAL_API_BASE_URL = 'https://api.pokemontcg.io/v2';

export async function GET(request: NextRequest) {
  if (!PRIMARY_EXTERNAL_API_BASE_URL) {
    console.error('Primary External API base URL not configured');
    // Try backup if primary is not configured
  }

  const searchParams = request.nextUrl.searchParams.toString();
  // Assuming PRIMARY_EXTERNAL_API_BASE_URL is like https://host.com/v2
  const primaryExternalUrl = `${PRIMARY_EXTERNAL_API_BASE_URL}/sets${searchParams ? `?${searchParams}` : ''}`;
  const backupExternalUrl = `${BACKUP_EXTERNAL_API_BASE_URL}/sets${searchParams ? `?${searchParams}` : ''}`;

  let response;
  let errorData;

  // Try Primary API
  if (PRIMARY_EXTERNAL_API_BASE_URL) {
    try {
      response = await fetch(primaryExternalUrl, {
        headers: {
          // Add any necessary headers for the external API
        }
      });
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
      errorData = await response.text();
      console.warn(`Primary API (${primaryExternalUrl}) failed: ${response.status}`, errorData);
    } catch (error) {
      console.warn(`Failed to fetch from Primary API (${primaryExternalUrl}):`, error);
    }
  }

  // Try Backup API if Primary failed or was not configured
  console.log(`Attempting fetch from Backup API: ${backupExternalUrl}`);
  try {
    response = await fetch(backupExternalUrl, {
      headers: {
        // Add any necessary headers for the external API
      }
    });
    if (!response.ok) {
      errorData = await response.text();
      console.error(`Backup API (${backupExternalUrl}) also failed: ${response.status}`, errorData);
      return NextResponse.json({ error: `Backup API error: ${response.status}`, details: errorData }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Failed to fetch from Backup API (${backupExternalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch data from all external APIs' }, { status: 500 });
  }
}
