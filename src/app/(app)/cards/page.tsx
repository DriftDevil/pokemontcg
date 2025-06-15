
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import CardFiltersForm from '@/components/cards/card-filters-form';

// Interface for the raw API response from external sources.
// Fields are optional to accommodate differences between primary (sparse) and backup (rich) APIs.
interface ApiPokemonCardSource {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
  level?: string;
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  abilities?: { name: string; text: string; type: string }[];
  attacks?: {
    name: string;
    cost: string[];
    convertedEnergyCost: number;
    damage: string;
    text: string;
  }[];
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  set?: { // Set structure can also vary
    id: string;
    name: string;
    series?: string;
    printedTotal?: number;
    total?: number;
    legalities?: { [key: string]: string };
    ptcgoCode?: string;
    releaseDate?: string;
    updatedAt?: string;
    images?: { symbol: string; logo: string };
  };
  number?: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: { [key: string]: string };
  images?: { small?: string; large?: string };
  tcgplayer?: any;
  cardmarket?: any;
}

// Interface for the card data structure used by this page's components.
export interface PokemonCard {
  id: string;
  name: string;
  setName: string;
  rarity: string;
  type: string; // Primary type
  imageUrl: string; // Image for list view, prioritizing large image
  number: string;
  artist: string;
}

interface PokemonCardListResult {
  cards: PokemonCard[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}


interface SetOption {
  id: string;
  name: string;
}

// Interface for the details of a single selected set
interface SelectedSetDetails {
  id: string;
  name: string;
  printedTotal?: number; // Standard cards in set
  officialTotal?: number; // Total cards including secrets
}


const PRIMARY_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const BACKUP_EXTERNAL_API_BASE_URL = 'https://api.pokemontcg.io/v2';
const REQUESTED_PAGE_SIZE = 24;
const BACKUP_API_FOR_FILTERS_URL = 'https://api.pokemontcg.io/v2'; // For type/rarity specific to set

function getBaseUrlForApi(): string {
  const appUrlEnv = process.env.APP_URL;
  if (appUrlEnv) {
    try {
      const parsedAppUrl = new URL(appUrlEnv);
      // Ensure it's the origin (scheme, hostname, port)
      return parsedAppUrl.origin;
    } catch (error) {
      console.error(`[CardsPage - getBaseUrlForApi] Invalid APP_URL: ${appUrlEnv}. Error: ${error}. Falling back to localhost.`);
    }
  }
  // Fallback for local development if APP_URL is not set
  const port = process.env.PORT || "9002"; // Default Next.js dev port
  const defaultUrl = `http://localhost:${port}`;
  if (process.env.NODE_ENV === 'production' && !appUrlEnv) {
    console.error(`[CardsPage - getBaseUrlForApi] CRITICAL: APP_URL is not set in production. Internal API calls will use ${defaultUrl} and likely fail.`);
  } else if (!appUrlEnv) {
    console.warn(`[CardsPage - getBaseUrlForApi] APP_URL not set. Defaulting to ${defaultUrl} for internal API calls.`);
  }
  return defaultUrl;
}


async function getSetOptions(): Promise<SetOption[]> {
  const baseUrl = getBaseUrlForApi();
  if (!baseUrl) {
    console.error("[CardsPage - getSetOptions] Base URL for API is not available. Cannot fetch set options.");
    return [];
  }
  try {
    const response = await fetch(`${baseUrl}/api/sets?select=id,name&orderBy=name&limit=500`); // Using limit for potentially large number of sets
    if (!response.ok) throw new Error(`Failed to fetch sets from internal API: ${response.status}`);
    const data = await response.json();
    return (data.data || []).map((set: any) => ({ id: set.id, name: set.name }));
  } catch (error) {
    console.error("[CardsPage - getSetOptions] Error fetching set options from internal API:", error);
    return [];
  }
}

async function getTypeOptions(): Promise<string[]> {
  const baseUrl = getBaseUrlForApi();
   if (!baseUrl) {
    console.error("[CardsPage - getTypeOptions] Base URL for API is not available. Cannot fetch type options.");
    return ["All Types"];
  }
  try {
    // Fetching from internal API proxy
    const response = await fetch(`${baseUrl}/api/types`);
    if (!response.ok) throw new Error(`Failed to fetch types from internal API: ${response.status}`);
    const data = await response.json();
    const types = data.data || []; // Assuming the proxied response wraps types in 'data'
    return ["All Types", ...types.sort()];
  } catch (error) {
    console.error("[CardsPage - getTypeOptions] Error fetching type options from internal API:", error);
    return ["All Types"];
  }
}

async function getRarityOptions(): Promise<string[]> {
  const baseUrl = getBaseUrlForApi();
  if (!baseUrl) {
    console.error("[CardsPage - getRarityOptions] Base URL for API is not available. Cannot fetch rarity options.");
    return ["All Rarities"];
  }
  try {
    // Fetching from internal API proxy
    const response = await fetch(`${baseUrl}/api/rarities`);
    if (!response.ok) throw new Error(`Failed to fetch rarities from internal API: ${response.status}`);
    const data = await response.json();
    const rarities = (data.data || []).filter((r: string | null) => r && r.trim() !== ""); // Assuming proxied response wraps in 'data'
    return ["All Rarities", ...rarities.sort()];
  } catch (error) {
    console.error("[CardsPage - getRarityOptions] Error fetching rarity options from internal API:", error);
    return ["All Rarities"];
  }
}

async function getSetSpecificTypeOptions(setId: string): Promise<string[]> {
  if (!setId || setId === "All Sets") return ["All Types"]; // No specific set, return global list or default
  // Fetch types specific to this set (using direct external API as this is dynamic and less critical for proxy)
  try {
    const response = await fetch(`${BACKUP_API_FOR_FILTERS_URL}/cards?q=set.id:${setId}&select=types&pageSize=250`);
    if (!response.ok) {
      console.error(`[CardsPage - getSetSpecificTypeOptions] Failed to fetch types for set ${setId}: ${response.status}`);
      return ["All Types"]; // Fallback
    }
    const data = await response.json();
    const cards: ApiPokemonCardSource[] = data.data || [];
    if (cards.length === 0) return ["All Types"]; // No cards, no specific types
    const allTypesInSet = cards.flatMap(card => card.types || []);
    const uniqueTypes = Array.from(new Set(allTypesInSet)).sort();
    return ["All Types", ...uniqueTypes];
  } catch (error) {
    console.error(`[CardsPage - getSetSpecificTypeOptions] Error fetching types for set ${setId}:`, error);
    return ["All Types"]; // Fallback
  }
}

async function getSetSpecificRarityOptions(setId: string): Promise<string[]> {
  if (!setId || setId === "All Sets") return ["All Rarities"]; // No specific set
  // Fetch rarities specific to this set (using direct external API)
  try {
    const response = await fetch(`${BACKUP_API_FOR_FILTERS_URL}/cards?q=set.id:${setId}&select=rarity&pageSize=250`);
    if (!response.ok) {
      console.error(`[CardsPage - getSetSpecificRarityOptions] Failed to fetch rarities for set ${setId}: ${response.status}`);
      return ["All Rarities"]; // Fallback
    }
    const data = await response.json();
    const cards: ApiPokemonCardSource[] = data.data || [];
    if (cards.length === 0) return ["All Rarities"]; // No cards, no specific rarities
    const allRaritiesInSet = cards.map(card => card.rarity).filter(Boolean) as string[]; // Filter out null/undefined
    const uniqueRarities = Array.from(new Set(allRaritiesInSet)).sort();
    return ["All Rarities", ...uniqueRarities];
  } catch (error) {
    console.error(`[CardsPage - getSetSpecificRarityOptions] Error fetching rarities for set ${setId}:`, error);
    return ["All Rarities"]; // Fallback
  }
}

async function getSelectedSetDetails(setId: string): Promise<SelectedSetDetails | null> {
  const baseUrl = getBaseUrlForApi();
  if (!baseUrl || !setId || setId === "All Sets") {
    return null;
  }
  try {
    const fetchUrl = `${baseUrl}/api/sets/${setId}`;
    console.log(`[CardsPage - getSelectedSetDetails] Fetching set details from: ${fetchUrl}`);
    const response = await fetch(fetchUrl);

    if (!response.ok) {
      console.error(`[CardsPage - getSelectedSetDetails] FAILED to fetch details for set ${setId} (Status: ${response.status}) from internal API ${fetchUrl}. Body: ${await response.text()}`);
      return null;
    }
    const apiResponseData = await response.json();
    console.log(`[CardsPage - getSelectedSetDetails] RAW API RESPONSE for set ${setId}:`, JSON.stringify(apiResponseData, null, 2));

    const setData = apiResponseData.data; // Assuming the /api/sets/[id] route consistently returns { data: { ...set_object... } }

    console.log(`[CardsPage - getSelectedSetDetails] setData (apiResponseData.data) for set ${setId}:`, JSON.stringify(setData, null, 2));


    if (!setData || !setData.id) {
      console.error(`[CardsPage - getSelectedSetDetails] No valid data.id found for set ${setId} in response from ${fetchUrl}. 'setData' (expected from apiResponseData.data) was:`, setData);
      return null;
    }

    // Both APIs confirmed to use 'printedTotal' and 'total'
    const pTotal: number | undefined = setData.printedTotal !== undefined ? Number(setData.printedTotal) : undefined;
    const oTotal: number | undefined = setData.total !== undefined ? Number(setData.total) : undefined;

    console.log(`[CardsPage - getSelectedSetDetails] Successfully fetched details for set ${setId}. Name: ${setData.name}, Mapped Printed: ${pTotal}, Mapped Official: ${oTotal}`);
    return {
      id: setData.id,
      name: setData.name,
      printedTotal: pTotal,
      officialTotal: oTotal,
    };
  } catch (error) {
    console.error(`[CardsPage - getSelectedSetDetails] Error fetching/processing details for set ${setId} from internal API:`, error);
    return null;
  }
}

// Natural sort comparison function for strings containing numbers
function naturalSortCompare(aStr: string, bStr: string): number {
  const re = /(\D+)|(\d+)/g; // Match non-digits or digits
  const aParts = String(aStr).match(re) || [];
  const bParts = String(bStr).match(re) || [];

  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];

