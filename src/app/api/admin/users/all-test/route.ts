
'use server';
import {NextResponse, type NextRequest} from 'next/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const CONTEXT = "API /api/admin/users/all-test";

function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieStore = cookies();
  return cookieStore.get('session_token')?.value;
}

export async function GET(request: NextRequest) {
  // --- Development Mock Test Users ---
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_USER === 'true') {
    logger.warn(CONTEXT, "MOCK ADMIN USER ENABLED. Returning mock test user list.");
    const mockTestUsers = [
      { id: 'mock-test-user-1', email: 'testuser1@example.com', name: 'Test User Alpha' },
      { id: 'mock-test-user-2', email: 'testuser2@example.com', name: 'Test User Beta' },
      { id: 'mock-test-user-3', email: 'anotherprefix1@example.com', name: 'Another Test Gamma' },
    ];
    return NextResponse.json({ data: mockTestUsers, total: mockTestUsers.length });
  }
  // --- End Development Mock Test Users ---

  if (!EXTERNAL_API_BASE_URL) {
    logger.error(CONTEXT, 'External API base URL not configured.');
    return NextResponse.json({ error: 'External API URL not configured' }, { status: 500 });
  }

  const tokenToForward = getTokenFromRequest(request);

  if (!tokenToForward) {
    logger.warn(CONTEXT, 'No token found to forward. Responding with 401.');
    return NextResponse.json({ error: 'Unauthorized. No token provided.' }, { status: 401 });
  }

  const externalUrl = `${EXTERNAL_API_BASE_URL}/user/admin/all-test`;
  logger.info(CONTEXT, `Forwarding request to external API: ${externalUrl}`);

  try {
    const response = await fetch(externalUrl, {
      headers: {
        'Authorization': `Bearer ${tokenToForward}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error(CONTEXT, `External API (${externalUrl}) failed: ${response.status}`, errorData);
      return NextResponse.json({ error: `External API error: ${response.status}`, details: errorData }, { status: response.status });
    }

    const data = await response.json();
    // Assuming the backend returns { data: TestUser[], total: number } or similar
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error(CONTEXT, `Failed to fetch from External API (${externalUrl}):`, error);
    return NextResponse.json({ error: 'Failed to fetch data from external API', details: error.message }, { status: 500 });
  }
}
