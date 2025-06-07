
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Eye } from "lucide-react";
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
  set: { // Set structure can also vary
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
  imageUrl: string; // Small image for list view, with fallback
  number: string;
  artist: string;
}

interface SetOption {
  id: string;
  name: string;
}

const APP_URL = process.env.APP_URL || "";
const PRIMARY_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
const BACKUP_EXTERNAL_API_BASE_URL = 'https://api.pokemontcg.io/v2';


async function getSetOptions(): Promise<SetOption[]> {
  if (!APP_URL) {
    console.error("APP_URL is not defined. Cannot fetch set options.");
    return [];
  }
  try {
    const response = await fetch(`${APP_URL}/api/sets?select=id,name&orderBy=name`);
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
    return [];
  }
  try {
    const response = await fetch(`${APP_URL}/api/types`);
    if (!response.ok) throw new Error('Failed to fetch types from internal API');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching type options from internal API:", error);
    return [];
  }
}

async function getRarityOptions(): Promise<string[]> {
  if (!APP_URL) {
    console.error("APP_URL is not defined. Cannot fetch rarity options.");
    return [];
  }
  try {
    const response = await fetch(`${APP_URL}/api/rarities`);
    if (!response.ok) throw new Error('Failed to fetch rarities from internal API');
    const data = await response.json();
    return (data.data || []).filter((r: string | null) => r && r.trim() !== "");
  } catch (error) {
    console.error("Error fetching rarity options from internal API:", error);
    return [];
  }
}

async function getCards(filters: { search?: string; set?: string; type?: string; rarity?: string }): Promise<PokemonCard[]> {
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
  queryParams.set('pageSize', '24');
  queryParams.set('orderBy', 'name'); // Sorting by name can be helpful
  const queryString = queryParams.toString();

  let apiResponse;
  let fetchUrl = ""; // To log the actual URL being fetched

  const mapApiCardToPokemonCard = (apiCard: ApiPokemonCardSource): PokemonCard => ({
    id: apiCard.id,
    name: apiCard.name,
    setName: apiCard.set?.name || "Unknown Set",
    rarity: apiCard.rarity || "Unknown",
    type: apiCard.types?.[0] || "Colorless",
    imageUrl: apiCard.images?.small || apiCard.images?.large || "https://placehold.co/245x342.png", // Prefer small, fallback to large, then placeholder
    number: apiCard.number || "??",
    artist: apiCard.artist || "N/A",
  });

  // Try Primary API
  if (PRIMARY_EXTERNAL_API_BASE_URL) {
    fetchUrl = `${PRIMARY_EXTERNAL_API_BASE_URL}/cards${queryString ? `?${queryString}` : ''}`;
    console.log('Fetching cards with URL (getCards function - Primary Attempt):', fetchUrl);
    try {
      apiResponse = await fetch(fetchUrl);
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        return (data.data || []).map(mapApiCardToPokemonCard);
      }
      const errorData = await apiResponse.text();
      console.warn(`Primary API (${fetchUrl}) failed: ${apiResponse.status}`, errorData);
    } catch (error) {
      console.warn(`Failed to fetch from Primary API (${fetchUrl}):`, error);
    }
  } else {
     console.warn("Primary External API base URL not configured. Proceeding to backup.");
  }

  // Try Backup API if Primary failed or was not configured
  fetchUrl = `${BACKUP_EXTERNAL_API_BASE_URL}/cards${queryString ? `?${queryString}` : ''}`;
  console.log('Attempting to fetch cards from Backup API (getCards function):', fetchUrl);
  try {
    apiResponse = await fetch(fetchUrl);
    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      console.error(`Backup API (${fetchUrl}) also failed: ${apiResponse.status}`, errorData);
      return [];
    }
    const data = await apiResponse.json();
    return (data.data || []).map(mapApiCardToPokemonCard);
  } catch (error) {
    console.error(`Failed to fetch from Backup API (${fetchUrl}):`, error);
    return [];
  }
}

export default async function CardsPage({ searchParams }: { searchParams?: { search?: string; set?: string; type?: string; rarity?: string } }) {
  const currentSearch = searchParams?.search ?? "";
  const currentSet = searchParams?.set ?? "All Sets";
  const currentType = searchParams?.type ?? "All Types";
  const currentRarity = searchParams?.rarity ?? "All Rarities";

  const currentFilters = {
    search: currentSearch,
    set: currentSet,
    type: currentType,
    rarity: currentRarity,
  };

  const [cards, setOptions, typeOptions, rarityOptions] = await Promise.all([
    getCards(currentFilters),
    getSetOptions(),
    getTypeOptions(),
    getRarityOptions()
  ]);

  const allSetOptions: SetOption[] = [{ id: "All Sets", name: "All Sets" }, ...setOptions];
  const allTypeOptions: string[] = ["All Types", ...typeOptions];
  const allRarityOptions: string[] = ["All Rarities", ...rarityOptions];


  return (
    <>
      <PageHeader
        title="Pokémon Cards"
        description="Browse and search for individual Pokémon cards."
        icon={CreditCard}
      />
      <CardFiltersForm
        initialSearch={currentSearch}
        initialSet={currentSet}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {cards.map((card) => (
            <Card key={card.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
              <CardHeader className="p-0 relative aspect-[245/342] bg-muted flex items-center justify-center">
                <Image
                    src={card.imageUrl} // This now has a robust fallback
                    alt={card.name}
                    width={245}
                    height={342}
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
      )}
    </>
  );
}
