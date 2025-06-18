
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { subDays, format } from 'date-fns';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieStore = cookies();
  return cookieStore.get('session_token')?.value;
}

// Expected response: [{ date: 'YYYY-MM-DD', count: 15 }, ...]
export async function GET(request: NextRequest) {
  // --- Development Mock ---
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_USER === 'true') {
    console.warn("[API /api/analytics/cards-added-daily] MOCK ADMIN USER ENABLED. Returning mock data.");
    const mockData = [];
    for (let i = 29; i >= 0; i--) {
      mockData.push({
        date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
        count: Math.floor(Math.random() * 50) + 5,
      });
    }
    return NextResponse.json(mockData);
  }
  // --- End Development Mock ---

  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /analytics/cards-added-daily] External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }

  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  // Replace with your actual external API endpoint (e.g., including date range params)
  const externalUrl = `${EXTERNAL_API_BASE_URL}/v2/analytics/cards-added-over-time?period=daily&range=30d`;

  try {
    const response = await fetch(externalUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API /analytics/cards-added-daily] External API error: ${response.status} ${errorText}`);
      // For now, return empty array on error to allow chart to render with "no data"
      return NextResponse.json([], { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[API /analytics/cards-added-daily] Fetch error: ${error.message}`);
    return NextResponse.json([], { status: 500 }); // Return empty array on error
  }
}
