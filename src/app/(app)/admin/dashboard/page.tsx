
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutDashboard, Users, CreditCard, Layers, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { User as AdminUserPageType } from "@/app/(app)/admin/users/page";
import { cookies } from 'next/headers';
import DynamicSetReleaseChartWrapper from "@/components/admin/dashboard/dynamic-set-release-chart-wrapper";


function getBaseUrl(): string {
  const appUrlEnv = process.env.APP_URL;
  if (appUrlEnv) {
    console.log(`[AdminDashboardPage - getBaseUrl] Using APP_URL from environment: ${appUrlEnv}`);
    return appUrlEnv;
  }
  const port = process.env.PORT || "9002";
  const defaultUrl = `http://localhost:${port}`;
  console.log(`[AdminDashboardPage - getBaseUrl] APP_URL not set. Defaulting to: ${defaultUrl} (PORT env: ${process.env.PORT})`);
  return defaultUrl;
}

async function fetchTotalCountFromPaginated(endpoint: string, sessionToken: string | undefined): Promise<number> {
  const baseUrl = getBaseUrl();
  const fetchUrl = `${baseUrl}/api/${endpoint}?limit=1`;

  console.log(`[AdminDashboardPage - fetchTotalCountFromPaginated for ${endpoint}] Base URL: '${baseUrl}', Full Fetch URL: '${fetchUrl}'`);
  console.log(`[AdminDashboardPage - fetchTotalCountFromPaginated for ${endpoint}] Session token being used: ${sessionToken ? 'PRESENT' : 'ABSENT'}`);

  try {
    const fetchHeaders = new Headers();
    if (sessionToken) {
      fetchHeaders.append('Authorization', `Bearer ${sessionToken}`);
      console.log(`[AdminDashboardPage - fetchTotalCountFromPaginated for ${endpoint}] Forwarding token in Authorization header.`);
    } else {
      console.warn(`[AdminDashboardPage - fetchTotalCountFromPaginated for ${endpoint}] Session token ABSENT. Cannot forward for ${endpoint}. This will likely lead to 401 if ${endpoint} requires auth.`);
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
  console.log(`[AdminDashboardPage - fetchSetReleaseData] Base URL: '${baseUrl}', Full Fetch URL: '${fetchUrl}'`);

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

interface ApiUserListResponse {
  data?: AdminUserPageType[];
  total?: number;
}


async function fetchTotalUsersCount(sessionToken: string | undefined): Promise<number> {
  const baseUrl = getBaseUrl();
  const fetchUrl = `${baseUrl}/api/users/all`;
  console.log(`[AdminDashboardPage - fetchTotalUsersCount] Base URL: '${baseUrl}', Full Fetch URL: '${fetchUrl}'`);
  console.log(`[AdminDashboardPage - fetchTotalUsersCount] Session token being used: ${sessionToken ? 'PRESENT' : 'ABSENT'}`);

  try {
    const fetchHeaders = new Headers();
    fetchHeaders.append('Content-Type', 'application/json');

    if (sessionToken) {
      fetchHeaders.append('Authorization', `Bearer ${sessionToken}`);
      console.log(`[AdminDashboardPage - fetchTotalUsersCount] Forwarding token in Authorization header for /api/users/all.`);
    } else {
      console.warn("[AdminDashboardPage - fetchTotalUsersCount] Session token ABSENT. Cannot forward to /api/users/all. This will likely lead to 401.");
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

async function fetchApiRequests24h(sessionToken: string | undefined): Promise<number> {
  const baseUrl = getBaseUrl();
  const fetchUrl = `${baseUrl}/api/usage`;
  console.log(`[AdminDashboardPage - fetchApiRequests24h] Base URL: '${baseUrl}', Full Fetch URL: '${fetchUrl}'`);
  console.log(`[AdminDashboardPage - fetchApiRequests24h] Session token being used: ${sessionToken ? 'PRESENT' : 'ABSENT'}`);

  try {
    const fetchHeaders = new Headers();
    fetchHeaders.append('Content-Type', 'application/json');

    if (sessionToken) {
      fetchHeaders.append('Authorization', `Bearer ${sessionToken}`);
      console.log(`[AdminDashboardPage - fetchApiRequests24h] Forwarding token in Authorization header for /api/usage.`);
    } else {
      console.warn("[AdminDashboardPage - fetchApiRequests24h] Session token ABSENT. Cannot forward to /api/usage. This will likely lead to 401.");
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

const mockRecentUsers = [
  { id: 'usr_1', name: 'Satoshi Tajiri', email: 'satoshi@poke.jp', preferredUsername: 'satoshi', isAdmin: true, createdAt: new Date().toISOString(), lastSeen: new Date().toISOString(), avatar: "https://placehold.co/40x40.png?text=ST" },
  { id: 'usr_2', name: 'Ken Sugimori', email: 'ken@poke.jp', preferredUsername: 'ken', isAdmin: false, createdAt: new Date().toISOString(), lastSeen: new Date().toISOString(), avatar: "https://placehold.co/40x40.png?text=KS"},
  { id: 'usr_3', name: 'Junichi Masuda', email: 'junichi@poke.jp', preferredUsername: 'junichi', isAdmin: false, createdAt: new Date().toISOString(), lastSeen: new Date().toISOString(), avatar: "https://placehold.co/40x40.png?text=JM"},
];


export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log('[AdminDashboardPage - Render] All cookies available to Server Component at page top:', JSON.stringify(allCookies, null, 2));
  
  const sessionToken = cookieStore.get('session_token')?.value;
  console.log(`[AdminDashboardPage - Render] session_token value at page top: ${sessionToken ? 'PRESENT' : 'ABSENT'}`);


  const appUrlIsSet = !!process.env.APP_URL;
  console.log(`[AdminDashboardPage - Render] APP_URL env var is set: ${appUrlIsSet}, Value: ${process.env.APP_URL}, NODE_ENV: ${process.env.NODE_ENV}`);
  if (!appUrlIsSet && process.env.NODE_ENV !== 'development') {
      console.error("[AdminDashboardPage - Render] CRITICAL: APP_URL is not set in a non-development environment. Dashboard data fetching will likely fail.");
  }

  const [totalCards, totalSets, setReleaseTimelineData, totalUsers, apiRequests24h] = await Promise.all([
    fetchTotalCountFromPaginated("cards", sessionToken),
    fetchTotalCountFromPaginated("sets", sessionToken),
    fetchSetReleaseData(), // This one doesn't require auth currently
    fetchTotalUsersCount(sessionToken),
    fetchApiRequests24h(sessionToken),
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
            <CardDescription>A quick glance at recently active or added users (mock data).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRecentUsers.slice(0,3).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || user.preferredUsername}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.isAdmin ? 'Admin' : 'User'}</TableCell>
                    <TableCell>
                       {/* Using a generic status for mock, actual status might not be directly in user object */}
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

    