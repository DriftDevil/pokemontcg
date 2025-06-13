
import PageHeader from "@/components/page-header";
import UsersTableClient from "@/components/admin/users-table-client";
import { Users as UsersIcon, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cookies } from 'next/headers';

// Structure of user data from the API (matches openapi.yaml User schema)
interface ApiUser {
  id: string;
  email?: string;
  name?: string;
  preferredUsername?: string;
  isAdmin?: boolean;
  createdAt?: string; // ISO date string
  lastSeen?: string;  // ISO date string
}

interface ApiUserListResponse {
  data?: ApiUser[];
  total?: number;
}

// Structure of user data as expected by the UsersTableClient component
export interface DisplayUser {
  id: string;
  name: string; // Combined from name or preferredUsername
  email: string;
  role: string;  // e.g., "Admin", "User"
  status: string; // e.g., "Active", "Inactive" (defaulting to Active for now)
  lastLogin: string | null; // ISO date string, or null
  avatar: string; // URL for avatar
}

function getBaseUrl(): string {
  const appUrlEnv = process.env.APP_URL;
  if (appUrlEnv) {
    try {
      const parsedAppUrl = new URL(appUrlEnv);
      return parsedAppUrl.origin;
    } catch (error) {
      console.error(`[AdminUsersPage - getBaseUrl] Invalid APP_URL: ${appUrlEnv}. Error: ${error}. Falling back to localhost.`);
    }
  }
  const port = process.env.PORT || "9002";
  return `http://localhost:${port}`;
}

const getAvatarFallbackText = (user: Pick<ApiUser, 'name' | 'preferredUsername' | 'email'>) => {
    const name = user.name || user.preferredUsername;
    if (name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2) || (user.email ? user.email[0].toUpperCase() : 'U');
    }
    return user.email ? user.email[0].toUpperCase() : 'U';
}

async function getUsers(sessionToken: string | undefined): Promise<DisplayUser[]> {
  const baseUrl = getBaseUrl();
  const fetchUrl = `${baseUrl}/api/users/all`;

  if (!sessionToken) {
    console.warn("[AdminUsersPage - getUsers] Session token ABSENT. Cannot fetch users.");
    return [];
  }

  try {
    const fetchHeaders = new Headers();
    fetchHeaders.append('Authorization', `Bearer ${sessionToken}`);
    fetchHeaders.append('Content-Type', 'application/json');

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: fetchHeaders,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[AdminUsersPage - getUsers] Failed to fetch users from ${fetchUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`[AdminUsersPage - getUsers] Error body: ${errorBody}`);
      return [];
    }

    const result: ApiUserListResponse = await response.json();
    const apiUsers = result.data || [];

    if (!Array.isArray(apiUsers)) {
      console.error('[AdminUsersPage - getUsers] Fetched user data is not an array:', apiUsers);
      return [];
    }
    
    // Sort users: by lastSeen (desc), then by createdAt (desc) as fallback
    const sortedApiUsers = apiUsers.sort((a, b) => {
      const dateA = a.lastSeen ? new Date(a.lastSeen).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.lastSeen ? new Date(b.lastSeen).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA; // Descending order for most recent first
    });

    return sortedApiUsers.map((apiUser): DisplayUser => ({
      id: apiUser.id,
      name: apiUser.name || apiUser.preferredUsername || 'N/A',
      email: apiUser.email || 'N/A',
      role: apiUser.isAdmin ? 'Admin' : 'User',
      status: 'Active', // Defaulting to Active as API user doesn't have explicit status
      lastLogin: apiUser.lastSeen || apiUser.createdAt || null,
      avatar: `https://placehold.co/40x40.png?text=${getAvatarFallbackText(apiUser)}`,
    }));

  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      console.error(`[AdminUsersPage - getUsers] NETWORK ERROR: Fetch failed for ${fetchUrl}.`, error);
    } else {
      console.error(`[AdminUsersPage - getUsers] Error fetching or processing users from ${fetchUrl}:`, error);
    }
    return [];
  }
}

export default async function AdminUsersPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  const users = await getUsers(sessionToken);

  return (
    <>
      <PageHeader
        title="User Management"
        description="Administer user accounts, roles, and permissions."
        icon={UsersIcon}
        actions={
          <Button disabled> {/* Add user functionality to be implemented later */}
            <UserPlus className="mr-2 h-4 w-4" />
            Add New User
          </Button>
        }
      />
      {users.length > 0 ? (
        <UsersTableClient initialUsers={users} />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <UsersIcon className="mx-auto h-12 w-12 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Users Found</h3>
          <p>Either no users exist, or there was an issue fetching user data.</p>
          {!sessionToken && <p className="mt-2 text-sm">It seems you might not be fully authenticated to view users.</p>}
        </div>
      )}
    </>
  );
}
