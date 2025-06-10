
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
  // Re-check at request time as well, though module-level check is more indicative for serverless envs.
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

    const externalApiUrl = `${currentExternalApiBaseUrl}/auth/local/login`;
    console.log(`[API Password Login] Attempting password login to external API: ${externalApiUrl}`);

    const apiResponse = await fetch(externalApiUrl, {
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
        errorDetails = `External API returned an HTML page (status ${apiResponse.status}). URL: ${externalApiUrl}. Check API configuration or if the external API is down.`;
        console.warn(`[API Password Login] External API returned HTML: ${responseBodyText.substring(0, 200)}...`);
      } else if (responseBodyText) {
        errorDetails = `External API request failed with status ${apiResponse.status}. Response: ${responseBodyText.substring(0, 500)}`;
      } else {
        errorDetails = `External API request failed with status ${apiResponse.status} and an empty response body. URL: ${externalApiUrl}.`;
      }
      
      console.error(`[API Password Login] External API login failed: ${apiResponse.status}`, errorDetails);
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
            console.error(`[API Password Login] External API success response was not JSON. Content-Type: ${contentType}. Body: ${responseBodyText.substring(0,500)}...`);
            return NextResponse.json(
                { message: 'Received invalid data format from authentication service despite success status.', details: 'The authentication service responded successfully but the data was not in the expected JSON format.' },
                { status: 502 } 
            );
        }
    } catch (e: any) {
        console.error('[API Password Login] Error parsing successful external API response as JSON:', e.message, `Body: ${responseBodyText.substring(0,500)}...`);
        return NextResponse.json(
            { message: 'Failed to parse response from authentication service.', details: 'The authentication service responded successfully but its data could not be processed.' },
            { status: 502 } 
        );
    }

    const token = responseData.accessToken; 
    if (!token) {
      console.error('[API Password Login] accessToken not found in external API response. Received:', responseData);
      return NextResponse.json({ message: 'Authentication service did not provide an accessToken.', details: 'Check server logs for the full response from the authentication service.' }, { status: 500 });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions: Partial<ResponseCookie> = {
      httpOnly: true,
      secure: isProduction, 
      path: '/',
      sameSite: 'lax', 
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };
    
    if (!isProduction) {
       // For localhost development, ensure secure is false if APP_URL is http
       // And let browser handle domain for localhost.
       if (process.env.APP_URL?.startsWith('http://localhost')) {
         cookieOptions.secure = false;
       }
    }
    
    console.log(`[API Password Login] Setting 'session_token' cookie with options: ${JSON.stringify(cookieOptions)} (isProduction: ${isProduction})`);
    cookies().set('session_token', token, cookieOptions);

    const user = responseData.user || responseData.data; 
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
