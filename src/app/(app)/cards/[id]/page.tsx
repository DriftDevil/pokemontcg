
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Flame, Droplet, Leaf, EyeIcon, Brain, ShieldHalf, Palette, Star, Dna, HelpCircle, ChevronLeft, ChevronRight, Layers, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PokemonCard as PokemonCardSummaryBase } from "../page"; 
import { cn } from "@/lib/utils";
import CollectionActionsClient from "@/components/cards/collection-actions-client";
import { cookies } from "next/headers"; // To fetch user session server-side
import type { AppUser } from "@/app/page"; // Assuming AppUser is defined here


// Self-contained definition for card summary aspects for clarity on this page
interface PokemonCardSummary {
  id: string;
  name: string;
  setName: string;
  rarity: string;
  type: string; 
  imageUrl: string; 
  number: string;
  artist: string;
}

// Detailed type for the card detail page
interface PokemonCardDetail extends PokemonCardSummary {
  supertype?: string;
  subtypes?: string[];
  hp?: string;
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
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  largeImageUrl?: string;
  setPrintedTotal?: number;
  setOfficialTotal?: number;
  // New fields for set info box
  setSeries?: string;
  setReleaseDate?: string;
  setSymbolUrl?: string;
  ptcgoCode?: string;
}

// Interface for cards within a set, used for next/previous navigation
interface CardInSet {
  id: string;
  name: string;
  number: string; 
}

// Interface for the card detail page component, including navigation context
interface CardDetailWithContext extends PokemonCardDetail {
  previousCardId?: string | null;
  nextCardId?: string | null;
  currentSetId?: string | null;
  currentSetName?: string | null;
}

// Interface for the raw API response
interface ApiPokemonCardDetailSource {
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
  set: {
    id: string;
    name: string;
    series?: string;
    printedTotal?: number; 
    total?: number;       
    releaseDate?: string;
    updatedAt?: string;
    images?: { symbol: string; logo: string };
    legalities?: { [key: string]: string };
    ptcgoCode?: string;
  };
  number?: string; // This is the collector number string
  numberInt?: number; // Some APIs might provide this
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: { [key: string]: string };
  images?: { small?: string; large?: string };
  tcgplayer?: any;
  cardmarket?: any;
}

const APP_URL = process.env.APP_URL || "";

// Helper function to map API source to PokemonCardDetail
function mapApiToPokemonCardDetail(apiCard: ApiPokemonCardDetailSource): PokemonCardDetail {
  const summaryImageUrl = apiCard.images?.small || apiCard.images?.large || "https://placehold.co/245x342.png";
  const detailLargeImageUrl = apiCard.images?.large || apiCard.images?.small || "https://placehold.co/400x557.png";
  return {
    id: apiCard.id,
    name: apiCard.name,
    setName: apiCard.set?.name || "Unknown Set",
    rarity: apiCard.rarity || "Unknown",
    type: apiCard.types?.[0] || "Colorless",
    imageUrl: summaryImageUrl,
    number: apiCard.number || "??", // Use the string version for display
    artist: apiCard.artist || "N/A",
    largeImageUrl: detailLargeImageUrl,
    supertype: apiCard.supertype,
    subtypes: apiCard.subtypes,
    hp: apiCard.hp,
    evolvesFrom: apiCard.evolvesFrom,
    abilities: apiCard.abilities,
    attacks: apiCard.attacks,
    weaknesses: apiCard.weaknesses,
    resistances: apiCard.resistances,
    retreatCost: apiCard.retreatCost,
    flavorText: apiCard.flavorText,
    nationalPokedexNumbers: apiCard.nationalPokedexNumbers,
    setPrintedTotal: apiCard.set?.printedTotal,
    setOfficialTotal: apiCard.set?.total, // PokemonTCG.io uses 'total' for official count
    setSeries: apiCard.set?.series,
    setReleaseDate: apiCard.set?.releaseDate,
    setSymbolUrl: apiCard.set?.images?.symbol,
    ptcgoCode: apiCard.set?.ptcgoCode,
  };
}

// Natural sort comparison function for strings containing numbers
function naturalSortCompare(aStr: string, bStr: string): number {
  const re = /(\D+)|(\d+)/g; // Match non-digits or digits
  const aParts = String(aStr).match(re) || [];
  const bParts = String(bStr).match(re) || [];

  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];

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


