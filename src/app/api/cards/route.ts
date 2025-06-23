
import {NextResponse, type NextRequest} from 'next/server';
import logger from '@/lib/logger';

const PRIMARY_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const BACKUP_EXTERNAL_API_BASE_URL = 'https://api.pokemontcg.io/v2';
const CONTEXT = "API /api/cards";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // --- Development Mock Cards ---
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_USER === 'true') {
    logger.warn(CONTEXT, "MOCK ADMIN USER ENABLED. Returning mock cards data.");
    // Mock for total count used by AdminDashboardPage
    if (searchParams.get('limit') === '1') {
      // The dashboard's fetchTotalCountFromPaginated expects 'totalCount' or 'total'.
      // The primary API uses 'total', backup uses 'totalCount'.
      // Let's provide both for robustness in mock.
      return NextResponse.json({ data: [], total: 789, totalCount: 789, page: 1, limit: 1, pageSize: 1, count: 0 });
    }
    // Mock for general card browsing if needed (e.g., if admin browses cards)
    const mockCard = {
      id: "mock-card-01",
      name: "Mock Pikachu",
      set: { id: "mockset1", name: "Mock Set" }, // Include set.id if card filters rely on it
      rarity: "Mock Rare",
      types: ["Lightning"],
      images: { small: "https://placehold.co/245x342.png?text=MP", large: "https://placehold.co/400x557.png?text=MPL" },
      number: "M01",
      artist: "Mock Artist",
      // Add other fields from ApiPokemonCardSource / PokemonCard if needed by components
    };
    return NextResponse.json({
      data: [mockCard, {...mockCard, id: "mock-card-02", name: "Mock Charmander", types: ["Fire"], number: "M02"}],
      page: 1,
      pageSize: 2, // pokemontcg.io uses pageSize
      limit: 2,    // external API might use limit
      count: 2,
      totalCount: 2, // pokemontcg.io uses totalCount
      total: 2       // external API might use total
    });
  }
  // --- End Development Mock Cards ---

  if (!PRIMARY_EXTERNAL_API_BASE_URL) {
    logger.error(CONTEXT, 'Primary External API base URL not configured');
    // Try backup if primary is not configured
  }

  const queryString = searchParams.toString(); // Use the original searchParams from request
  const primaryExternalUrl = `${PRIMARY_EXTERNAL_API_BASE_URL}/v2/cards${queryString ? `?${queryString}` : ''}`;
  const backupExternalUrl = `${BACKUP_EXTERNAL_API_BASE_URL}/cards${queryString ? `?${queryString}` : ''}`;
  
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
