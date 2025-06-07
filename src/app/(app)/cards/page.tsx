import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Search, Eye, Filter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Mock data for cards
const mockCards = [
  { id: "base1-4", name: "Charizard", setName: "Base Set", rarity: "Holo Rare", type: "Fire", imageUrl: "https://placehold.co/245x342.png?text=Charizard", number: "4/102", artist: "Mitsuhiro Arita" },
  { id: "base1-58", name: "Pikachu", setName: "Base Set", rarity: "Common", type: "Lightning", imageUrl: "https://placehold.co/245x342.png?text=Pikachu", number: "58/102", artist: "Mitsuhiro Arita" },
  { id: "neo1-1", name: "Ampharos", setName: "Neo Genesis", rarity: "Holo Rare", type: "Lightning", imageUrl: "https://placehold.co/245x342.png?text=Ampharos", number: "1/111", artist: "Kimiya Masago" },
  { id: "swsh1-50", name: "Zacian V", setName: "Sword & Shield", rarity: "Ultra Rare", type: "Metal", imageUrl: "https://placehold.co/245x342.png?text=ZacianV", number: "138/202", artist: "5ban Graphics" },
  { id: "sv1-198", name: "Miraidon ex", setName: "Scarlet & Violet", rarity: "Double Rare", type: "Lightning", imageUrl: "https://placehold.co/245x342.png?text=MiraidonEx", number: "079/198", artist: "5ban Graphics" },
  { id: "gym1-1", name: "Blaine's Arcanine", setName: "Gym Heroes", rarity: "Holo Rare", type: "Fire", imageUrl: "https://placehold.co/245x342.png?text=Arcanine", number: "1/132", artist: "Ken Sugimori" },
];

const mockSetNames = ["All Sets", "Base Set", "Neo Genesis", "Sword & Shield", "Scarlet & Violet", "Gym Heroes"];
const mockTypes = ["All Types", "Fire", "Water", "Grass", "Lightning", "Psychic", "Fighting", "Darkness", "Metal", "Fairy", "Dragon", "Colorless"];
const mockRarities = ["All Rarities", "Common", "Uncommon", "Rare", "Holo Rare", "Ultra Rare", "Secret Rare", "Double Rare"];


export type PokemonCard = typeof mockCards[0];

async function getCards(filters: { search?: string; set?: string; type?: string; rarity?: string }): Promise<PokemonCard[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  let filteredCards = mockCards;
  if (filters.search) {
    filteredCards = filteredCards.filter(card => card.name.toLowerCase().includes(filters.search!.toLowerCase()));
  }
  if (filters.set && filters.set !== "All Sets") {
    filteredCards = filteredCards.filter(card => card.setName === filters.set);
  }
  if (filters.type && filters.type !== "All Types") {
    filteredCards = filteredCards.filter(card => card.type === filters.type);
  }
  if (filters.rarity && filters.rarity !== "All Rarities") {
    filteredCards = filteredCards.filter(card => card.rarity === filters.rarity);
  }
  return filteredCards;
}

export default async function CardsPage({ searchParams }: { searchParams?: { search?: string; set?: string; type?: string; rarity?: string } }) {
  const filters = {
    search: searchParams?.search || "",
    set: searchParams?.set || "All Sets",
    type: searchParams?.type || "All Types",
    rarity: searchParams?.rarity || "All Rarities",
  };
  const cards = await getCards(filters);

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
                {mockSetNames.map(setName => <SelectItem key={setName} value={setName}>{setName}</SelectItem>)}
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
                {mockTypes.map(typeName => <SelectItem key={typeName} value={typeName}>{typeName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
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
              <CardHeader className="p-0 relative">
                <Image
                  src={card.imageUrl}
                  alt={card.name}
                  width={245}
                  height={342}
                  className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                  data-ai-hint="pokemon card art"
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
