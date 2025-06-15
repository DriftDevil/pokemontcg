
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutDashboard, Users, CreditCard, Layers, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { cookies } from 'next/headers';
import DynamicSetReleaseChartWrapper from "@/components/admin/dashboard/dynamic-set-release-chart-wrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


// User structure based on openapi.yaml User schema
interface ApiUser {
  id: string;
  email?: string;
  name?: string;
  preferredUsername?: string;
  isAdmin?: boolean;
  createdAt?: string; // ISO date string
  lastSeen?: string;  // ISO date string
  avatarUrl?: string; // Added avatarUrl
}

interface ApiUserListResponse {
  data?: ApiUser[];
  total?: number;
}


function getBaseUrl(): string {
  const appUrlEnv = process.env.APP_URL;
  if (appUrlEnv) {
    try {
      const parsedAppUrl = new URL(appUrlEnv);
      const origin = parsedAppUrl.origin;
      console.log(`[AdminDashboardPage - getBaseUrl] Using APP_URL from environment: ${appUrlEnv}. Derived origin for API calls: ${origin}`);
      return origin;
    } catch (error) {
      console.error(`[AdminDashboardPage - getBaseUrl] Invalid APP_URL: ${appUrlEnv}. Error: ${error}. Falling back to localhost.`);
      // Fallback to localhost if APP_URL is invalid
    }
  }
  const port = process.env.PORT || "9002";
  const defaultUrl = `http://localhost:${port}`;
  console.log(`[AdminDashboardPage - getBaseUrl] APP_URL not set or invalid. Defaulting to: ${defaultUrl} (PORT env: ${process.env.PORT})`);
  return defaultUrl;
}

async function fetchTotalCountFromPaginated(endpoint: string, sessionToken: string | undefined): Promise<number> {
  const baseUrl = getBaseUrl();
  const fetchUrl = `${baseUrl}/api/${endpoint}?limit=1`;

  console.log(`[AdminDashboardPage - fetchTotalCountFromPaginated for ${endpoint}] Base URL for internal API: '${baseUrl}', Full Fetch URL: '${fetchUrl}'`);

  try {
    const fetchHeaders = new Headers();
    if (sessionToken) {
      fetchHeaders.append('Authorization', `Bearer ${sessionToken}`);
    } else {
      console.warn(`[AdminDashboardPage - fetchTotalCountFromPaginated for ${endpoint}] Session token ABSENT. Cannot set Authorization header for ${endpoint}.`);
    }

    const response = await fetch(fetchUrl, {
      headers: fetchHeaders,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[AdminDashboardPage - fetchTotalCountFromPaginated for ${endpoint}] Failed to fetch count from ${fetchUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`[AdminDashboardPage - fetchTotalCountFromPaginated for ${endpoint}] Error body for ${fetchUrl}: ${errorBody}`);
      return 0;
    }
    const data = await response.json();
    return data.totalCount || data.total || 0;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      console.error(`[AdminDashboardPage - fetchTotalCountFromPaginated for ${endpoint}] NETWORK ERROR: Fetch failed for ${fetchUrl}. This usually means the server at this URL is not reachable. Check APP_URL in .env if set, or ensure the server is running on the correct port.`, error);
    } else {
      console.error(`[AdminDashboardPage - fetchTotalCountFromPaginated for ${endpoint}] Error fetching count from ${fetchUrl}:`, error);
    }
    return 0;
  }
}

interface ApiSet {
  id: string;
  name: string;
  releaseDate: string;
}

interface PaginatedApiResponse<T> {
  data: T[];
  totalCount?: number;
  total?: number;
}

