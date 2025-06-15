
import {NextResponse, type NextRequest} from 'next/server';

const PRIMARY_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const BACKUP_EXTERNAL_API_BASE_URL = 'https://api.pokemontcg.io/v2';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Set ID is required' }, { status: 400 });
  }

  const primaryExternalUrl = `${PRIMARY_EXTERNAL_API_BASE_URL}/v2/sets/${id}`;
  // Note: pokemontcg.io uses /sets/:id for a single set
  const backupExternalUrl = `${BACKUP_EXTERNAL_API_BASE_URL}/sets/${id}`; 

  let response;
  let errorData;
  let responseData;

  // Try Primary API
  if (PRIMARY_EXTERNAL_API_BASE_URL) {
    try {
      console.log(`[API /api/sets/${id}] Attempting fetch from Primary API: ${primaryExternalUrl}`);
      response = await fetch(primaryExternalUrl);
      if (response.ok) {
        responseData = await response.json();
        // The primary API might return the set object directly, or nested under 'data'.
        // We want to ensure consistency for the frontend, so if it's direct, wrap it.
        // If it's already { data: {...} }, then responseData.data will be the object.
        // If your primary API for a single set returns { "id": "xy1", ... }, wrap it.
        // If it returns { "data": { "id": "xy1", ...} }, use responseData.data.
        // For this example, we assume the primary API might return it directly.
        // If it's always nested (like /v2/cards/{id} often is), this logic might simplify.
        const setDetail = responseData.data ? responseData.data : responseData;
        return NextResponse.json({ data: setDetail });
      }
      // If primary returns 404, it's definitive for a specific ID.
      if (response.status === 404) {
        errorData = await response.text();
        console.log(`[API /api/sets/${id}] Set not found at Primary API (${primaryExternalUrl}): 404`);
        return NextResponse.json({ error: 'Set not found from primary external API' , details: errorData }, { status: 404 });
      }
      errorData = await response.text();
      console.warn(`[API /api/sets/${id}] Primary API (${primaryExternalUrl}) failed: ${response.status}`, errorData);
    } catch (error) {
      console.warn(`[API /api/sets/${id}] Failed to fetch from Primary API (${primaryExternalUrl}):`, error);
    }
  } else {
    console.log(`[API /api/sets/${id}] Primary External API base URL not configured. Proceeding to backup.`);
  }

  // Try Backup API if Primary failed (for non-404 reasons) or was not configured
  console.log(`[API /api/sets/${id}] Attempting fetch from Backup API: ${backupExternalUrl}`);
  try {
    response = await fetch(backupExternalUrl);
    if (!response.ok) {
      errorData = await response.text();
      console.error(`[API /api/sets/${id}] Backup API (${backupExternalUrl}) also failed: ${response.status}`, errorData);
      if (response.status === 404) {
        return NextResponse.json({ error: 'Set not found from backup external API', details: errorData }, { status: 404 });
      }
      return NextResponse.json({ error: `Backup API error: ${response.status}`, details: errorData }, { status: response.status });
    }
    responseData = await response.json();
    // pokemontcg.io API for a single set nests the object under 'data'.
    // So, responseData will be { data: { ...set_object... } }
    // We return this directly as our internal API also uses the 'data' wrapper.
    return NextResponse.json(responseData); 
  } catch (error) {
    console.error(`[API /api/sets/${id}] Failed to fetch from Backup API (${backupExternalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch data from all external APIs' }, { status: 500 });
  }
}
