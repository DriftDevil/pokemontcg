
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
    total?: number; // Matches openapi.yaml 'total' and also in pokemontcg.io (different meaning)
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
  images?: { small?: string; large?: string }; // Both small and large are optional
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
  printedTotal?: number;
  officialTotal?: number; // This will typically come from `set.total` from API
}


const APP_URL = process.env.APP_URL || "";
const PRIMARY_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const BACKUP_EXTERNAL_API_BASE_URL = 'https://api.pokemontcg.io/v2';
const REQUESTED_PAGE_SIZE = 24;
const BACKUP_API_FOR_FILTERS_URL = 'https://api.pokemontcg.io/v2';


async function getSetOptions(): Promise<SetOption[]> {
  if (!APP_URL) {
    console.error("APP_URL is not defined. Cannot fetch set options.");
    return [];
  }
  try {
    // Fetch all sets for options by omitting pagination params or using a specific 'all' flag if API supports
    const response = await fetch(`${APP_URL}/api/sets?select=id,name&orderBy=name&limit=500`); // Assuming limit=500 gets most/all sets
    if (!response.ok) throw new Error('Failed to fetch sets from internal API');
    const data = await response.json();
    return (data.data || []).map((set: any) => ({ id: set.id, name: set.name }));
  } catch (error) {
    console.error("Error fetching set options from internal API:", error);
    return [];
  }
}

async function getTypeOptions(): Promise<string[]> {
  if (!APP_URL) {
    console.error("APP_URL is not defined. Cannot fetch type options.");
    return ["All Types"];
  }
  try {
    const response = await fetch(`${APP_URL}/api/types`);
    if (!response.ok) throw new Error('Failed to fetch types from internal API');
    const data = await response.json();
    const types = data.data || [];
    return ["All Types", ...types.sort()];
  } catch (error) {
    console.error("Error fetching type options from internal API:", error);
    return ["All Types"];
  }
}

async function getRarityOptions(): Promise<string[]> {
  if (!APP_URL) {
    console.error("APP_URL is not defined. Cannot fetch rarity options.");
    return ["All Rarities"];
  }
  try {
    const response = await fetch(`${APP_URL}/api/rarities`);
    if (!response.ok) throw new Error('Failed to fetch rarities from internal API');
    const data = await response.json();
    const rarities = (data.data || []).filter((r: string | null) => r && r.trim() !== "");
    return ["All Rarities", ...rarities.sort()];
  } catch (error) {
    console.error("Error fetching rarity options from internal API:", error);
    return ["All Rarities"];
  }
}

async function getSetSpecificTypeOptions(setId: string): Promise<string[]> {
  if (!setId || setId === "All Sets") return ["All Types"]; // Should not happen if called correctly
  try {
    const response = await fetch(`${BACKUP_API_FOR_FILTERS_URL}/cards?q=set.id:${setId}&select=types&pageSize=250`);
    if (!response.ok) {
      console.error(`Failed to fetch types for set ${setId}: ${response.status}`);
      return ["All Types"];
    }
    const data = await response.json();
    const cards: ApiPokemonCardSource[] = data.data || [];
    if (cards.length === 0) return ["All Types"];
    const allTypesInSet = cards.flatMap(card => card.types || []);
    const uniqueTypes = Array.from(new Set(allTypesInSet)).sort();
    return ["All Types", ...uniqueTypes];
  } catch (error) {
    console.error(`Error fetching types for set ${setId}:`, error);
    return ["All Types"]; // Fallback
  }
}

async function getSetSpecificRarityOptions(setId: string): Promise<string[]> {
  if (!setId || setId === "All Sets") return ["All Rarities"]; // Should not happen
  try {
    const response = await fetch(`${BACKUP_API_FOR_FILTERS_URL}/cards?q=set.id:${setId}&select=rarity&pageSize=250`);
    if (!response.ok) {
      console.error(`Failed to fetch rarities for set ${setId}: ${response.status}`);
      return ["All Rarities"];
    }
    const data = await response.json();
    const cards: ApiPokemonCardSource[] = data.data || [];
    if (cards.length === 0) return ["All Rarities"];
    const allRaritiesInSet = cards.map(card => card.rarity).filter(Boolean) as string[];
    const uniqueRarities = Array.from(new Set(allRaritiesInSet)).sort();
    return ["All Rarities", ...uniqueRarities];
  } catch (error) {
    console.error(`Error fetching rarities for set ${setId}:`, error);
    return ["All Rarities"]; // Fallback
  }
}

