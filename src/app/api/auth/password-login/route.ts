
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
    return NextResponse.json({ message: 'API endpoint not configured.' }, { status: 500 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    const externalApiUrl = `${EXTERNAL_API_BASE_URL}/login/password`;

    const apiResponse = await fetch(externalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: responseData.message || responseData.detail || 'Login failed at external API.', details: responseData },
        { status: apiResponse.status }
      );
    }

    const token = responseData.token;
    if (!token) {
      return NextResponse.json({ message: 'Token not found in API response.' }, { status: 500 });
    }

    // Set the token in an HTTP-only cookie
    // In a real app, you'd sign/encrypt this cookie if COOKIE_SECRET is used for that.
    // For now, it's a simple bearer token cookie.
    cookies().set('password_access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days, adjust as needed
    });

    return NextResponse.json({ message: 'Login successful' }, { status: 200 });

  } catch (error) {
    console.error('Password login internal error:', error);
    let errorMessage = 'An unexpected error occurred during password login.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
