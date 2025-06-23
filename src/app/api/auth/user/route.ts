
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

// User representation within this Next.js app (client-side and API response)
interface AppUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  authSource: 'oidc' | 'local' | 'mock';
}

// Represents the structure of the User object from the external API's /user/me
interface ExternalApiUser {
    id: string;
    email?: string;
    name?: string;
    preferredUsername?: string;
    isAdmin?: boolean;
    createdAt?: string;
    lastSeen?: string;
    avatarUrl?: string;
}

// Represents the structure of the response from /user/me which is UserWithAuthSource
interface ExternalApiUserResponse {
    data: ExternalApiUser;
    authSource: 'local' | 'oidc';
}


const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const CONTEXT = "API /api/auth/user";

export async function GET(request: NextRequest) {
  logger.debug(CONTEXT, `Request received. Method: ${request.method}, URL: ${request.url}`);
  const requestHeaders = new Headers(request.headers);
  const headersObject: { [key: string]: string } = {};
  requestHeaders.forEach((value, key) => {
    headersObject[key] = value;
  });
  // Avoid logging potentially sensitive full cookie header directly, rely on parsed cookies below.
  logger.debug(CONTEXT, "Received headers (excluding full cookie string):", JSON.stringify({...headersObject, cookie: headersObject.cookie ? 'Present' : 'Not Present'}, null, 2));


  // --- Development Mock Admin User ---
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_USER === 'true') {
    logger.warn(CONTEXT, "MOCK ADMIN USER ENABLED. Returning mock admin data.");
    const mockAdminUser: AppUser = {
      id: 'mock-admin-id-007',
      name: 'Mock Admin Dev',
      email: 'mockadmin@develop.ment',
      avatarUrl: `https://placehold.co/96x96.png?text=MA`,
      isAdmin: true,
      authSource: 'mock',
    };
    return NextResponse.json(mockAdminUser);
  }
  // --- End Development Mock Admin User ---

  const cookieStore = cookies();
  const allCookiesFromStore = cookieStore.getAll().map(c => ({
    name: c.name,
    value: c.value ? `${c.value.substring(0, 15)}... (exists)` : 'EMPTY_OR_UNDEFINED',
    // For more detailed debugging of cookie attributes:
    // path: c.path, domain: c.domain, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite
  }));
  logger.debug(CONTEXT, "Cookies from next/headers store:", allCookiesFromStore);

  const sessionTokenCookie = cookieStore.get('session_token');
  logger.debug(CONTEXT, `session_token cookie value from store: ${sessionTokenCookie?.value ? sessionTokenCookie.value.substring(0,15) + '...' : 'NOT FOUND'}`);


  if (sessionTokenCookie?.value) {
    logger.info(CONTEXT, "Session token found in store. Attempting to fetch user details from backend's /user/me.");
    if (!EXTERNAL_API_BASE_URL) {
        logger.error(CONTEXT, 'CRITICAL: EXTERNAL_API_BASE_URL not set. Cannot fetch user details. Returning null and clearing cookies.');
        const errResponse = NextResponse.json(null, { status: 500, statusText: "Server configuration error: API base URL not set." });
        // It's better not to delete cookies here as this is a GET request.
        // Let client-side handle re-authentication flow.
        return errResponse;
    }
    try {
        const token = sessionTokenCookie.value;
        const externalUserUrl = `${EXTERNAL_API_BASE_URL}/user/me`;
        logger.debug(CONTEXT, `Fetching user from external API: ${externalUserUrl} with token (snippet): ${token.substring(0,15)}...`);

        const response = await fetch(externalUserUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        logger.debug(CONTEXT, `Response status from ${externalUserUrl}: ${response.status}`);
        const responseBodyText = await response.text();

        let responseData: ExternalApiUserResponse | null = null;
        try {
            if (responseBodyText) {
                responseData = JSON.parse(responseBodyText);
            } else {
                logger.warn(CONTEXT, `External API /user/me returned an empty body. Status: ${response.status}`);
            }
        } catch (parseError) {
            logger.error(CONTEXT, `Failed to parse JSON response from ${externalUserUrl}. Status: ${response.status}. Body (first 300 chars): ${responseBodyText.substring(0,300)}...`);
            if (response.ok) { 
                return NextResponse.json(null, { status: 502, statusText: "Invalid JSON response from authentication service." });
            }
        }

        if (!response.ok) {
            logger.error(CONTEXT, `Failed to fetch user from ${externalUserUrl}. Status: ${response.status}. Response Body (or parsed error if JSON) (first 300 chars): ${responseData ? JSON.stringify(responseData) : responseBodyText.substring(0,300)}`);
            const errorStatus = response.status;
            // Don't clear cookies here on GET.
            return NextResponse.json({ message: `Error from external auth service: ${errorStatus}`, details: responseData || responseBodyText.substring(0,300) }, { status: errorStatus });
        }

        if (!responseData || !responseData.data || !responseData.data.id) {
            logger.warn(CONTEXT, 'External API /user/me returned 200 OK, but user data (responseData.data.id) is missing or invalid. Parsed response was:', responseData, 'Treating as unauthenticated.');
            return NextResponse.json(null, { status: 200 }); 
        }

        const externalUser = responseData.data;
        const appUser: AppUser = {
            id: externalUser.id,
            name: externalUser.name || externalUser.preferredUsername,
            email: externalUser.email,
            avatarUrl: externalUser.avatarUrl,
            isAdmin: externalUser.isAdmin,
            authSource: responseData.authSource,
        };
        logger.info(CONTEXT, "User details fetched from backend /user/me and mapped to AppUser. Returning user:", {userId: appUser.id, authSource: appUser.authSource});
        return NextResponse.json(appUser);

    } catch (error: any) {
        const errorMessage = error.message ? error.message : String(error);
        logger.error(CONTEXT, `Error during user fetch from backend /user/me: ${errorMessage}. Stack (first 500 chars): ${error.stack ? error.stack.substring(0, 500) : 'N/A'}. Returning null.`);
        return NextResponse.json({ message: "Internal server error fetching user details.", details: errorMessage }, { status: 500 });
    }
  } else {
     logger.info(CONTEXT, "No session_token cookie found or its value is empty in store (after mock check).");
  }

  logger.info(CONTEXT, "END. No valid session token from store (after mock check). Returning null (user not authenticated).");
  return NextResponse.json(null);
}
