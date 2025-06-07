# **App Name**: PokeAPI

## Core Features:

- API Endpoints: RESTful endpoints for /cards and /sets that mirror the external API, with data cached in a PostgreSQL database.
- Intelligent Sync: A synchronization service that intelligently updates the PostgreSQL cache from the external API, reducing the number of API calls required.
- Authentication: User authentication supporting OIDC via Authentik and password-based login for administrators.
- Admin Dashboard: A basic admin dashboard to view metrics and manage users.
- API Documentation Tool: A Swagger UI that uses a tool to generate OpenAPI 3.0 specification by introspecting the API endpoints and adding descriptions using a large language model.
- List Card Sets: Endpoint to list supported Pokémon card sets.
- Retrieve Card Data: Endpoint to retrieve specific Pokémon card data.

## Style Guidelines:

- Primary color: #2A9D8F (HSL: 166, 56%, 39%), a muted teal that evokes the natural elements found in Pokémon lore.
- Background color: #E9F5F4 (HSL: 166, 33%, 94%), a very light tint of the primary color, contributing to a clean interface.
- Accent color: #264653 (HSL: 200, 34%, 24%), a dark, contrasting tone, nearly analogous, used for emphasis and interactive elements.
- Headline Font: 'Space Grotesk' sans-serif, to give a tech-friendly appearance appropriate for an API; Body Font: 'Inter', also sans-serif
- Simple, geometric icons to represent data and actions in the admin dashboard.
- Clean and structured layout with a focus on data presentation in tables and charts.
- Subtle transitions and loading animations to improve user experience.