    // If both parts are numbers, compare them numerically
    if (/\d/.test(aPart) && /\d/.test(bPart)) {
      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    } else {
      // Otherwise, compare them as strings (case-insensitive for stability)
      const aPartLower = aPart.toLowerCase();
      const bPartLower = bPart.toLowerCase();
      if (aPartLower !== bPartLower) {
        return aPartLower.localeCompare(bPartLower);
      }
    }
  }
  // If one string is a prefix of the other, the shorter string comes first
  return aParts.length - bParts.length;
}


async function getCards(filters: { search?: string; set?: string; type?: string; rarity?: string; page?: number }): Promise<PokemonCardListResult> {
  const queryParams = new URLSearchParams();
  const queryParts: string[] = [];

  if (filters.search) {
    queryParts.push(`name:${filters.search}*`);
  }
  if (filters.set && filters.set !== "All Sets") {
    queryParts.push(`set.id:${filters.set}`);
  }
  if (filters.type && filters.type !== "All Types") {
    queryParts.push(`types:${filters.type}`);
  }
  if (filters.rarity && filters.rarity !== "All Rarities") {
    // Handle rarities with spaces by quoting them if necessary (though typically not needed for API query values directly)
    const rarityValue = filters.rarity.includes(" ") ? `"${filters.rarity}"` : filters.rarity;
    queryParts.push(`rarity:${rarityValue}`);
  }

  if (queryParts.length > 0) {
    queryParams.set('q', queryParts.join(' '));
  }

  const currentPage = filters.page || 1;
  queryParams.set('page', currentPage.toString());

  // Determine API and parameters based on whether PRIMARY_EXTERNAL_API_BASE_URL is set
  const usePrimaryApi = !!PRIMARY_EXTERNAL_API_BASE_URL;
  const pageSizeParamName = usePrimaryApi ? 'limit' : 'pageSize'; // Primary uses 'limit', backup uses 'pageSize'
  queryParams.set(pageSizeParamName, REQUESTED_PAGE_SIZE.toString());

  // Set orderBy: 'number_int' for primary if set is selected, 'number' for backup if set is selected, otherwise 'name'
  if (filters.set && filters.set !== "All Sets") {
    queryParams.set('orderBy', usePrimaryApi ? 'number_int' : 'number');
  } else {
    queryParams.set('orderBy', 'name'); // Default sort by name if no specific set
  }
  const queryString = queryParams.toString();

  let apiResponse;
  let fetchUrl = "";

  const mapApiCardToPokemonCard = (apiCard: ApiPokemonCardSource): PokemonCard => ({
    id: apiCard.id,
    name: apiCard.name,
    setName: apiCard.set?.name || "Unknown Set",
    rarity: apiCard.rarity || "Unknown",
    type: apiCard.types?.[0] || "Colorless", // Get primary type
    imageUrl: apiCard.images?.large || apiCard.images?.small || `https://placehold.co/245x342.png`, // Prioritize large image
    number: apiCard.number || "??", // Card number in set
    artist: apiCard.artist || "N/A",
  });

  const defaultReturn: PokemonCardListResult = { cards: [], currentPage: 1, totalPages: 1, totalCount: 0, pageSize: REQUESTED_PAGE_SIZE };

  const processResponse = async (response: Response, source: 'Primary' | 'Backup'): Promise<PokemonCardListResult> => {
    if (!response.ok) {
      const errorData = await response.text();
      console.warn(`${source} API (${fetchUrl}) failed: ${response.status}`, errorData);
      if (source === 'Primary' && PRIMARY_EXTERNAL_API_BASE_URL) return defaultReturn; // Allow fallback if primary fails non-critically
      throw new Error(`${source} API error: ${response.status}`);
    }
    const responseData = await response.json();
    let cards = (responseData.data || []).map(mapApiCardToPokemonCard);

    // Client-side sort if a specific set is selected, to ensure correct collector number order
    if (filters.set && filters.set !== "All Sets" && cards.length > 0) {
      console.log(`[CardsPage - getCards - processResponse] Client-side sorting cards for set ${filters.set} by collector number.`);
      cards.sort((a, b) => naturalSortCompare(a.number, b.number));
    }


    // Determine pagination values from API response (primary might use 'total', backup 'totalCount')
    const apiCurrentPage = responseData.page || 1;
    const apiPageSize = responseData.limit || responseData.pageSize || REQUESTED_PAGE_SIZE; // Primary: limit, Backup: pageSize
    const apiCountOnPage = responseData.count || cards.length; // Actual number of items on current page
    const apiTotalCount = responseData.total || responseData.totalCount || 0; // Primary: total, Backup: totalCount

    // Calculate totalPages, ensuring it's at least 1 if there are items, or 0 if no items.
    let apiTotalPages = responseData.totalPages; // Use if provided by API
    if (apiTotalPages === undefined) { // If API doesn't provide totalPages directly
      if (apiTotalCount > 0 && apiPageSize > 0) {
        apiTotalPages = Math.ceil(apiTotalCount / apiPageSize);
      } else if (apiCountOnPage > 0 && apiPageSize > 0 && apiCurrentPage === 1 && apiCountOnPage < apiPageSize) {
        // If only one page of results and less than pageSize, totalPages is 1
        apiTotalPages = 1;
      } else if (apiCountOnPage === 0 && apiCurrentPage === 1) {
        // No results on the first page means 0 total pages (or 1 if we must show a page)
        apiTotalPages = 0; // Or 1, depending on desired behavior for "no results"
      } else {
        // Fallback if we can't determine, assume current page is all there is
        apiTotalPages = apiCurrentPage;
      }
    }
    apiTotalPages = Math.max(1, apiTotalPages); // Ensure totalPages is at least 1 if there are results
    if (apiTotalCount === 0 && apiCurrentPage === 1) apiTotalPages = 0; // Correct for no results

    return { cards, currentPage: apiCurrentPage, totalPages: apiTotalPages, totalCount: apiTotalCount, pageSize: apiPageSize };
  };


  if (PRIMARY_EXTERNAL_API_BASE_URL) {
    fetchUrl = `${PRIMARY_EXTERNAL_API_BASE_URL}/v2/cards${queryString ? `?${queryString}` : ''}`;
    console.log('[CardsPage - getCards] Fetching cards with URL (Primary Attempt):', fetchUrl);
    try {
      apiResponse = await fetch(fetchUrl);
      const result = await processResponse(apiResponse, 'Primary');
      // If primary API call was successful (even if it returned no cards), return its result.
      if (apiResponse.ok) return result;
      // If primary API failed (e.g. 500 error), we will fall through to backup.
    } catch (error) {
      console.warn(`[CardsPage - getCards] Failed to fetch or process from Primary API (${fetchUrl}):`, error);
      // Fall through to backup API on error.
    }
  } else {
     console.warn("[CardsPage - getCards] Primary External API base URL not configured. Proceeding to backup.");
  }

  // Fallback to Backup API if primary failed or was not configured
  fetchUrl = `${BACKUP_EXTERNAL_API_BASE_URL}/cards${queryString ? `?${queryString}` : ''}`;
  console.log('[CardsPage - getCards] Attempting to fetch cards from Backup API:', fetchUrl);
  try {
    apiResponse = await fetch(fetchUrl);
    return await processResponse(apiResponse, 'Backup');
  } catch (error) {
    console.error(`[CardsPage - getCards] Failed to fetch or process from Backup API (${fetchUrl}):`, error);
    return defaultReturn; // Return default on critical failure of backup
  }
}