async function getCardDetailsWithSetContext(id: string): Promise<CardDetailWithContext | null> {
  if (!APP_URL) {
    console.error("APP_URL is not defined. Cannot fetch card details.");
    return null;
  }

  let apiCardSource: ApiPokemonCardDetailSource | null = null;
  try {
    const response = await fetch(`${APP_URL}/api/cards/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      console.error("Failed to fetch card details from internal API:", response.status, await response.text());
      return null;
    }
    const data = await response.json();
    apiCardSource = data.data;
  } catch (error) {
    console.error("Error fetching card details from internal API:", error);
    return null;
  }

  if (!apiCardSource) return null;

  const cardDetail = mapApiToPokemonCardDetail(apiCardSource);

  if (!apiCardSource.set || !apiCardSource.set.id) {
    console.warn(`Card ${id} has no set information. Cannot provide next/previous navigation or full set totals.`);
    return cardDetail; 
  }

  const setId = apiCardSource.set.id;

  let cardsInSet: CardInSet[] = [];
  const primaryExternalApiBaseUrl = process.env.EXTERNAL_API_BASE_URL;
  const backupExternalApiBaseUrl = 'https://api.pokemontcg.io/v2';
  
  let finalSetCardsUrl;
  const fieldsToFetch = 'id,name,number'; 
  const itemsToRequestForSet = 250; 

  if (primaryExternalApiBaseUrl) {
    const basePath = `${primaryExternalApiBaseUrl}/v2/sets/${setId}/cards`;
    const orderByParamValue = 'number_int'; 
    const fieldsParamName = 'fields'; 
    // Use 'limit' for primary API as indicated by user's API structure
    finalSetCardsUrl = `${basePath}?${fieldsParamName}=${fieldsToFetch}&limit=${itemsToRequestForSet}&orderBy=${orderByParamValue}`;
    console.log(`[CardDetailPage - getCardDetailsWithSetContext] Primary API URL for set cards: ${finalSetCardsUrl}`);
  } else {
    const basePath = `${backupExternalApiBaseUrl}/cards`;
    const orderByParamValue = 'number'; 
    const fieldsParamName = 'select'; 
    // pokemontcg.io uses 'pageSize'
    finalSetCardsUrl = `${basePath}?q=set.id:${setId}&${fieldsParamName}=${fieldsToFetch}&pageSize=${itemsToRequestForSet}&orderBy=${orderByParamValue}`;
    console.log(`[CardDetailPage - getCardDetailsWithSetContext] Backup API URL for set cards: ${finalSetCardsUrl}`);
  }
  
  console.log(`[CardDetailPage - getCardDetailsWithSetContext] Fetching cards in set URL: ${finalSetCardsUrl}`);

  try {
    const res = await fetch(finalSetCardsUrl);
    if (res.ok) {
      const setData = await res.json();

      // Log if primary API pagination is occurring
      if (primaryExternalApiBaseUrl && finalSetCardsUrl.startsWith(primaryExternalApiBaseUrl) && setData.totalPages && setData.page && setData.totalPages > setData.page) {
        console.warn(`[CardDetailPage - getCardDetailsWithSetContext] WARNING: The primary API for set '${setId}' returned paginated data (page ${setData.page} of ${setData.totalPages}, total items ${setData.total}). Current fetch strategy gets only the first page (limit=${itemsToRequestForSet}). 'Next'/'Previous' navigation might be incomplete if total items for the set exceed ${itemsToRequestForSet}. Consider implementing full pagination for this API call if issues persist.`);
      }
      
      cardsInSet = Array.isArray(setData.data) ? setData.data.map((c: any) => ({ 
        id: c.id, 
        name: c.name, 
        number: String(c.number || "") // Ensure number is a string for sorting
      })) : [];

      if (cardsInSet.length > 0) {
        // Client-side sort as a fallback/guarantee
        cardsInSet.sort((a, b) => naturalSortCompare(a.number, b.number));
      }

    } else {
      console.warn(`Failed to fetch cards for set ${setId} from ${finalSetCardsUrl}: ${res.status}`);
    }
  } catch (e) {
    console.warn(`Error fetching or sorting cards for set ${setId} from ${finalSetCardsUrl}:`, e);
  }
  
  let previousCardId: string | null = null;
  let nextCardId: string | null = null;

  if (cardsInSet.length > 0) {
    const currentIndex = cardsInSet.findIndex(cardInSetItem => cardInSetItem.id === id);
    if (currentIndex !== -1) {
      if (currentIndex > 0) {
        previousCardId = cardsInSet[currentIndex - 1].id;
      }
      if (currentIndex < cardsInSet.length - 1) {
        nextCardId = cardsInSet[currentIndex + 1].id;
      }
    } else {
        console.warn(`Card ${id} not found in its own set ${setId} list after API sort and client sort. This could be due to data inconsistency or if the fetch did not retrieve all cards in the set.`);
    }
  }

  return {
    ...cardDetail,
    previousCardId,
    nextCardId,
    currentSetId: setId,
    currentSetName: cardDetail.setName,
  };
}

// Helper to fetch user session on the server
async function getUserSession(): Promise<AppUser | null> {
  const cookieStore = cookies();
  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 9002}`;
  
  try {
    const response = await fetch(`${appUrl}/api/auth/user`, {
      headers: {
        'Cookie': cookieStore.toString(), // Forward cookies
      },
      cache: 'no-store',
    });
    if (response.ok) {
      const user = await response.json();
      return user && user.id ? user : null;
    }
  } catch (error) {
    console.error("[CardDetailPage - getUserSession] Error fetching user session:", error);
  }
  return null;
}


const typeIcons: { [key: string]: React.ElementType } = {
  Fire: Flame,
  Lightning: Zap,
  Water: Droplet,
  Grass: Leaf,
  Psychic: Brain,
  Fighting: EyeIcon,
  Darkness: ShieldHalf,
  Metal: ShieldHalf,
  Fairy: Star,
  Dragon: Dna,
  Colorless: Palette,
  Unknown: HelpCircle,
};

export default async function CardDetailPage({ params }: { params: { id:string } }) {
  const cardWithContext = await getCardDetailsWithSetContext(params.id);
  const user = await getUserSession();

  if (!cardWithContext) {
    return (
      <div className="text-center py-12">
        <PageHeader title="Card Not Found" description="The requested Pokémon card could not be found or an error occurred." />
        <Button asChild variant="outline">
          <Link href="/cards">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cards
          </Link>
        </Button>
      </div>
    );
  }
  const card = cardWithContext; 
  const TypeIcon = typeIcons[card.type] || typeIcons.Unknown;
  const displayImageUrl = card.largeImageUrl || "https://placehold.co/400x557.png";
  
  const pageHeaderActions = (
    <>
      {card.currentSetId && card.currentSetName && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/cards?set=${encodeURIComponent(card.currentSetId)}&source=card_detail_header_back_to_set`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to {card.currentSetName}
          </Link>
        </Button>
      )}
       <Button asChild variant="outline" size="sm">
          <Link href="/cards">
             Back to All Cards
          </Link>
        </Button>
    </>
  );


  return (
    <>
      <PageHeader
        title={card.name}
        description={`(#${card.number} - ID: ${card.id})`}
        icon={TypeIcon}
        actions={pageHeaderActions}
      />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 border rounded-lg bg-card shadow-sm">
        <div className="flex-1 flex justify-start">
          {card.currentSetId ? (
            card.previousCardId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/cards/${card.previousCardId}`}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
            )
          ) : null}
        </div>
        
        <div className="flex-shrink-0 text-center">
          {card.number && card.setPrintedTotal && card.setPrintedTotal > 0 && (
            <p className="text-sm text-muted-foreground">
              Collector No.: <strong>{card.number} / {card.setPrintedTotal}</strong>
              {card.setOfficialTotal && card.setOfficialTotal > 0 && card.setOfficialTotal >= card.setPrintedTotal && (
                <span> (Full Set: {card.setOfficialTotal} cards)</span>
              )}
            </p>
          )}
        </div>

        <div className="flex-1 flex justify-end">
           {card.currentSetId ? (
            card.nextCardId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/cards/${card.nextCardId}`}>
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )
          ) : null}
        </div>
      </div>


      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="overflow-hidden shadow-xl">
            <Image
              src={displayImageUrl}
              alt={card.name}
              width={400}
              height={557}
              className="w-full h-auto object-contain"
              priority
              quality={100}
              data-ai-hint={displayImageUrl.includes('placehold.co') ? "pokemon card" : undefined}

            />
          </Card>
           {card.currentSetId && (
            <CollectionActionsClient cardId={card.id} setId={card.currentSetId} user={user} />
           )}
        </div>
        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{card.name}</CardTitle>
              <CardDescription>
                From Set:{" "}
                {card.currentSetId ? (
                  <Link href={`/cards?set=${encodeURIComponent(card.currentSetId)}`} className="underline hover:text-primary">
                    {card.setName}
                  </Link>
                ) : (
                  card.setName
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground">Rarity</p>
                  <Badge variant="secondary">{card.rarity}</Badge>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Type</p>
                   <Badge variant="outline">
                    <TypeIcon className="mr-1 h-3.5 w-3.5" /> {card.type}
                   </Badge>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Artist</p>
                  <p className="text-foreground">{card.artist}</p>
                </div>
                {card.hp && (
                  <div>
                    <p className="font-semibold text-muted-foreground">HP</p>
                    <p className="text-foreground">{card.hp}</p>
                  </div>
                )}
                 {card.supertype && (
                  <div>
                    <p className="font-semibold text-muted-foreground">Supertype</p>
                    <p className="text-foreground">{card.supertype}</p>
                  </div>
                )}
                {card.evolvesFrom && (
                  <div>
                    <p className="font-semibold text-muted-foreground">Evolves From</p>
                    <p className="text-foreground">{card.evolvesFrom}</p>
                  </div>
                )}
              </div>

              {card.flavorText && (
                <div>
                  <h3 className="font-headline text-lg mb-1 mt-3 text-foreground">Flavor Text</h3>
                  <p className="text-muted-foreground text-sm italic">
                    {card.flavorText}
                  </p>
                </div>
              )}

              {card.abilities && card.abilities.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-headline text-md mb-2 text-foreground">Abilities</h4>
                  <ul className="space-y-3 text-sm">
                    {card.abilities.map(ability => (
                      <li key={ability.name}>
                        <strong className="text-foreground">{ability.name} ({ability.type})</strong>
                        <p className="text-muted-foreground text-xs">{ability.text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {card.attacks && card.attacks.length > 0 && (
                 <div className="border-t pt-4 mt-4">
                  <h4 className="font-headline text-md mb-2 text-foreground">Attacks</h4>
                  <ul className="space-y-3 text-sm">
                    {card.attacks.map(attack => (
                      <li key={attack.name}>
                        <div className="flex justify-between items-baseline">
                           <strong className="text-foreground">{attack.name}</strong>
                           {attack.damage && <span className="font-semibold text-primary">{attack.damage}</span>}
                        </div>
                        {attack.cost && attack.cost.length > 0 && <p className="text-xs text-muted-foreground">Cost: {attack.cost.join(', ')}</p>}
                        <p className="text-muted-foreground text-xs">{attack.text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4 mt-4 text-sm">
                {card.weaknesses && card.weaknesses.length > 0 && (
                  <div>
                    <p className="font-semibold text-muted-foreground">Weaknesses</p>
                    {card.weaknesses.map(w => <Badge key={w.type} variant="destructive" className="mr-1">{w.type} {w.value}</Badge>)}
                  </div>
                )}
                {card.resistances && card.resistances.length > 0 && (
                   <div>
                    <p className="font-semibold text-muted-foreground">Resistances</p>
                    {card.resistances.map(r => <Badge key={r.type} variant="secondary" className="mr-1">{r.type} {r.value}</Badge>)}
                  </div>
                )}
                 {card.retreatCost && card.retreatCost.length > 0 && (
                   <div>
                    <p className="font-semibold text-muted-foreground">Retreat Cost</p>
                    <p className="text-foreground">{card.retreatCost.join(', ')}</p>
                  </div>
                )}
              </div>

              {(card.setSymbolUrl || card.setName || card.setSeries || card.setReleaseDate || card.ptcgoCode || card.setPrintedTotal || card.setOfficialTotal) && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-headline text-xl mb-4 text-foreground flex items-center">
                    <Info className="mr-2 h-5 w-5 text-accent" /> Set Information
                  </h3>
                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    {card.setSymbolUrl && (
                      <div className="flex-shrink-0">
                        <Image
                          src={card.setSymbolUrl}
                          alt={`${card.setName} Symbol`}
                          width={64}
                          height={64}
                          className="object-contain rounded bg-card p-1 shadow"
                          data-ai-hint="set symbol"
                        />
                      </div>
                    )}
                    <div className="flex-grow space-y-1">
                      <p className="text-lg font-semibold text-foreground leading-tight">{card.setName}</p>
                      {card.setSeries && <p className="text-sm text-muted-foreground">Series: {card.setSeries}</p>}
                      {card.setReleaseDate && <p className="text-sm text-muted-foreground">Release Date: {new Date(card.setReleaseDate).toLocaleDateString()}</p>}
                      {card.ptcgoCode && (
                        <p className="text-sm text-muted-foreground">
                          Set Code: <Badge variant="outline" className="text-xs font-mono">{card.ptcgoCode.toUpperCase()}</Badge>
                        </p>
                      )}
                      {card.setPrintedTotal && card.setOfficialTotal && card.setOfficialTotal >= card.setPrintedTotal ? (
                        <p className="text-sm text-muted-foreground">
                          Total: {card.setPrintedTotal} (+{card.setOfficialTotal - card.setPrintedTotal} Secret)
                        </p>
                      ) : card.setOfficialTotal ? (
                         <p className="text-sm text-muted-foreground">Total Cards: {card.setOfficialTotal}</p>
                      ) : card.setPrintedTotal ? (
                         <p className="text-sm text-muted-foreground">Total Cards: {card.setPrintedTotal}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">
                    Pokémon and Pokémon character names are trademarks of Nintendo. Card data proxied from configured API sources.
                </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
