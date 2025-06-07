import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Search, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Mock data for card sets
const mockSets = [
  { id: "base1", name: "Base Set", releaseDate: "1999-01-09", totalCards: 102, symbolUrl: "https://placehold.co/40x40.png?text=BS", logoUrl: "https://placehold.co/150x50.png?text=BaseSetLogo" },
  { id: "neo1", name: "Neo Genesis", releaseDate: "2000-12-16", totalCards: 111, symbolUrl: "https://placehold.co/40x40.png?text=NG", logoUrl: "https://placehold.co/150x50.png?text=NeoGenesisLogo" },
  { id: "swsh1", name: "Sword & Shield", releaseDate: "2020-02-07", totalCards: 216, symbolUrl: "https://placehold.co/40x40.png?text=SW", logoUrl: "https://placehold.co/150x50.png?text=SwordShieldLogo" },
  { id: "sv1", name: "Scarlet & Violet", releaseDate: "2023-03-31", totalCards: 258, symbolUrl: "https://placehold.co/40x40.png?text=SV", logoUrl: "https://placehold.co/150x50.png?text=ScarletVioletLogo" },
  { id: "gym1", name: "Gym Heroes", releaseDate: "2000-08-14", totalCards: 132, symbolUrl: "https://placehold.co/40x40.png?text=GH", logoUrl: "https://placehold.co/150x50.png?text=GymHeroesLogo" },
  { id: "ex1", name: "Ruby & Sapphire", releaseDate: "2003-06-18", totalCards: 109, symbolUrl: "https://placehold.co/40x40.png?text=RS", logoUrl: "https://placehold.co/150x50.png?text=RubySapphireLogo" },
];

export type CardSet = typeof mockSets[0];

async function getCardSets(searchTerm?: string): Promise<CardSet[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  if (searchTerm) {
    return mockSets.filter(set => set.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }
  return mockSets;
}

export default async function CardSetsPage({ searchParams }: { searchParams?: { search?: string } }) {
  const searchTerm = searchParams?.search || "";
  const sets = await getCardSets(searchTerm);

  return (
    <>
      <PageHeader
        title="Pokémon Card Sets"
        description="Explore all available Pokémon TCG sets."
        icon={Layers}
        actions={
          <form className="flex items-center gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sets.map((set) => (
            <Card key={set.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="p-0">
                <div className="relative w-full h-32 bg-muted">
                  <Image 
                    src={set.logoUrl} 
                    alt={`${set.name} logo`} 
                    layout="fill" 
                    objectFit="contain" 
                    className="p-4"
                    data-ai-hint="pokemon set logo"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <div className="flex items-center mb-2">
                  <Image 
                    src={set.symbolUrl} 
                    alt={`${set.name} symbol`} 
                    width={24} 
                    height={24} 
                    className="mr-2" 
                    data-ai-hint="pokemon set symbol"
                  />
                  <CardTitle className="font-headline text-lg leading-tight">{set.name}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Released: {new Date(set.releaseDate).toLocaleDateString()}
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-1">Total Cards: {set.totalCards}</p>
              </CardContent>
              <CardFooter className="p-4 bg-muted/50 border-t">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/cards?set=${set.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Cards in Set
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
