
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const COOKIE_SECRET = process.env.COOKIE_SECRET; 

if (!EXTERNAL_API_BASE_URL) {
  console.error('[API Password Login] EXTERNAL_API_BASE_URL is not set. Password login cannot function.');
}
if (!COOKIE_SECRET) {
    console.warn('[API Password Login] COOKIE_SECRET is not set. Session cookies will not be signed/encrypted.');
}


export async function POST(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    return NextResponse.json({ message: 'API endpoint not configured.', details: 'Server configuration error: EXTERNAL_API_BASE_URL not set.' }, { status: 500 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.', details: 'Missing credentials in request.' }, { status: 400 });
    }

    const externalApiUrl = `${EXTERNAL_API_BASE_URL}/auth/local/login`;
    console.log(`[API Password Login] Attempting password login to external API: ${externalApiUrl}`);

    const apiResponse = await fetch(externalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    let responseData;
    const responseBodyText = await apiResponse.text(); 

    if (!apiResponse.ok) {
      let errorDetails = `External API returned status ${apiResponse.status}.`;
      try {
        const parsedError = JSON.parse(responseBodyText);
        errorDetails = parsedError.message || parsedError.detail || responseBodyText;
      } catch (e) {
        errorDetails = responseBodyText.substring(0, 500) + (responseBodyText.length > 500 ? '...' : '') || `External API request failed with status ${apiResponse.status}`;
        if (responseBodyText.toLowerCase().includes('<html')) {
            errorDetails = `External API returned an HTML page (status ${apiResponse.status}), not JSON. Check if the URL is correct or if the API is down.`;
        }
        console.warn(`[API Password Login] External API error response was not valid JSON (or was HTML): ${responseBodyText.substring(0, 200)}...`);
      }
      console.error(`[API Password Login] External API login failed: ${apiResponse.status}`, errorDetails);
      return NextResponse.json(
        { message: 'Login failed at external API.', details: errorDetails },
        { status: apiResponse.status } 
      );
    }

    try {
        responseData = JSON.parse(responseBodyText);
    } catch (e) {
        console.error('[API Password Login] External API sent non-JSON response even on OK status:', e, responseBodyText.substring(0,500));
        return NextResponse.json(
            { message: 'Received invalid data format from authentication service.', details: 'The authentication service responded successfully but the data was not in the expected JSON format.' },
            { status: 502 } // Bad Gateway
        );
    }

    console.log('[API Password Login] Full response from external auth service:', JSON.stringify(responseData, null, 2));

    const token = responseData.accessToken; // Changed from responseData.token
    if (!token) {
      console.error('[API Password Login] Token not found in external API response. Expected "accessToken" field. Received:', responseData);
      return NextResponse.json({ message: 'Authentication service did not provide a token.', details: 'Authentication service provided a response, but it did not contain an "accessToken" field. Check server logs for the full response.' }, { status: 500 });
    }

    cookies().set('password_access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days, adjust as needed
    });

    // Assuming the response might also contain user details directly, or we might fetch them separately.
    // For now, just acknowledge successful token retrieval.
    // The /api/auth/user route will be responsible for fetching user details using this token.
    // If your login response directly contains user data (e.g., responseData.user or responseData.data.user),
    // you could return it here.
    // For now, let's send back a generic success and the user info if available in response.
    const user = responseData.user || responseData.data; 
    return NextResponse.json({ message: 'Login successful', user: user }, { status: 200 });

  } catch (error: any) {
    console.error('[API Password Login] Internal error:', error);
    let errorMessage = 'An unexpected error occurred during password login.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: 'Internal server error during login.', details: errorMessage }, { status: 500 });
  }
}

