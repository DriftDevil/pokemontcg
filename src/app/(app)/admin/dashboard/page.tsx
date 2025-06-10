

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutDashboard, Users, CreditCard, Layers, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import SetReleaseChart from "@/components/admin/dashboard/set-release-chart";
import { cn } from "@/lib/utils";
import type { User as ApiUserType } from "@/app/(app)/admin/users/page"; 

async function fetchTotalCountFromPaginated(endpoint: string): Promise<number> {
  const APP_URL = process.env.APP_URL || "";
  // Use relative path for internal API calls from server components if APP_URL is not set for self-calls
  const baseUrl = APP_URL || 'http://localhost:' + (process.env.PORT || 9002); 
  const fetchUrl = `${baseUrl}/api/${endpoint}?limit=1`;


  if (!APP_URL && process.env.NODE_ENV === 'development') {
    console.warn(`APP_URL is not defined. Attempting fetch to ${fetchUrl} from server-side (dashboard data).`);
  } else if (!APP_URL && process.env.NODE_ENV !== 'development') {
    console.error(`APP_URL is not defined for dashboard data fetching of ${endpoint}. Fetch URL was: ${fetchUrl}`);
    return 0;
  }

  try {
    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      console.error(`Failed to fetch ${endpoint} count from ${fetchUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`Error body for ${fetchUrl}: ${errorBody}`);
      return 0;
    }
    const data = await response.json();
    return data.totalCount || data.total || 0; 
  } catch (error) {
    console.error(`Error fetching ${endpoint} count from ${fetchUrl}:`, error);
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
  const APP_URL = process.env.APP_URL || "";
  const baseUrl = APP_URL || 'http://localhost:' + (process.env.PORT || 9002);
  const fetchUrl = `${baseUrl}/api/sets?all=true&orderBy=-releaseDate`;

  if (!APP_URL && process.env.NODE_ENV === 'development') {
    console.warn(`APP_URL is not defined. Attempting fetch to ${fetchUrl} for set release data.`);
  } else if (!APP_URL && process.env.NODE_ENV !== 'development') {
    console.error(`APP_URL is not defined for dashboard data fetching of set releases. Fetch URL was: ${fetchUrl}`);
    return [];
  }
  
  try {
    const response = await fetch(fetchUrl, { cache: 'no-store' }); 
    if (!response.ok) {
      console.error(`Failed to fetch set release data from ${fetchUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`Error body for ${fetchUrl}: ${errorBody}`);
      return [];
    }
    const responseData: PaginatedApiResponse<ApiSet> = await response.json();
    const sets = responseData.data || [];

    if (!Array.isArray(sets)) {
        console.error('Set data received is not an array:', sets);
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
            console.warn(`Invalid year parsed from releaseDate: ${set.releaseDate} for set ${set.name}`);
          }
        } catch (e) {
            console.warn(`Error parsing releaseDate: ${set.releaseDate} for set ${set.name}`, e);
        }
      }
    });

    return Object.entries(releasesByYear)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  } catch (error) {
    console.error(`Error fetching or processing set release data from ${fetchUrl}:`, error);
    return [];
  }
}

