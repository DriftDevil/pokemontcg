
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

// Log the EXTERNAL_API_BASE_URL at module load time to check its availability.
const MODULE_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
if (!MODULE_EXTERNAL_API_BASE_URL) {
  console.error('[API Password Login Module] CRITICAL: EXTERNAL_API_BASE_URL environment variable is not set AT MODULE LOAD. Password login WILL FAIL.');
} else {
  console.log(`[API Password Login Module] EXTERNAL_API_BASE_URL is configured at module load: ${MODULE_EXTERNAL_API_BASE_URL}`);
}

export async function POST(request: NextRequest) {
  const currentExternalApiBaseUrl = process.env.EXTERNAL_API_BASE_URL;

  if (!currentExternalApiBaseUrl) {
    console.error('[API Password Login POST] Critical: EXTERNAL_API_BASE_URL is not set at request time. Password login cannot function.');
    return NextResponse.json({ message: 'API endpoint not configured.', details: 'Server configuration error: EXTERNAL_API_BASE_URL not set.' }, { status: 500 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.', details: 'Missing credentials in request.' }, { status: 400 });
    }
    
    console.log(`[API Password Login] Attempting password login for email: ${email} to external API: ${currentExternalApiBaseUrl}/auth/local/login`);

    const apiResponse = await fetch(`${currentExternalApiBaseUrl}/auth/local/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const responseBodyText = await apiResponse.text();
    let responseData;

    if (!apiResponse.ok) {
      let errorDetails: string;
      const contentType = apiResponse.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        try {
          const parsedError = JSON.parse(responseBodyText);
          errorDetails = parsedError.details || parsedError.message || parsedError.error_description || parsedError.error || responseBodyText;
        } catch (e) {
          errorDetails = `External API returned status ${apiResponse.status} with non-JSON body: ${responseBodyText.substring(0, 200)}...`;
        }
      } else if (responseBodyText && responseBodyText.toLowerCase().includes('<html')) {
        errorDetails = `External API returned an HTML page (status ${apiResponse.status}). URL: ${currentExternalApiBaseUrl}/auth/local/login. Check API configuration or if the external API is down.`;
        console.warn(`[API Password Login] External API returned HTML for email ${email}: ${responseBodyText.substring(0, 200)}...`);
      } else if (responseBodyText) {
        errorDetails = `External API request failed with status ${apiResponse.status}. Response: ${responseBodyText.substring(0, 500)}`;
      } else {
        errorDetails = `External API request failed with status ${apiResponse.status} and an empty response body. URL: ${currentExternalApiBaseUrl}/auth/local/login.`;
      }
      
      console.error(`[API Password Login] External API login failed for email ${email}: ${apiResponse.status}`, errorDetails);
      return NextResponse.json(
        { message: 'Login failed at external API.', details: errorDetails },
        { status: apiResponse.status }
      );
    }

    try {
        const contentType = apiResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            responseData = JSON.parse(responseBodyText);
        } else {
            console.error(`[API Password Login] External API success response for email ${email} was not JSON. Content-Type: ${contentType}. Body: ${responseBodyText.substring(0,500)}...`);
            return NextResponse.json(
                { message: 'Received invalid data format from authentication service despite success status.', details: 'The authentication service responded successfully but the data was not in the expected JSON format.' },
                { status: 502 }
            );
        }
    } catch (e: any) {
        console.error(`[API Password Login] Error parsing successful external API response for email ${email} as JSON:`, e.message, `Body: ${responseBodyText.substring(0,500)}...`);
        return NextResponse.json(
            { message: 'Failed to parse response from authentication service.', details: 'The authentication service responded successfully but its data could not be processed.' },
            { status: 502 }
        );
    }

    const token = responseData.accessToken;
    if (!token) {
      console.error(`[API Password Login] accessToken not found in external API response for email ${email}. Received:`, responseData);
      return NextResponse.json({ message: 'Authentication service did not provide an accessToken.', details: 'Check server logs for the full response from the authentication service.' }, { status: 500 });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOpts: Partial<ResponseCookie> = {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    if (isProduction) {
        cookieOpts.secure = true;
        cookieOpts.sameSite = 'lax';
        if (process.env.APP_URL) {
            try {
                const url = new URL(process.env.APP_URL);
                if (url.hostname && url.hostname !== 'localhost') {
                    cookieOpts.domain = url.hostname;
                }
            } catch (e) {
                console.error('[API Password Login] Failed to parse APP_URL for production cookie domain:', e);
            }
        }
    } else {
        // Development settings for localhost (HTTP)
        cookieOpts.secure = false; 
        cookieOpts.sameSite = 'lax'; // Explicitly 'Lax' for dev. Browser default usually works but explicit is safer.
        // DO NOT set domain for localhost; browser handles it.
    }
    
    const sessionTokenCookie: ResponseCookie = {
        name: 'session_token',
        value: token,
        ...cookieOpts
    } as ResponseCookie;
    
    console.log(`[API Password Login] Setting 'session_token' cookie for email ${email} with options: ${JSON.stringify(sessionTokenCookie)} (isProduction: ${isProduction})`);
    cookies().set(sessionTokenCookie);

    // Return a success message, and optionally the user object and token if needed by client (though token is in cookie)
    const user = responseData.user || responseData.data; // Accommodate different user object structures
    return NextResponse.json({ message: 'Login successful', user: user, accessToken: token }, { status: 200 });

  } catch (error: any) {
    console.error('[API Password Login] Internal error in POST handler:', error.message, error.stack);
    let errorMessage = 'An unexpected error occurred during password login.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: 'Internal server error during login process.', details: errorMessage }, { status: 500 });
  }
}

    