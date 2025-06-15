
import {NextResponse, type NextRequest} from 'next/server';

const PRIMARY_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const BACKUP_EXTERNAL_API_BASE_URL = 'https://api.pokemontcg.io/v2';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // --- Development Mock Sets ---
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_USER === 'true') {
    console.warn("[API /api/sets] MOCK ADMIN USER ENABLED. Returning mock sets data.");
    
    // Mock for total count used by AdminDashboardPage fetchTotalCountFromPaginated
    if (searchParams.get('limit') === '1' && !searchParams.has('all')) {
      // The dashboard's fetchTotalCountFromPaginated expects 'totalCount' or 'total'.
      return NextResponse.json({ data: [], total: 123, totalCount: 123, page: 1, limit: 1, pageSize: 1, count: 0 });
    }
    
    // Mock for set release chart data used by AdminDashboardPage fetchSetReleaseData
    if (searchParams.get('all') === 'true') {
      const mockSetDataForChart = [
        { id: 'mockset-chart-2023', name: 'Mock Set Alpha (2023)', releaseDate: '2023-03-15', total: 55, printedTotal: 55, images: { symbol: 'https://placehold.co/24x24.png?text=SCA', logo: 'https://placehold.co/100x50.png?text=LCA'} },
        { id: 'mockset-chart-2023-2', name: 'Mock Set Beta (2023)', releaseDate: '2023-09-20', total: 65, printedTotal: 65, images: { symbol: 'https://placehold.co/24x24.png?text=SCB', logo: 'https://placehold.co/100x50.png?text=LCB'} },
        { id: 'mockset-chart-2024', name: 'Mock Set Gamma (2024)', releaseDate: '2024-02-10', total: 75, printedTotal: 75, images: { symbol: 'https://placehold.co/24x24.png?text=SCG', logo: 'https://placehold.co/100x50.png?text=LCG'} },
      ];
      // Ensure the response matches what fetchSetReleaseData expects for its processing
      return NextResponse.json({ data: mockSetDataForChart, total: mockSetDataForChart.length, totalCount: mockSetDataForChart.length, page: 1, count: mockSetDataForChart.length });
    }

    // Mock for general set browsing (e.g., /sets page)
    const mockSetBrowse = {
      id: 'mockset-browse-1',
      name: 'Mock Adventure Set',
      series: 'Mock Series',
      releaseDate: '2023-07-01',
      total: 80, // Used by CardSet interface
      printedTotal: 80,
      images: { symbol: 'https://placehold.co/24x24.png?text=SB1', logo: 'https://placehold.co/200x80.png?text=LogoSB1'}
    };
    return NextResponse.json({
      data: [mockSetBrowse, {...mockSetBrowse, id: "mockset-browse-2", name: "Mock Discovery Set", releaseDate: '2024-01-15'}],
      page: 1,
      limit: 2,    // Primary API might use 'limit'
      pageSize: 2, // Backup API uses 'pageSize'
      count: 2,
      total: 2,       // Primary API uses 'total' for total items
      totalCount: 2   // Backup API uses 'totalCount'
    });
  }
  // --- End Development Mock Sets ---

  if (!PRIMARY_EXTERNAL_API_BASE_URL) {
    console.error('Primary External API base URL not configured');
    // Try backup if primary is not configured
  }

  const queryString = searchParams.toString();
  const primaryExternalUrl = `${PRIMARY_EXTERNAL_API_BASE_URL}/v2/sets${queryString ? `?${queryString}` : ''}`;
  const backupExternalUrl = `${BACKUP_EXTERNAL_API_BASE_URL}/sets${queryString ? `?${queryString}` : ''}`;

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