export default async function CardsPage({
  searchParams = {} // Default to empty object if not provided
}: {
  searchParams?: {
    search?: string;
    set?: string;
    type?: string;
    rarity?: string;
    page?: string; // Page should be a string from URL
  };
}) {
  // Ensure searchParams is always defined
  const safeSearchParams = searchParams || {};
  
  const currentSearch = safeSearchParams.search ?? "";
  const currentSetId = safeSearchParams.set ?? "All Sets";
  const currentType = safeSearchParams.type ?? "All Types";
  const currentRarity = safeSearchParams.rarity ?? "All Rarities";
  const currentPageParam = safeSearchParams.page ?? "1"; // Default to page 1 if not specified
  const currentPage = parseInt(currentPageParam, 10) || 1; // Ensure page is a number


  const currentFilters = {
    search: currentSearch,
    set: currentSetId,
    type: currentType,
    rarity: currentRarity,
  };

  const isSpecificSetSelected = currentSetId && currentSetId !== "All Sets";

  const [
    { cards, currentPage: apiCurrentPage, totalPages: apiTotalPages, totalCount: apiTotalCount },
    setOptionsData,
    typeOptionsData, // Will be global or set-specific based on isSpecificSetSelected
    rarityOptionsData, // Same as typeOptionsData
    selectedSetDetails // Will be null if no specific set is selected
  ] = await Promise.all([
    getCards({ ...currentFilters, page: currentPage }),
    getSetOptions(),
    isSpecificSetSelected ? getSetSpecificTypeOptions(currentSetId) : getTypeOptions(),
    isSpecificSetSelected ? getSetSpecificRarityOptions(currentSetId) : getRarityOptions(),
    isSpecificSetSelected ? getSelectedSetDetails(currentSetId) : Promise.resolve(null)
  ]);

  // Ensure "All Sets" is always an option and at the beginning
  const allSetOptions: SetOption[] = Array.from(new Map([{ id: "All Sets", name: "All Sets" }, ...setOptionsData].map(item => [item.id, item])).values());

  // Ensure "All Types" / "All Rarities" are present and sorted correctly
  const allTypeOptions: string[] = Array.from(new Set(typeOptionsData)).sort((a,b) => {
    if (a === "All Types") return -1;
    if (b === "All Types") return 1;
    return a.localeCompare(b);
  });

  const allRarityOptions: string[] = Array.from(new Set(rarityOptionsData)).sort((a,b) => {
      if (a === "All Rarities") return -1;
      if (b === "All Rarities") return 1;
      return a.localeCompare(b);
  });


  const createPageLink = (newPage: number) => {
    const params = new URLSearchParams();
    if (currentFilters.search) params.set('search', currentFilters.search);
    if (currentFilters.set && currentFilters.set !== "All Sets") params.set('set', currentFilters.set);
    if (currentFilters.type && currentFilters.type !== "All Types") params.set('type', currentFilters.type);
    if (currentFilters.rarity && currentFilters.rarity !== "All Rarities") params.set('rarity', currentFilters.rarity);
    params.set('page', newPage.toString());
    return `/cards?${params.toString()}`;
  };

  let pageTitle = "Pokémon Cards";
  let pageDescription = "Browse and search for individual Pokémon cards.";

  console.log("[CardsPage - Render] selectedSetDetails object:", JSON.stringify(selectedSetDetails, null, 2));

  if (selectedSetDetails && selectedSetDetails.id && selectedSetDetails.name) {
    console.log("[CardsPage - Render] selectedSetDetails IS VALID, attempting to set dynamic title/desc.");
    pageTitle = selectedSetDetails.name;
    const printed = selectedSetDetails.printedTotal;
    const official = selectedSetDetails.officialTotal;

    if (typeof official === 'number' && typeof printed === 'number') {
      if (official > printed) {
        const secretCount = official - printed;
        pageDescription = `Total Cards: ${printed} (+${secretCount} Secret). Official Total: ${official}.`;
      } else {
        // official might be equal to printed, or printed might be the only one available (if official is 0 or undefined but printed is defined)
        pageDescription = `Total Cards: ${official}.`; // Or use printed if official isn't what we expect here
      }
    } else if (typeof official === 'number') {
      // Only official total is available
      pageDescription = `Total Cards: ${official}. (Printed count unavailable)`;
    } else if (typeof printed === 'number') {
      // Only printed total is available
      pageDescription = `Printed Cards: ${printed}. (Official total unavailable)`;
    } else {
      // Neither is available reliably
      pageDescription = `Details for set: ${selectedSetDetails.name}. Card counts unavailable.`;
    }
  } else {
    console.log("[CardsPage - Render] selectedSetDetails IS NULL or INVALID, using default title/desc.");
  }


  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        icon={CreditCard}
      />
      <CardFiltersForm
        initialSearch={currentSearch}
        initialSet={currentSetId}
        initialType={currentType}
        initialRarity={currentRarity}
        setOptions={allSetOptions}
        typeOptions={allTypeOptions}
        rarityOptions={allRarityOptions}
      />

      {cards.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Cards Found</h3>
          <p className="text-muted-foreground">
            Your search criteria did not match any cards. Try adjusting your filters.
          </p>
           <Button variant="link" asChild className="mt-4">
              <Link href="/cards">Clear Filters</Link>
           </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {cards.map((card) => (
              <Card key={card.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                <CardHeader className="p-0 relative aspect-[245/342] bg-muted flex items-center justify-center">
                  <Image
                      src={card.imageUrl}
                      alt={card.name}
                      width={245}
                      height={342}
                      quality={100} // Using 100 for sharp card images
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={card.imageUrl.includes('placehold.co') ? "pokemon card" : undefined}

                    />
                </CardHeader>
                <CardContent className="p-3 flex-grow">
                  <CardTitle className="font-headline text-md leading-tight mb-1 truncate" title={card.name}>{card.name}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mb-1">Set: {card.setName}</CardDescription>
                  <div className="flex flex-wrap gap-1 text-xs mt-1">
                      <Badge variant="secondary">{card.type} Type</Badge>
                      <Badge variant="outline">{card.rarity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">No. {card.number}</p>
                </CardContent>
                <CardFooter className="p-3 bg-muted/50 border-t">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/cards/${card.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination controls */}
          {apiTotalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Page {apiCurrentPage} of {apiTotalPages} ({apiTotalCount} cards)
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

