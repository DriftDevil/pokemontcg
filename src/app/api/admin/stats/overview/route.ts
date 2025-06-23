
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { subDays, format } from 'date-fns';
import logger from '@/lib/logger';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const CONTEXT = "API /api/admin/stats/overview";

function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieStore = cookies();
  return cookieStore.get('session_token')?.value;
}

// Interface for the expected structure of the backend response
interface AdminStatsOverviewResponse {
  cardsAddedPerDay: { date: string; count: number }[];
  cardsBySupertype: { label: string; count: number }[];
  cardsByType: { label: string; count: number }[];
}

export async function GET(request: NextRequest) {
  // --- Development Mock ---
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_USER === 'true') {
    logger.warn(CONTEXT, "MOCK ADMIN USER ENABLED. Returning mock overview data.");
    const mockCardsAddedPerDay = [];
    for (let i = 29; i >= 0; i--) {
      mockCardsAddedPerDay.push({
        date: format(subDays(new Date(), i), 'yyyy-MM-dd'), // Ensure date is in YYYY-MM-DD string format
        count: Math.floor(Math.random() * 50) + 5,
      });
    }
    const mockData: AdminStatsOverviewResponse = {
      cardsAddedPerDay: mockCardsAddedPerDay,
      cardsBySupertype: [
        { label: 'Pokémon', count: Math.floor(Math.random() * 5000) + 1000 },
        { label: 'Trainer', count: Math.floor(Math.random() * 1000) + 200 },
        { label: 'Energy', count: Math.floor(Math.random() * 500) + 100 },
      ],
      cardsByType: [ 
        { label: 'Water', count: Math.floor(Math.random() * 500) + 100 },
        { label: 'Fire', count: Math.floor(Math.random() * 400) + 80 },
      ],
    };
    return NextResponse.json(mockData);
  }
  // --- End Development Mock ---

  if (!EXTERNAL_API_BASE_URL) {
    logger.error(CONTEXT, 'External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }

  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  const externalUrl = `${EXTERNAL_API_BASE_URL}/admin/stats/overview`;

  try {
    const response = await fetch(externalUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(CONTEXT, `External API error: ${response.status} ${errorText}`);
      // Return a structure that matches AdminStatsOverviewResponse with empty arrays on error
      return NextResponse.json(
        { cardsAddedPerDay: [], cardsBySupertype: [], cardsByType: [] },
        { status: response.status }
      );
    }
    const data: AdminStatsOverviewResponse = await response.json();
    // Note: Date formatting for cardsAddedPerDay.date (from ISO to YYYY-MM-DD string)
    // will be handled in the AdminDashboardPage component itself before passing to the chart.
    // This API proxy should return the data as is from the backend.
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error(CONTEXT, `Fetch error: ${error.message}`);
    return NextResponse.json(
      { cardsAddedPerDay: [], cardsBySupertype: [], cardsByType: [] }, 
      { status: 500 }
    );
  }
}
