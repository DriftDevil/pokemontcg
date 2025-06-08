
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const COOKIE_SECRET = process.env.COOKIE_SECRET; // For potential future encryption/signing

if (!EXTERNAL_API_BASE_URL) {
  console.error('EXTERNAL_API_BASE_URL is not set. Password login cannot function.');
}
if (!COOKIE_SECRET) {
    console.warn('COOKIE_SECRET is not set. Session cookies will not be signed/encrypted.');
}


export async function POST(request: NextRequest) {
  if (!EXTERNAL_API_BASE_URL) {
    return NextResponse.json({ message: 'API endpoint not configured.', details: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.', details: 'Missing credentials in request.' }, { status: 400 });
    }

    const externalApiUrl = `${EXTERNAL_API_BASE_URL}/login/password`;
    console.log(`Attempting password login to external API: ${externalApiUrl}`);

    const apiResponse = await fetch(externalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!apiResponse.ok) {
      let errorDetails = `External API returned status ${apiResponse.status}`;
      let responseBodyText = '';
      try {
        responseBodyText = await apiResponse.text();
        const parsedError = JSON.parse(responseBodyText);
        errorDetails = parsedError.message || parsedError.detail || responseBodyText;
      } catch (e) {
        // If parsing as JSON fails, use the raw text (or part of it)
        errorDetails = responseBodyText.substring(0, 200) + (responseBodyText.length > 200 ? '...' : '') || `External API request failed with status ${apiResponse.status}`;
        console.warn('External API error response was not valid JSON:', responseBodyText.substring(0, 500));
      }
      console.error(`External API login failed: ${apiResponse.status}`, errorDetails);
      return NextResponse.json(
        { message: 'Login failed at external API.', details: errorDetails },
        { status: apiResponse.status }
      );
    }

    let responseData;
    try {
        responseData = await apiResponse.json();
    } catch (e) {
        const errorText = await apiResponse.text(); // Re-fetch text if json() fails.
        console.error('External API sent non-JSON response even on OK status:', e, errorText.substring(0,500));
        return NextResponse.json(
            { message: 'Received invalid data format from authentication service.', details: 'The authentication service responded successfully but the data was not in the expected format.' },
            { status: 502 } // Bad Gateway
        );
    }

    const token = responseData.token;
    if (!token) {
      console.error('Token not found in external API response:', responseData);
      return NextResponse.json({ message: 'Token not found in API response.', details: 'Authentication service did not provide a token.' }, { status: 500 });
    }

    cookies().set('password_access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days, adjust as needed
    });

    return NextResponse.json({ message: 'Login successful' }, { status: 200 });

  } catch (error: any) {
    console.error('Password login internal error:', error);
    let errorMessage = 'An unexpected error occurred during password login.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: 'Internal server error during login.', details: errorMessage }, { status: 500 });
  }
}

