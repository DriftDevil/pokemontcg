
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Interface for the raw API response from external sources.
// Fields are optional to accommodate differences between primary (sparse) and backup (rich) APIs.
interface ApiSet {
  id: string;
  name: string;
  series?: string; // Optional as per primary API
  printedTotal?: number; // More common in pokemontcg.io (backup)
  total?: number; // Present in primary API's Set schema for total cards in sequence
  legalities?: { // Optional
    unlimited?: string;
    standard?: string;
    expanded?: string;
  };
  ptcgoCode?: string; // Optional
  releaseDate: string;
  updatedAt?: string; // Optional
  images?: { // Optional, and its properties are also optional
    symbol?: string;
    logo?: string;
  };
}

export interface CardSet {
  id: string;
  name: string;
  releaseDate: string;
  totalCards: number;
  symbolUrl?: string; // Made optional
  logoUrl?: string;   // Made optional
}

interface CardSetListResult {
  sets: CardSet[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

const APP_URL = process.env.APP_URL || "";
const REQUESTED_PAGE_SIZE_SETS = 20;


async function getCardSets(searchTerm?: string, page: number = 1): Promise<CardSetListResult> {
  if (!APP_URL) {
    console.error("APP_URL is not defined. Cannot fetch card sets.");
    return { sets: [], currentPage: 1, totalPages: 0, totalCount: 0, pageSize: REQUESTED_PAGE_SIZE_SETS };
  }
  const queryParams = new URLSearchParams();
  if (searchTerm) {
    queryParams.set('q', `name:${searchTerm}*`);
  }
  queryParams.set('page', page.toString());
  queryParams.set('limit', REQUESTED_PAGE_SIZE_SETS.toString()); // Use 'limit' for primary API
  queryParams.set('orderBy', '-releaseDate'); // Request sort by newest release date

  const defaultReturn: CardSetListResult = { sets: [], currentPage: page, totalPages: 0, totalCount: 0, pageSize: REQUESTED_PAGE_SIZE_SETS };

  try {
    const fetchUrl = `${APP_URL}/api/sets?${queryParams.toString()}`;
    console.log('Fetching sets with URL (getCardSets function):', fetchUrl);
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      console.error("Failed to fetch sets from internal API:", response.status, await response.text());
      return defaultReturn;
    }
    const responseData = await response.json();

    const sets = (responseData.data || []).map((apiSet: ApiSet) => ({
      id: apiSet.id,
      name: apiSet.name,
      releaseDate: apiSet.releaseDate,
      totalCards: apiSet.total || apiSet.printedTotal || 0, // Use 'total' from primary, fallback to 'printedTotal'
      symbolUrl: apiSet.images?.symbol,
      logoUrl: apiSet.images?.logo,
    }));

    // Sort the current page of sets by releaseDate descending, as primary API might ignore orderBy
    sets.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());


    const apiCurrentPage = responseData.page || 1;
    const apiPageSize = responseData.limit || responseData.pageSize || REQUESTED_PAGE_SIZE_SETS;
    const apiTotalCount = responseData.total || responseData.totalCount || 0;
    
    let apiTotalPages = responseData.totalPages;
    if (apiTotalPages === undefined) {
      apiTotalPages = apiTotalCount > 0 && apiPageSize > 0 ? Math.ceil(apiTotalCount / apiPageSize) : 0;
    }
    apiTotalPages = Math.max(1, apiTotalPages); 
    if (apiTotalCount === 0) apiTotalPages = 0;


    return { 
      sets, 
      currentPage: apiCurrentPage, 
      totalPages: apiTotalPages, 
      totalCount: apiTotalCount, 
      pageSize: apiPageSize 
    };
  } catch (error) {
    console.error("Error fetching card sets from internal API:", error);
    return defaultReturn;
  }
}

export default async function CardSetsPage({ searchParams = {} }: { searchParams?: { search?: string; page?: string } }) {
  const searchTerm = searchParams.search || "";
  const currentPageParam = searchParams.page || "1";
  const currentPage = parseInt(currentPageParam, 10) || 1;

  const { sets, currentPage: apiCurrentPage, totalPages: apiTotalPages, totalCount: apiTotalCount } = await getCardSets(searchTerm, currentPage);

  const createPageLink = (newPage: number) => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    params.set('page', newPage.toString());
    return `/sets?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Pokémon Card Sets"
        description="Explore all available Pokémon TCG sets."
        icon={Layers}
        actions={
          <form className="flex items-center gap-2" method="GET" action="/sets">
            <Input type="search" name="search" placeholder="Search sets..." className="w-64" defaultValue={searchTerm} />
            <Button type="submit" variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        }
      />
      {sets.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Sets Found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? `Your search for "${searchTerm}" did not match any card sets.` : "There are currently no card sets to display."}
          </p>
          {searchTerm && (
             <Button variant="link" asChild className="mt-4">
                <Link href="/sets">Clear Search</Link>
             </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sets.map((set, index) => (
              <Card key={set.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="p-0">
                   <div className="relative w-full h-32 bg-muted flex items-center justify-center overflow-hidden">
                    {set.logoUrl ? (
                      <Image 
                        src={set.logoUrl} 
                        alt={`${set.name} logo`} 
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain p-2"
                        priority={index < 4} 
                        data-ai-hint="set logo"
                      />
                    ) : (
                      <Image 
                        src="https://placehold.co/200x80.png" 
                        alt="Placeholder set logo"
                        width={200}
                        height={80}
                        className="object-contain p-2 opacity-50"
                        data-ai-hint="set logo placeholder"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <div className="flex items-center mb-2">
                     <div className="relative w-6 h-6 mr-2 shrink-0">
                      {set.symbolUrl ? (
                          <Image 
                              src={set.symbolUrl} 
                              alt={`${set.name} symbol`} 
                              fill
                              className="object-contain" 
                              data-ai-hint="set symbol"
                          />
                      ) : (
                        <Image 
                            src="https://placehold.co/24x24.png" 
                            alt="Placeholder set symbol"
                            width={24}
                            height={24}
                            className="object-contain opacity-50"
                            data-ai-hint="set symbol placeholder"
                        />
                      )}
                      </div>
                    <CardTitle className="font-headline text-lg leading-tight">{set.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Released: {new Date(set.releaseDate).toLocaleDateString()}
                  </CardDescription>
                  <p className="text-sm text-muted-foreground mt-1">Total Cards: {set.totalCards}</p>
                </CardContent>
                <CardFooter className="p-4 bg-muted/50 border-t">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/cards?set=${encodeURIComponent(set.id)}&source=sets_page`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Cards in Set
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {apiTotalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Page {apiCurrentPage} of {apiTotalPages} ({apiTotalCount} sets)
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" disabled={apiCurrentPage <= 1}>
                  <Link href={createPageLink(apiCurrentPage - 1)}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Link>
                </Button>
                <Button asChild variant="outline" disabled={apiCurrentPage >= apiTotalPages}>
                  <Link href={createPageLink(apiCurrentPage + 1)}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

