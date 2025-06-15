
# Pokémon TCG Admin & Viewer

This is a Next.js application built within Firebase Studio, designed to serve as an admin panel and public viewer for a Pokémon Trading Card Game API. It allows users to browse card sets and individual cards, and provides administrators with tools to manage users and view API metrics.

## Features

*   **Admin Dashboard**: Overview of API usage, total users, cards, and sets. Includes a chart for set releases over time.
*   **API Documentation**: Integrated Swagger UI to view and interact with the backend API specification (`openapi.yaml`).
*   **Card Set Browsing**: View a paginated list of Pokémon TCG sets, search for sets, and see set details like release date and total cards.
*   **Card Browsing & Filtering**: View individual Pokémon cards with detailed information. Users can filter cards by name, set, type, and rarity.
*   **User Management (Admin)**: (Currently uses mock data) Interface for viewing and managing users, including roles and statuses.
*   **User Collections**: Logged-in users can create and manage personal collections of cards.
*   **Authentication**:
    *   OIDC (OpenID Connect) login via Authentik.
    *   Local email/password based login.
*   **Responsive UI**: Built with ShadCN UI components and Tailwind CSS for a modern and responsive experience.
*   **Dark Mode**: Theme toggle for light and dark mode.

## Tech Stack

*   **Frontend**: Next.js (App Router), React, TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS
*   **Authentication**: `openid-client` for OIDC, direct API calls for password-based auth.

## Getting Started

This project is intended to be run within Firebase Studio.

1.  **Environment Variables**:
    Ensure you have a `.env` file in the root of your project with the necessary environment variables. Key variables include:
    *   `APP_URL`: The publicly accessible URL of this Next.js application (e.g., `http://localhost:9002` for local development, or your deployed URL). This is crucial for OIDC redirects.
    *   `EXTERNAL_API_BASE_URL`: The base URL of your backend Pokémon TCG API.
    *   `AUTHENTIK_ISSUER`: The OIDC issuer URL for Authentik (e.g., `https://your-authentik-instance/application/o/pokemon-tcg-api/`).
    *   `AUTHENTIK_CLIENT_ID`: The OIDC client ID for this application.
    *   `AUTHENTIK_CLIENT_SECRET`: The OIDC client secret for this application.
    *   `LOGOUT_REDIRECT_URL` (Optional): URL to redirect to after OIDC logout. Defaults to `APP_URL`.

2.  **Running the App**:
    *   Use the development server: `npm run dev` (typically runs on port 9002 as configured in `package.json`).

## Key Files & Directories

*   `src/app/(app)`: Main application routes, including admin sections and public-facing card/set pages.
    *   `src/app/(app)/me/collections`: User's personal card collection page.
*   `src/app/api`: Next.js API routes for handling authentication (OIDC callback, login, logout, user info) and proxying requests to the external API.
    *   `src/app/api/user/collection`: API routes for managing user card collections.
*   `src/components`: Reusable React components.
    *   `src/components/ui`: ShadCN UI components.
    *   `src/components/layout`: Components related to the app's layout (header, sidebar).
    *   `src/components/admin`: Components specific to the admin sections.
    *   `src/components/cards`: Components related to card display and collection management.
*   `src/lib`: Utility functions, including OIDC client setup (`oidcClient.ts`).
*   `openapi.yaml`: OpenAPI specification for the backend API, used by the API documentation viewer.
*   `globals.css`: Global styles and Tailwind CSS theme configuration, including dark mode overrides for Swagger UI.

## Authentication Flow

*   **OIDC**:
    1.  User clicks "Sign in with OIDC".
    2.  Redirects to `/api/auth/login` (Next.js route).
    3.  This route generates PKCE verifiers, stores them in cookies, and redirects to Authentik's authorization URL.
    4.  User authenticates with Authentik.
    5.  Authentik redirects back to `/api/auth/callback` (Next.js route).
    6.  This callback route validates the OIDC response, exchanges the authorization code for tokens, and stores `id_token` and `session_token` (access token) in cookies.
    7.  Redirects to the admin dashboard.
*   **Password Login**:
    1.  User enters email and password.
    2.  Submits to `/api/auth/password-login` (Next.js route).
    3.  This route calls the external API's `/auth/local/login` endpoint.
    4.  If successful, the external API returns a token (`accessToken`).
    5.  The Next.js route stores this token as `session_token` in a cookie.
    6.  Redirects to the admin dashboard.
*   **User Session**:
    *   The `/api/auth/user` route is used by the frontend to get the current user's information.
    *   It checks for an `id_token` (OIDC) or a `session_token` (local) to determine authentication status and source.
*   **Logout**:
    *   `/api/auth/logout` clears local cookies.
    *   If it was an OIDC session, it attempts to redirect to the OIDC provider's end session endpoint.

This README provides a more comprehensive overview of your PokemonTCG Admin & Viewer application.