async function fetchTotalUsersCount(): Promise<number> {
  const APP_URL = process.env.APP_URL || "";
  const baseUrl = APP_URL || 'http://localhost:' + (process.env.PORT || 9002);
  const fetchUrl = `${baseUrl}/api/users/all`;

  if (!APP_URL && process.env.NODE_ENV === 'development') {
    console.warn(`APP_URL is not defined. Attempting fetch to ${fetchUrl} for total users count.`);
  } else if (!APP_URL && process.env.NODE_ENV !== 'development') {
    console.error(`APP_URL is not defined for fetching total users count. Fetch URL was: ${fetchUrl}`);
    return 0;
  }

  try {
    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      console.error(`Failed to fetch total users count from ${fetchUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`Error body for ${fetchUrl}: ${errorBody}`);
      return 0;
    }
    const data: { data?: ApiUserType[] } = await response.json(); // Assuming it follows { data: User[] }
    return data.data?.length || 0;
  } catch (error) {
    console.error(`Error fetching total users count from ${fetchUrl}:`, error);
    return 0;
  }
}

async function fetchApiRequests24h(): Promise<number> {
  // Call the internal API route which handles authentication
  const APP_URL = process.env.APP_URL || "";
  const baseUrl = APP_URL || 'http://localhost:' + (process.env.PORT || 9002);
  const fetchUrl = `${baseUrl}/api/usage`; 

  if (!APP_URL && process.env.NODE_ENV === 'development') {
    console.warn(`APP_URL is not defined. Attempting fetch to ${fetchUrl} for API requests count.`);
  } else if (!APP_URL && process.env.NODE_ENV !== 'development') {
     console.error(`APP_URL is not defined for fetching API requests count. Fetch URL was ${fetchUrl}. Critical error.`);
     return 0;
  }

  try {
    // This fetch is from Server Component to its own API route, so cookies might be forwarded by Next.js
    // depending on deployment, but our /api/usage route explicitly reads cookies.
    const response = await fetch(fetchUrl, { cache: 'no-store' }); 
    if (!response.ok) {
      console.error(`Failed to fetch API requests count from internal ${fetchUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`Error body for internal ${fetchUrl}: ${errorBody}`);
      return 0;
    }
    const data = await response.json();
    // Adjust based on the actual structure returned by your external /usage endpoint
    return data.api_requests_24h || 0; 
  } catch (error) {
    console.error(`Error fetching API requests count from internal ${fetchUrl}:`, error);
    return 0;
  }
}

const mockRecentUsers = [
  { id: 'usr_1', name: 'Satoshi Tajiri', email: 'satoshi@poke.jp', role: 'Admin', status: 'Active', preferredUsername: 'satoshi', createdAt: new Date().toISOString(), lastSeen: new Date().toISOString() },
  { id: 'usr_2', name: 'Ken Sugimori', email: 'ken@poke.jp', role: 'Editor', status: 'Active', preferredUsername: 'ken', createdAt: new Date().toISOString(), lastSeen: new Date().toISOString() },
  { id: 'usr_3', name: 'Junichi Masuda', email: 'junichi@poke.jp', role: 'Viewer', status: 'Inactive', preferredUsername: 'junichi', createdAt: new Date().toISOString(), lastSeen: new Date().toISOString() },
];

export default async function AdminDashboardPage() {
  // Ensure APP_URL is available for server-side fetches to its own API routes
  // If process.env.APP_URL is not set, it will default to localhost for local dev
  // but might fail in deployed environments if not configured.
  const appUrlIsSet = !!process.env.APP_URL;
  if (!appUrlIsSet && process.env.NODE_ENV !== 'development') {
      console.error("CRITICAL: APP_URL is not set in a non-development environment. Dashboard data fetching will likely fail.");
  }


  const [totalCards, totalSets, setReleaseTimelineData, totalUsers, apiRequests24h] = await Promise.all([
    fetchTotalCountFromPaginated("cards"),
    fetchTotalCountFromPaginated("sets"),
    fetchSetReleaseData(),
    fetchTotalUsersCount(), 
    fetchApiRequests24h(),
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
            <p className="text-xs text-muted-foreground">{(appUrlIsSet && totalCards > 0) || (process.env.NODE_ENV === 'development' && totalCards > 0) ? "Live data (via internal API)" : "No data / API error"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sets</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{(appUrlIsSet && totalSets > 0) || (process.env.NODE_ENV === 'development' && totalSets > 0) ? "Live data (via internal API)" : "No data / API error"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiRequests24h.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{(appUrlIsSet && apiRequests24h >= 0) || (process.env.NODE_ENV === 'development' && apiRequests24h >=0) ? "Live data (from external API via internal proxy)" : "No data / API error"}</p>
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
            <SetReleaseChart 
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
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} 
                             className={cn(
                                'border', 
                                user.status === 'Active' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' 
                                                        : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-500'
                              )}>
                        {user.status}
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

