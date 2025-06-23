
import {NextResponse, type NextRequest} from 'next/server';
import logger from '@/lib/logger';

const PRIMARY_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const BACKUP_EXTERNAL_API_BASE_URL = 'https://api.pokemontcg.io/v2';
const CONTEXT = 'API /api/types';

export async function GET(request: NextRequest) {
  if (!PRIMARY_EXTERNAL_API_BASE_URL) {
    logger.error(CONTEXT, 'Primary External API base URL not configured');
    // Try backup if primary is not configured
  }

  const primaryExternalUrl = `${PRIMARY_EXTERNAL_API_BASE_URL}/v2/types`;
  const backupExternalUrl = `${BACKUP_EXTERNAL_API_BASE_URL}/types`;

  let response;
  let errorData;

  // Try Primary API
  if (PRIMARY_EXTERNAL_API_BASE_URL) {
    try {
      response = await fetch(primaryExternalUrl);
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
      errorData = await response.text();
      logger.warn(CONTEXT, `Primary API (${primaryExternalUrl}) failed: ${response.status}`, errorData);
    } catch (error) {
      logger.warn(CONTEXT, `Failed to fetch from Primary API (${primaryExternalUrl}):`, error);
    }
  }

  // Try Backup API if Primary failed or was not configured
  logger.info(CONTEXT, `Attempting fetch from Backup API: ${backupExternalUrl}`);
  try {
    response = await fetch(backupExternalUrl);
    if (!response.ok) {
      errorData = await response.text();
      logger.error(CONTEXT, `Backup API (${backupExternalUrl}) also failed: ${response.status}`, errorData);
      return NextResponse.json({ error: `Backup API error: ${response.status}`, details: errorData }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error(CONTEXT, `Failed to fetch from Backup API (${backupExternalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch data from all external APIs' }, { status: 500 });
  }
}