async function getSelectedSetDetails(setId: string): Promise<SelectedSetDetails | null> {
  if (!APP_URL || !setId || setId === "All Sets") {
    return null;
  }
  try {
    const response = await fetch(`${APP_URL}/api/sets/${setId}`);
    if (!response.ok) {
      console.error(`Failed to fetch details for set ${setId} from internal API: ${response.status}`);
      return null;
    }
    const data = await response.json();
    // The single set endpoint might return data nested under a 'data' key, or directly
    const setData = data.data || data; 
    if (!setData || !setData.id) {
        console.error(`No valid data found for set ${setId} in response:`, data);
        return null;
    }
    return {
      id: setData.id,
      name: setData.name,
      printedTotal: setData.printedTotal,
      officialTotal: setData.total, // 'total' often means official total from APIs like pokemontcg.io
    };
  } catch (error) {
    console.error(`Error fetching details for set ${setId} from internal API:`, error);
    return null;
  }
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
    const rarityValue = filters.rarity.includes(" ") ? `"${filters.rarity}"` : filters.rarity;
    queryParts.push(`rarity:${rarityValue}`);
  }

  if (queryParts.length > 0) {
    queryParams.set('q', queryParts.join(' '));
  }

  const currentPage = filters.page || 1;
  queryParams.set('page', currentPage.toString());
  
  const usePrimaryApi = !!PRIMARY_EXTERNAL_API_BASE_URL;
  const pageSizeParamName = usePrimaryApi ? 'limit' : 'pageSize';
  queryParams.set(pageSizeParamName, REQUESTED_PAGE_SIZE.toString());
  
  if (filters.set && filters.set !== "All Sets") {
    queryParams.set('orderBy', 'number'); 
  } else {
    queryParams.set('orderBy', 'name'); 
  }
  const queryString = queryParams.toString();

  let apiResponse;
  let fetchUrl = ""; 

  const mapApiCardToPokemonCard = (apiCard: ApiPokemonCardSource): PokemonCard => ({
    id: apiCard.id,
    name: apiCard.name,
    setName: apiCard.set?.name || "Unknown Set",
    rarity: apiCard.rarity || "Unknown",
    type: apiCard.types?.[0] || "Colorless",
    imageUrl: apiCard.images?.large || apiCard.images?.small || `https://placehold.co/245x342.png`, // Prioritize large image
    number: apiCard.number || "??",
    artist: apiCard.artist || "N/A",
  });
  
  const defaultReturn: PokemonCardListResult = { cards: [], currentPage: 1, totalPages: 1, totalCount: 0, pageSize: REQUESTED_PAGE_SIZE };

  const processResponse = async (response: Response, source: 'Primary' | 'Backup'): Promise<PokemonCardListResult> => {
    if (!response.ok) {
      const errorData = await response.text();
      console.warn(`${source} API (${fetchUrl}) failed: ${response.status}`, errorData);
      if (source === 'Primary' && PRIMARY_EXTERNAL_API_BASE_URL) return defaultReturn; 
      throw new Error(`${source} API error: ${response.status}`);
    }
    const responseData = await response.json();
    const cards = (responseData.data || []).map(mapApiCardToPokemonCard);

    const apiCurrentPage = responseData.page || 1;
    const apiPageSize = responseData.limit || responseData.pageSize || REQUESTED_PAGE_SIZE;
    const apiCountOnPage = responseData.count || cards.length;
    const apiTotalCount = responseData.totalCount || responseData.total || 0;

    let apiTotalPages = responseData.totalPages;
    if (apiTotalPages === undefined) {
      if (apiTotalCount > 0 && apiPageSize > 0) {
        apiTotalPages = Math.ceil(apiTotalCount / apiPageSize);
      } else if (apiCountOnPage > 0 && apiPageSize > 0 && apiCurrentPage === 1 && apiCountOnPage < apiPageSize) {
        apiTotalPages = 1;
      } else if (apiCountOnPage === 0 && apiCurrentPage === 1) {
        apiTotalPages = 0; 
      } else {
        apiTotalPages = apiCurrentPage; 
      }
    }
    apiTotalPages = Math.max(1, apiTotalPages); 

    return { cards, currentPage: apiCurrentPage, totalPages: apiTotalPages, totalCount: apiTotalCount, pageSize: apiPageSize };
  };


  if (PRIMARY_EXTERNAL_API_BASE_URL) {
    fetchUrl = `${PRIMARY_EXTERNAL_API_BASE_URL}/v2/cards${queryString ? `?${queryString}` : ''}`;
    console.log('Fetching cards with URL (getCards function - Primary Attempt):', fetchUrl);
    try {
      apiResponse = await fetch(fetchUrl);
      const result = await processResponse(apiResponse, 'Primary');
      if (apiResponse.ok) return result; 
    } catch (error) {
      console.warn(`Failed to fetch or process from Primary API (${fetchUrl}):`, error);
    }
  } else {
     console.warn("Primary External API base URL not configured. Proceeding to backup.");
  }

  fetchUrl = `${BACKUP_EXTERNAL_API_BASE_URL}/cards${queryString ? `?${queryString}` : ''}`;
  console.log('Attempting to fetch cards from Backup API (getCards function):', fetchUrl);
  try {
    apiResponse = await fetch(fetchUrl);
    return await processResponse(apiResponse, 'Backup');
  } catch (error) {
    console.error(`Failed to fetch or process from Backup API (${fetchUrl}):`, error);
    return defaultReturn;
  }
}

