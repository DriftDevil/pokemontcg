
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Search, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const API_BASE_URL = 'https://api.pokemontcg.io/v2';

interface ApiSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities: {
    unlimited?: string;
    standard?: string;
    expanded?: string;
  };
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt: string;
  images: {
    symbol: string;
    logo: string;
  };
}

export interface CardSet {
  id: string;
  name: string;
  releaseDate: string;
  totalCards: number;
  symbolUrl: string;
  logoUrl: string;
}

async function getCardSets(searchTerm?: string): Promise<CardSet[]> {
  const queryParams = new URLSearchParams();
  if (searchTerm) {
    queryParams.set('q', `name:${searchTerm}*`);
  }
  // The API sorts by releaseDate descending by default, which is good.
  // It also defaults to pageSize 250, which should fetch all or most sets.
  
  try {
    const response = await fetch(`${API_BASE_URL}/sets?${queryParams.toString()}`);
    if (!response.ok) {
      console.error("Failed to fetch sets:", response.status, await response.text());
      return [];
    }
    const data = await response.json();
    return (data.data || []).map((apiSet: ApiSet) => ({
      id: apiSet.id,
      name: apiSet.name,
      releaseDate: apiSet.releaseDate,
      totalCards: apiSet.printedTotal,
      symbolUrl: apiSet.images.symbol,
      logoUrl: apiSet.images.logo,
    }));
  } catch (error) {
    console.error("Error fetching card sets:", error);
    return [];
  }
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
                      className="object-contain"
                      priority={index < 4} // Add priority to the first few images
                    />
                  ) : <div className="text-sm text-muted-foreground">No Logo</div> }
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <div className="flex items-center mb-2">
                  {set.symbolUrl && (
                    <div className="relative w-6 h-6 mr-2 shrink-0">
                      <Image 
                        src={set.symbolUrl} 
                        alt={`${set.name} symbol`} 
                        fill
                        className="object-contain" 
                      />
                    </div>
                  )}
                  <CardTitle className="font-headline text-lg leading-tight">{set.name}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Released: {new Date(set.releaseDate).toLocaleDateString()}
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-1">Total Cards: {set.totalCards}</p>
              </CardContent>
              <CardFooter className="p-4 bg-muted/50 border-t">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/cards?set=${encodeURIComponent(set.id)}`}>
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
