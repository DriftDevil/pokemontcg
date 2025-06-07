
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Search, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const API_BASE_URL = 'https://api.pokemontcg.io/v2';

// Matches API structure for a card
interface ApiPokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
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
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    legalities: { [key: string]: string };
    ptcgoCode?: string;
    releaseDate: string;
    updatedAt: string;
    images: { symbol: string; logo: string };
  };
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities: { [key: string]: string };
  images: { small: string; large: string };
  tcgplayer?: any;
  cardmarket?: any;
}

export interface PokemonCard {
  id: string;
  name: string;
  setName: string;
  rarity: string;
  type: string; // Primary type
  imageUrl: string;
  number: string;
  artist: string;
}

interface SetOption {
  id: string;
  name: string;
}

async function getSetOptions(): Promise<SetOption[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/sets?select=id,name&orderBy=name`);
    if (!response.ok) throw new Error('Failed to fetch sets');
    const data = await response.json();
    return (data.data || []).map((set: any) => ({ id: set.id, name: set.name }));
  } catch (error) {
    console.error("Error fetching set options:", error);
    return [];
  }
}

async function getTypeOptions(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/types`);
    if (!response.ok) throw new Error('Failed to fetch types');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching type options:", error);
    return [];
  }
}

async function getRarityOptions(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/rarities`);
    if (!response.ok) throw new Error('Failed to fetch rarities');
    const data = await response.json();
    // Filter out potential null or empty rarities if any
    return (data.data || []).filter((r: string | null) => r && r.trim() !== "");
  } catch (error) {
    console.error("Error fetching rarity options:", error);
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
    queryParts.push(`rarity:"${filters.rarity}"`);
  }

  if (queryParts.length > 0) {
    queryParams.set('q', queryParts.join(' '));
  }
  queryParams.set('pageSize', '24'); // Fetch 24 cards for the list view
  queryParams.set('orderBy', 'name'); // Sort by name

  try {
    const response = await fetch(`${API_BASE_URL}/cards?${queryParams.toString()}`);
    if (!response.ok) {
      console.error("Failed to fetch cards:", response.status, await response.text());
      return [];
    }
    const data = await response.json();
    return (data.data || []).map((apiCard: ApiPokemonCard) => ({
      id: apiCard.id,
      name: apiCard.name,
      setName: apiCard.set.name,
      rarity: apiCard.rarity || "Unknown",
      type: apiCard.types?.[0] || "Colorless",
      imageUrl: apiCard.images.small,
      number: apiCard.number,
      artist: apiCard.artist || "N/A",
    }));
  } catch (error) {
    console.error("Error fetching cards:", error);
    return [];
  }
}

export default async function CardsPage({ searchParams }: { searchParams?: { search?: string; set?: string; type?: string; rarity?: string } }) {
  const filters = {
    search: searchParams?.search || "",
    set: searchParams?.set || "All Sets",
    type: searchParams?.type || "All Types",
    rarity: searchParams?.rarity || "All Rarities",
  };

  const [cards, setOptions, typeOptions, rarityOptions] = await Promise.all([
    getCards(filters),
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
      <form className="mb-6 p-4 border rounded-lg bg-card shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-muted-foreground mb-1">Search by Name</label>
            <Input type="search" id="search" name="search" placeholder="e.g., Charizard" defaultValue={filters.search} />
          </div>
          <div>
            <label htmlFor="set" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Set</label>
            <Select name="set" defaultValue={filters.set}>
              <SelectTrigger id="set">
                <SelectValue placeholder="Select Set" />
              </SelectTrigger>
              <SelectContent>
                {allSetOptions.map(setOpt => <SelectItem key={setOpt.id} value={setOpt.id}>{setOpt.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Type</label>
            <Select name="type" defaultValue={filters.type}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {allTypeOptions.map(typeName => <SelectItem key={typeName} value={typeName}>{typeName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
           <div>
            <label htmlFor="rarity" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Rarity</label>
            <Select name="rarity" defaultValue={filters.rarity}>
              <SelectTrigger id="rarity">
                <SelectValue placeholder="Select Rarity" />
              </SelectTrigger>
              <SelectContent>
                {allRarityOptions.map(rarityName => <SelectItem key={rarityName} value={rarityName}>{rarityName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-start-4 flex gap-2">
            <Button type="submit" className="w-full md:w-auto">
              <Search className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
             <Button type="reset" variant="outline" className="w-full md:w-auto" asChild>
                <Link href="/cards">Clear</Link>
             </Button>
          </div>
        </div>
      </form>

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
                {card.imageUrl ? (
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    width={245}
                    height={342}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : <div className="text-sm text-muted-foreground">No Image</div> }
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
