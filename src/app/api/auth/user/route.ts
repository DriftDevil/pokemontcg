
'use server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// Removed: import * as jose from 'jose'; // No longer decoding ID token here for user properties

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

export async function GET() {
  // --- Development Mock Admin User ---
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_USER === 'true') {
    console.warn("[API User - GET /api/auth/user] MOCK ADMIN USER ENABLED. Returning mock admin data.");
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
  const sessionTokenCookie = cookieStore.get('session_token');

  const receivedCookiesForLog: { [key: string]: string } = {};
  cookieStore.getAll().forEach(c => {
    receivedCookiesForLog[c.name] = c.value ? `${c.value.substring(0,15)}... (exists)` : 'EMPTY_OR_UNDEFINED';
  });
  console.log(`[API User - GET /api/auth/user] START. Received cookies:`, JSON.stringify(receivedCookiesForLog));
  console.log(`[API User] session_token cookie value exists: ${!!sessionTokenCookie?.value}`);


  if (sessionTokenCookie?.value) {
    console.log("[API User] Session token found. Attempting to fetch user details from backend's /user/me.");
    if (!EXTERNAL_API_BASE_URL) {
        console.error('[API User] CRITICAL: EXTERNAL_API_BASE_URL not set. Cannot fetch user details. Returning null and clearing cookies.');
        const errResponse = NextResponse.json(null, { status: 500, statusText: "Server configuration error: API base URL not set." });
        errResponse.cookies.delete('session_token');
        errResponse.cookies.delete('id_token'); // Also clear id_token if present
        return errResponse;
    }
    try {
        const token = sessionTokenCookie.value;
        const externalUserUrl = `${EXTERNAL_API_BASE_URL}/user/me`;
        console.log(`[API User] Fetching user from external API: ${externalUserUrl} with token (snippet): ${token.substring(0,15)}...`);

        const response = await fetch(externalUserUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        console.log(`[API User] Response status from ${externalUserUrl}: ${response.status}`);
        const responseBodyText = await response.text();

        let responseData: ExternalApiUserResponse | null = null;
        try {
            if (responseBodyText) {
                responseData = JSON.parse(responseBodyText);
                console.log("[API User] External API /user/me full parsed response data:", JSON.stringify(responseData, null, 2));
            } else {
                console.warn(`[API User] External API /user/me returned an empty body. Status: ${response.status}`);
            }
        } catch (parseError) {
            console.error(`[API User] Failed to parse JSON response from ${externalUserUrl}. Status: ${response.status}. Body: ${responseBodyText.substring(0,300)}...`);
            if (response.ok) { // If status was OK but parsing failed, it's a 502.
                const clearCookieResponse = NextResponse.json(null, { status: 502, statusText: "Invalid JSON response from authentication service." });
                clearCookieResponse.cookies.delete('session_token');
                clearCookieResponse.cookies.delete('id_token');
                console.log("[API User] External API returned OK but unparseable JSON; clearing session cookies.");
                return clearCookieResponse;
            }
            // If not OK and parsing failed, the original status from external API is more relevant.
        }

        if (!response.ok) {
            console.error(`[API User] Failed to fetch user from ${externalUserUrl}. Status: ${response.status}. Response Body (or parsed error if JSON): ${responseData ? JSON.stringify(responseData) : responseBodyText.substring(0,300)}`);
            const clearCookieResponse = NextResponse.json({ message: `Error from external auth service: ${response.status}`, details: responseData || responseBodyText.substring(0,300) }, { status: response.status });
            if (response.status === 401 || response.status === 403) { // Unauthorized or Forbidden
                clearCookieResponse.cookies.delete('session_token');
                clearCookieResponse.cookies.delete('id_token');
                console.log("[API User] External API returned 401/403 for session_token. Deleting session_token and id_token cookies.");
            }
            return clearCookieResponse;
        }

        if (!responseData || !responseData.data || !responseData.data.id) {
            console.warn('[API User] External API /user/me returned 200 OK, but user data (responseData.data.id) is missing or invalid. Parsed response was:', responseData, 'Treating as unauthenticated and clearing session cookies.');
            const clearCookieResponse = NextResponse.json(null, { status: 200 }); // No user data, so effectively unauthenticated
            clearCookieResponse.cookies.delete('session_token');
            clearCookieResponse.cookies.delete('id_token');
            return clearCookieResponse;
        }

        const externalUser = responseData.data;
        const appUser: AppUser = {
            id: externalUser.id,
            name: externalUser.name || externalUser.preferredUsername,
            email: externalUser.email,
            avatarUrl: externalUser.avatarUrl,
            isAdmin: externalUser.isAdmin,
            authSource: responseData.authSource, // Rely on backend for authSource
        };
        console.log("[API User] User details fetched from backend /user/me and mapped to AppUser. Returning user:", appUser);
        return NextResponse.json(appUser);

    } catch (error: any) {
        const errorMessage = error.message ? error.message : String(error);
        console.error(`[API User] Error during user fetch from backend /user/me: ${errorMessage}. Stack: ${error.stack ? error.stack.substring(0, 500) : 'N/A'}. Returning null and clearing cookies.`);
        const errResponse = NextResponse.json({ message: "Internal server error fetching user details.", details: errorMessage }, { status: 500 });
        errResponse.cookies.delete('session_token');
        errResponse.cookies.delete('id_token');
        return errResponse;
    }
  } else {
     console.log("[API User] No session_token cookie found or its value is empty.");
  }

  console.log("[API User] END. No valid session token. Returning null (user not authenticated).");
  return NextResponse.json(null);
}
    