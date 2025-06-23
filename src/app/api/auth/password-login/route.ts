
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import logger from '@/lib/logger';

const CONTEXT = "API Password Login";

const MODULE_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
if (!MODULE_EXTERNAL_API_BASE_URL) {
  logger.error(CONTEXT, 'CRITICAL: EXTERNAL_API_BASE_URL environment variable is not set AT MODULE LOAD. Password login WILL FAIL.');
} else {
  logger.info(CONTEXT, `EXTERNAL_API_BASE_URL is configured at module load: ${MODULE_EXTERNAL_API_BASE_URL}`);
}

export async function POST(request: NextRequest) {
  const currentExternalApiBaseUrl = process.env.EXTERNAL_API_BASE_URL;

  if (!currentExternalApiBaseUrl) {
    logger.error(CONTEXT, 'Critical: EXTERNAL_API_BASE_URL is not set at request time. Password login cannot function.');
    return NextResponse.json({ success: false, message: 'API endpoint not configured.', details: 'Server configuration error: EXTERNAL_API_BASE_URL not set.' }, { status: 500 });
  }

  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: 'Email/Username and password are required.', details: 'Missing credentials in request.' }, { status: 400 });
    }

    logger.info(CONTEXT, `Attempting password login for identifier: ${identifier} to external API: ${currentExternalApiBaseUrl}/auth/local/login (Password NOT logged)`);

    const apiResponse = await fetch(`${currentExternalApiBaseUrl}/auth/local/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }), // Send identifier to backend
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
        logger.warn(CONTEXT, `External API returned HTML for identifier ${identifier}: ${responseBodyText.substring(0, 200)}...`);
      } else if (responseBodyText) {
        errorDetails = `External API request failed with status ${apiResponse.status}. Response: ${responseBodyText.substring(0, 500)}`;
      } else {
        errorDetails = `External API request failed with status ${apiResponse.status} and an empty response body. URL: ${currentExternalApiBaseUrl}/auth/local/login.`;
      }

      logger.error(CONTEXT, `External API login failed for identifier ${identifier}: ${apiResponse.status}`, errorDetails);
      return NextResponse.json(
        { success: false, message: 'Login failed at external API.', details: errorDetails },
        { status: apiResponse.status }
      );
    }

    try {
        const contentType = apiResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            responseData = JSON.parse(responseBodyText);
        } else {
            logger.error(CONTEXT, `External API success response for identifier ${identifier} was not JSON. Content-Type: ${contentType}. Body: ${responseBodyText.substring(0,500)}...`);
            return NextResponse.json(
                { success: false, message: 'Received invalid data format from authentication service despite success status.', details: 'The authentication service responded successfully but the data was not in the expected JSON format.' },
                { status: 502 }
            );
        }
    } catch (e: any) {
        logger.error(CONTEXT, `Error parsing successful external API response for identifier ${identifier} as JSON:`, e.message, `Body: ${responseBodyText.substring(0,500)}...`);
        return NextResponse.json(
            { success: false, message: 'Failed to parse response from authentication service.', details: 'The authentication service responded successfully but its data could not be processed.' },
            { status: 502 }
        );
    }

    const token = responseData.accessToken;
    if (!token) {
      logger.error(CONTEXT, `accessToken not found in external API response for identifier ${identifier}. Received:`, responseData);
      return NextResponse.json({ success: false, message: 'Authentication service did not provide an accessToken.', details: 'Check server logs for the full response from the authentication service.' }, { status: 500 });
    }

    let effectiveAppUrl: string;
    const appUrlFromEnv = process.env.APP_URL;

    if (appUrlFromEnv) {
      effectiveAppUrl = appUrlFromEnv;
    } else {
      if (process.env.NODE_ENV === 'development') {
        const port = process.env.PORT || '9002';
        effectiveAppUrl = `http://localhost:${port}`;
        logger.info(CONTEXT, `APP_URL not set, NODE_ENV is development. Defaulting effectiveAppUrl for session cookie to ${effectiveAppUrl}`);
      } else {
        logger.error(CONTEXT, `CRITICAL: APP_URL is not set in a non-development environment (${process.env.NODE_ENV}). Session cookie settings will likely be incorrect, expecting an HTTPS URL. Defaulting to http://localhost:9002 for context, but this requires correction by setting APP_URL.`);
        effectiveAppUrl = 'http://localhost:9002'; 
      }
    }
    
    const cookieSecure = effectiveAppUrl.startsWith('https://');
    const cookieSameSite = 'lax';

    logger.info(CONTEXT, `Effective APP_URL for 'session_token' cookie: ${effectiveAppUrl}. Setting cookie: Secure=${cookieSecure}, SameSite=${cookieSameSite}. Max-Age=7 days.`);
    if (process.env.NODE_ENV !== 'development' && !cookieSecure && appUrlFromEnv && appUrlFromEnv.startsWith('http://')) {
        logger.warn(CONTEXT, `Non-Dev WARNING: APP_URL (${appUrlFromEnv}) is HTTP. 'session_token' cookie will be insecure.`);
    }
    if (process.env.NODE_ENV !== 'development' && !appUrlFromEnv) {
      logger.warn(CONTEXT, `Non-Dev WARNING: APP_URL is NOT SET. Session cookie will be based on a default ${effectiveAppUrl} and likely insecure if an HTTPS URL is expected.`);
    }


    const cookieOpts: Omit<ResponseCookie, 'name' | 'value'> = {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: cookieSecure,
      sameSite: cookieSameSite,
    };

    const sessionTokenCookie: ResponseCookie = {
        name: 'session_token',
        value: token,
        ...cookieOpts,
    } as ResponseCookie;

    const response = NextResponse.json({ success: true, message: "Login successful" });
    response.cookies.set(sessionTokenCookie);

    logger.info(CONTEXT, `Successfully processed login for ${identifier}. Returning JSON success response with Set-Cookie header.`);
    return response;

  } catch (error: any) {
    logger.error(CONTEXT, 'Internal error in POST handler:', error.message, error.stack);
    let errorMessage = 'An unexpected error occurred during password login.';
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ success: false, message: 'Internal server error during login process.', details: errorMessage }, { status: 500 });
  }
}
