
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieStore = cookies();
  return cookieStore.get('session_token')?.value;
}

// Expected response: [{ name: 'Pokémon', value: 1200 }, { name: 'Trainer', value: 300 }, ...]
export async function GET(request: NextRequest) {
  // --- Development Mock ---
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_USER === 'true') {
    console.warn("[API /api/analytics/cards-by-supertype] MOCK ADMIN USER ENABLED. Returning mock data.");
    return NextResponse.json([
      { name: 'Pokémon', value: Math.floor(Math.random() * 5000) + 1000 },
      { name: 'Trainer', value: Math.floor(Math.random() * 1000) + 200 },
      { name: 'Energy', value: Math.floor(Math.random() * 500) + 100 },
    ]);
  }
  // --- End Development Mock ---

  if (!EXTERNAL_API_BASE_URL) {
    console.error('[API /analytics/cards-by-supertype] External API base URL not configured.');
    return NextResponse.json({ message: 'External API URL not configured' }, { status: 500 });
  }
  
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Replace with your actual external API endpoint if different
  const externalUrl = `${EXTERNAL_API_BASE_URL}/v2/analytics/cards-by-supertype`; 

  try {
    const response = await fetch(externalUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API /analytics/cards-by-supertype] External API error: ${response.status} ${errorText}`);
      // For now, return empty array on error to allow chart to render with "no data"
      return NextResponse.json([], { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[API /analytics/cards-by-supertype] Fetch error: ${error.message}`);
    return NextResponse.json([], { status: 500 }); // Return empty array on error
  }
}