export default async function CardsPage({
  searchParams = {}
}: {
  searchParams?: {
    search?: string;
    set?: string;
    type?: string;
    rarity?: string;
    page?: string;
  };
}) {
  const currentSearch = searchParams.search ?? "";
  const currentSetId = searchParams.set ?? "All Sets";
  const currentType = searchParams.type ?? "All Types";
  const currentRarity = searchParams.rarity ?? "All Rarities";
  const currentPageParam = searchParams.page ?? "1";
  const currentPage = parseInt(currentPageParam, 10) || 1;


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
    typeOptionsData, 
    rarityOptionsData,
    selectedSetDetails // New variable to hold fetched set details
  ] = await Promise.all([
    getCards({ ...currentFilters, page: currentPage }),
    getSetOptions(),
    isSpecificSetSelected ? getSetSpecificTypeOptions(currentSetId) : getTypeOptions(),
    isSpecificSetSelected ? getSetSpecificRarityOptions(currentSetId) : getRarityOptions(),
    isSpecificSetSelected ? getSelectedSetDetails(currentSetId) : Promise.resolve(null) // Fetch set details if a specific set is selected
  ]);

  const allSetOptions: SetOption[] = Array.from(new Map([{ id: "All Sets", name: "All Sets" }, ...setOptionsData].map(item => [item.id, item])).values());
  
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


  return (
    <>
      <PageHeader
        title="Pokémon Cards"
        description="Browse and search for individual Pokémon cards."
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

      {selectedSetDetails && (
        <div className="mb-6 md:mb-8 text-center md:text-left">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground mb-1">
            {selectedSetDetails.name}
          </h2>
          {selectedSetDetails.printedTotal !== undefined && selectedSetDetails.officialTotal !== undefined && (
            <p className="text-md text-muted-foreground">
              Total: {selectedSetDetails.printedTotal}
              {selectedSetDetails.officialTotal > selectedSetDetails.printedTotal &&
                ` (+${selectedSetDetails.officialTotal - selectedSetDetails.printedTotal} Secret)`}
              {' '}cards
            </p>
          )}
        </div>
      )}


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
                      quality={100}
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

    