async function fetchSetReleaseData(): Promise<{ year: string; count: number }[]> {
  const baseUrl = getBaseUrl();
  const fetchUrl = `${baseUrl}/api/sets?all=true&orderBy=-releaseDate`;
  console.log(`[AdminDashboardPage - fetchSetReleaseData] Base URL for internal API: '${baseUrl}', Full Fetch URL: '${fetchUrl}'`);

  try {
    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      console.error(`[AdminDashboardPage - fetchSetReleaseData] Failed to fetch from ${fetchUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`[AdminDashboardPage - fetchSetReleaseData] Error body for ${fetchUrl}: ${errorBody}`);
      return [];
    }
    const responseData: PaginatedApiResponse<ApiSet> = await response.json();
    const sets = responseData.data || [];

    if (!Array.isArray(sets)) {
        console.error('[AdminDashboardPage - fetchSetReleaseData] Set data received is not an array:', sets);
        return [];
    }

    const releasesByYear: { [year: string]: number } = {};
    sets.forEach(set => {
      if (set.releaseDate) {
        try {
          const year = new Date(set.releaseDate).getFullYear().toString();
          if (!isNaN(parseInt(year))) {
            releasesByYear[year] = (releasesByYear[year] || 0) + 1;
          } else {
            console.warn(`[AdminDashboardPage - fetchSetReleaseData] Invalid year parsed from releaseDate: ${set.releaseDate} for set ${set.name}`);
          }
        } catch (e) {
            console.warn(`[AdminDashboardPage - fetchSetReleaseData] Error parsing releaseDate: ${set.releaseDate} for set ${set.name}`, e);
        }
      }
    });

    return Object.entries(releasesByYear)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      console.error(`[AdminDashboardPage - fetchSetReleaseData] NETWORK ERROR: Fetch failed for ${fetchUrl}. This usually means the server at this URL is not reachable. Check APP_URL in .env if set, or ensure the server is running on the correct port.`, error);
    } else {
      console.error(`[AdminDashboardPage - fetchSetReleaseData] Error fetching or processing from ${fetchUrl}:`, error);
    }
    return [];
  }
}


async function fetchTotalUsersCount(sessionToken: string | undefined): Promise<number> {
  const baseUrl = getBaseUrl();
  const fetchUrl = `${baseUrl}/api/users/all`;

  try {
    const fetchHeaders = new Headers();
    fetchHeaders.append('Content-Type', 'application/json');

    if (sessionToken) {
      fetchHeaders.append('Authorization', `Bearer ${sessionToken}`);
    } else {
      console.warn("[AdminDashboardPage - fetchTotalUsersCount] Session token ABSENT. Cannot set Authorization header for /api/users/all.");
    }

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: fetchHeaders,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[AdminDashboardPage - fetchTotalUsersCount] Failed to fetch from internal ${fetchUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`[AdminDashboardPage - fetchTotalUsersCount] Error body for internal ${fetchUrl}: ${errorBody}`);
      return 0;
    }
    const data: ApiUserListResponse = await response.json();
    return data.total || data.data?.length || 0;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      console.error(`[AdminDashboardPage - fetchTotalUsersCount] NETWORK ERROR: Fetch failed for ${fetchUrl}. This usually means the server at this URL is not reachable. Check APP_URL in .env if set, or ensure the server is running on the correct port.`, error);
    } else {
      console.error(`[AdminDashboardPage - fetchTotalUsersCount] Error fetching from internal ${fetchUrl}:`, error);
    }
    return 0;
  }
}

async function fetchRecentLiveUsers(sessionToken: string | undefined, count: number = 3): Promise<ApiUser[]> {
  const baseUrl = getBaseUrl();
  const fetchUrl = `${baseUrl}/api/users/all`;
  console.log(`[AdminDashboardPage - fetchRecentLiveUsers] Session token for Authorization header: ${sessionToken ? 'PRESENT' : 'ABSENT'}`);
  
  try {
    const fetchHeaders = new Headers();
    fetchHeaders.append('Content-Type', 'application/json');

    if (sessionToken) {
      fetchHeaders.append('Authorization', `Bearer ${sessionToken}`);
    } else {
      console.warn("[AdminDashboardPage - fetchRecentLiveUsers] Session token ABSENT. Cannot set Authorization header for /api/users/all.");
      return [];
    }

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: fetchHeaders,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[AdminDashboardPage - fetchRecentLiveUsers] Failed to fetch users from ${fetchUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`[AdminDashboardPage - fetchRecentLiveUsers] Error body for ${fetchUrl}: ${errorBody}`);
      return [];
    }
    const data: ApiUserListResponse = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      console.error('[AdminDashboardPage - fetchRecentLiveUsers] User data received is not an array or missing:', data);
      return [];
    }

    const sortedUsers = data.data.sort((a, b) => {
      const dateA = a.lastSeen ? new Date(a.lastSeen).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.lastSeen ? new Date(b.lastSeen).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA; 
    });

    return sortedUsers.slice(0, count);

  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      console.error(`[AdminDashboardPage - fetchRecentLiveUsers] NETWORK ERROR: Fetch failed for ${fetchUrl}.`, error);
    } else {
      console.error(`[AdminDashboardPage - fetchRecentLiveUsers] Error fetching users from ${fetchUrl}:`, error);
    }
    return [];
  }
}


async function fetchApiRequests24h(sessionToken: string | undefined): Promise<number> {
  const baseUrl = getBaseUrl();
  const fetchUrl = `${baseUrl}/api/usage`;

  try {
    const fetchHeaders = new Headers();
    fetchHeaders.append('Content-Type', 'application/json');

    if (sessionToken) {
      fetchHeaders.append('Authorization', `Bearer ${sessionToken}`);
    } else {
      console.warn("[AdminDashboardPage - fetchApiRequests24h] Session token ABSENT. Cannot set Authorization header for /api/usage.");
    }

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: fetchHeaders,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[AdminDashboardPage - fetchApiRequests24h] Failed to fetch API requests count from internal ${fetchUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`[AdminDashboardPage - fetchApiRequests24h] Error body for internal ${fetchUrl}: ${errorBody}`);
      return 0;
    }
    const data = await response.json();
    return data.requestCountLast24h || 0;
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      console.error(`[AdminDashboardPage - fetchApiRequests24h] NETWORK ERROR: Fetch failed for ${fetchUrl}. This usually means the server at this URL is not reachable. Check APP_URL in .env if set, or ensure the server is running on the correct port.`, error);
    } else {
      console.error(`[AdminDashboardPage - fetchApiRequests24h] Error fetching API requests count from internal ${fetchUrl}:`, error);
    }
    return 0;
  }
}

const getAvatarFallbackText = (user: ApiUser) => {
    const name = user.name || user.preferredUsername;
    if (name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase() || (user.email ? user.email[0].toUpperCase() : 'U');
    }
    return user.email ? user.email[0].toUpperCase() : 'U';
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  const appUrlIsSet = !!process.env.APP_URL;
  if (!appUrlIsSet && process.env.NODE_ENV !== 'development') {
      console.warn("[AdminDashboardPage - Render] WARNING: APP_URL is not set in a non-development environment. Dashboard data fetching may rely on localhost defaults or fail if external access is needed for internal API calls.");
  }

  const [totalCards, totalSets, setReleaseTimelineData, totalUsers, apiRequests24h, recentUsers] = await Promise.all([
    fetchTotalCountFromPaginated("cards", sessionToken),
    fetchTotalCountFromPaginated("sets", sessionToken),
    fetchSetReleaseData(), 
    fetchTotalUsersCount(sessionToken),
    fetchApiRequests24h(sessionToken),
    fetchRecentLiveUsers(sessionToken, 3),
  ]);

  const setReleaseChartConfig = {
    count: {
      label: "Sets Released",
      color: "hsl(var(--chart-1))",
    },
  } as const;

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of Pokémon TCG data, user activity, and system health."
        icon={LayoutDashboard}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{ (appUrlIsSet && totalUsers >= 0) || (process.env.NODE_ENV === 'development' && totalUsers >=0) ? "Live data (via internal API)" : "No data / API error"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCards.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{ (appUrlIsSet && totalCards >= 0) || (process.env.NODE_ENV === 'development' && totalCards >=0) ? "Live data (via internal API)" : "No data / API error"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sets</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{ (appUrlIsSet && totalSets >= 0) || (process.env.NODE_ENV === 'development' && totalSets >=0) ? "Live data (via internal API)" : "No data / API error"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiRequests24h.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{apiRequests24h >= 0 ? "Live data (proxied)" : "No data / API error"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Set Releases Over Time</CardTitle>
            <CardDescription>Number of Pokémon TCG sets released per year.</CardDescription>
          </CardHeader>
          <CardContent>
            <DynamicSetReleaseChartWrapper
              data={setReleaseTimelineData}
              config={setReleaseChartConfig}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Users</CardTitle>
            <CardDescription>A quick glance at recently active or added users.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                             <AvatarImage 
                                src={user.avatarUrl || `https://placehold.co/40x40.png?text=${getAvatarFallbackText(user)}`}
                                alt={user.name || user.preferredUsername || 'User'} 
                                data-ai-hint={user.avatarUrl && !user.avatarUrl.includes('placehold.co') ? "user avatar" : "avatar placeholder"}
                             />
                            <AvatarFallback>{getAvatarFallbackText(user)}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{user.name || user.preferredUsername || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell>{user.isAdmin ? 'Admin' : 'User'}</TableCell>
                      <TableCell>
                        <Badge variant={'default'}
                               className={cn(
                                  'border bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                                )}>
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No recent user data to display or API error.</p>
            )}
             <div className="mt-4 text-right">
                <Button variant="outline" asChild>
                    <Link href="/admin/users">Manage All Users</Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
