
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

// Helper function to fetch total counts from internal API for paginated resources
async function fetchTotalCountFromPaginated(endpoint: string): Promise<number> {
  const APP_URL = process.env.APP_URL || "";
  if (!APP_URL) {
    console.error(`APP_URL is not defined for dashboard data fetching of ${endpoint}.`);
    return 0;
  }
  try {
    const response = await fetch(`${APP_URL}/api/${endpoint}?limit=1`);
    if (!response.ok) {
      console.error(`Failed to fetch ${endpoint} count: ${response.status}`);
      const errorBody = await response.text();
      console.error(`Error body: ${errorBody}`);
      return 0;
    }
    const data = await response.json();
    return data.totalCount || data.total || 0; 
  } catch (error) {
    console.error(`Error fetching ${endpoint} count:`, error);
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
  if (!APP_URL) {
    console.error("APP_URL is not defined for dashboard data fetching of set releases.");
    return [];
  }
  try {
    // Use 'all=true' as defined in openapi.yaml to fetch all sets
    const response = await fetch(`${APP_URL}/api/sets?all=true&orderBy=-releaseDate`); 
    if (!response.ok) {
      console.error(`Failed to fetch set release data: ${response.status}`);
      const errorBody = await response.text();
      console.error(`Error body: ${errorBody}`);
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
    console.error("Error fetching or processing set release data:", error);
    return [];
  }
}

async function fetchTotalUsersCount(): Promise<number> {
  const APP_URL = process.env.APP_URL || "";
  if (!APP_URL) {
    console.error("APP_URL is not defined for fetching total users count.");
    return 0;
  }
  try {
    const response = await fetch(`${APP_URL}/api/users/all`);
    if (!response.ok) {
      console.error(`Failed to fetch total users count: ${response.status}`);
      const errorBody = await response.text();
      console.error(`Error body: ${errorBody}`);
      return 0;
    }
    const data: { data?: ApiUserType[] } = await response.json();
    return data.data?.length || 0;
  } catch (error) {
    console.error("Error fetching total users count:", error);
    return 0;
  }
}

async function fetchApiRequests24h(): Promise<number> {
  const APP_URL = process.env.APP_URL || "";
  if (!APP_URL) {
    console.error("APP_URL is not defined for fetching API requests count.");
    return 0;
  }
  try {
    const response = await fetch(`${APP_URL}/api/metrics`);
    if (!response.ok) {
      console.error(`Failed to fetch API requests count: ${response.status}`);
      const errorBody = await response.text();
      console.error(`Error body: ${errorBody}`);
      return 0;
    }
    // Assuming the /metrics endpoint returns JSON like: { "api_requests_24h": 12345 }
    // Or if nested: { "data": { "api_requests_24h": 12345 } }
    const data = await response.json();
    return data.api_requests_24h || data.data?.api_requests_24h || 0;
  } catch (error) {
    console.error("Error fetching API requests count:", error);
    return 0;
  }
}

const mockRecentUsers = [
  { id: 'usr_1', name: 'Satoshi Tajiri', email: 'satoshi@poke.jp', role: 'Admin', status: 'Active' },
  { id: 'usr_2', name: 'Ken Sugimori', email: 'ken@poke.jp', role: 'Editor', status: 'Active' },
  { id: 'usr_3', name: 'Junichi Masuda', email: 'junichi@poke.jp', role: 'Viewer', status: 'Inactive' },
];

export default async function AdminDashboardPage() {
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
            <p className="text-xs text-muted-foreground">{totalUsers > 0 || (process.env.APP_URL && totalUsers === 0) ? "Live data" : "No data / API error"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCards.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{totalCards > 0 ? "Live data" : "No data / API error"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sets</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{totalSets > 0 ? "Live data" : "No data / API error"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiRequests24h.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{apiRequests24h > 0 || (process.env.APP_URL && apiRequests24h === 0) ? "Live data" : "No data / API error"}</p>
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

    