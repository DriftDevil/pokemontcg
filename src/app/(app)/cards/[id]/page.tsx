
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Flame, Droplet, Leaf, EyeIcon, Brain, ShieldHalf, Palette, Star, Dna, HelpCircle, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PokemonCard as PokemonCardSummaryBase } from "../page"; 

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
}

// Interface for cards within a set, used for next/previous navigation
interface CardInSet {
  id: string;
  name: string;
  number: string; // The collector number as a string
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
    number: apiCard.number || "??",
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
  };
}

// Natural sort comparison function for alphanumeric strings (card numbers)
function naturalSortCompare(aStr: string, bStr: string): number {
  const re = /(\D*)(\d*)/g; // Regex to split into non-digit and digit parts

  const rượu_vang_a = []; // Parts for string a
  let matchA;
  re.lastIndex = 0; 
  while ((matchA = re.exec(aStr)) !== null && matchA[0] !== '') {
    if (matchA[1]) rượu_vang_a.push(matchA[1]); // Non-digit part
    if (matchA[2]) rượu_vang_a.push(parseInt(matchA[2], 10)); // Digit part as number
  }
  if (re.lastIndex < aStr.length) rượu_vang_a.push(aStr.substring(re.lastIndex)); // Remainder

  const partsB = []; // Parts for string b
  let matchB;
  re.lastIndex = 0;
  while ((matchB = re.exec(bStr)) !== null && matchB[0] !== '') {
    if (matchB[1]) partsB.push(matchB[1]);
    if (matchB[2]) partsB.push(parseInt(matchB[2], 10));
  }
  if (re.lastIndex < bStr.length) partsB.push(bStr.substring(re.lastIndex));

  for (let i = 0; i < Math.max(rượu_vang_a.length, partsB.length); i++) {
    const partA = rượu_vang_a[i];
    const partB = partsB[i];

    if (partA === undefined) return -1; // a is shorter
    if (partB === undefined) return 1;  // b is shorter

    if (typeof partA === 'number' && typeof partB === 'number') {
      if (partA < partB) return -1;
      if (partA > partB) return 1;
    } else if (typeof partA === 'string' && typeof partB === 'string') {
      const comparison = partA.localeCompare(partB);
      if (comparison !== 0) return comparison;
    } else { // Mixed types: number comes before string
      return (typeof partA === 'number') ? -1 : 1;
    }
  }
  return 0;
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
    console.warn(`Card ${id} has no set information. Cannot provide next/previous navigation.`);
    return cardDetail; 
  }

  const setId = apiCardSource.set.id;

  let cardsInSet: CardInSet[] = [];
  const primaryExternalApiBaseUrl = process.env.EXTERNAL_API_BASE_URL;
  const backupExternalApiBaseUrl = 'https://api.pokemontcg.io/v2';
  let setQueryBaseUrl = '';

  if (primaryExternalApiBaseUrl) {
    setQueryBaseUrl = `${primaryExternalApiBaseUrl}/v2`;
  } else {
    setQueryBaseUrl = backupExternalApiBaseUrl; 
  }
  
  try {
    // Request orderBy=number, but we will re-sort robustly later
    const setCardsUrl = `${setQueryBaseUrl}/cards?q=set.id:${setId}&select=id,name,number&pageSize=250`;
    const res = await fetch(setCardsUrl);
    if (res.ok) {
      const setData = await res.json();
      cardsInSet = Array.isArray(setData.data) ? setData.data.map((c: any) => ({ 
        id: c.id, 
        name: c.name, 
        number: String(c.number || "") // Ensure number is a string, default to "" if null/undefined
      })) : [];
      
      // Robust natural sorting of cardsInSet by card number
      if (cardsInSet.length > 0) {
        cardsInSet.sort((a, b) => naturalSortCompare(a.number, b.number));
      }
    } else {
      console.warn(`Failed to fetch cards for set ${setId} from ${setQueryBaseUrl}: ${res.status}`);
    }
  } catch (e) {
    console.warn(`Error fetching cards for set ${setId} from ${setQueryBaseUrl}:`, e);
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
        console.warn(`Card ${id} not found in its own set ${setId} list after sorting. This could be due to data inconsistency or pageSize limit if set is very large.`);
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

export default async function CardDetailPage({ params }: { params: { id: string } }) {
  const cardWithContext = await getCardDetailsWithSetContext(params.id);

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
  const card = cardWithContext; // For easier referencing
  const TypeIcon = typeIcons[card.type] || typeIcons.Unknown;
  const displayImageUrl = card.largeImageUrl || "https://placehold.co/400x557.png";
  
  const pageActions = (
    <div className="flex flex-wrap gap-2 items-center">
      {card.currentSetId && ( 
        <>
          <Button asChild variant="outline" size="sm" disabled={!card.previousCardId}>
            <Link href={card.previousCardId ? `/cards/${card.previousCardId}` : "#"}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" disabled={!card.nextCardId}>
            <Link href={card.nextCardId ? `/cards/${card.nextCardId}` : "#"}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </>
      )}
      <Button asChild variant="outline" size="sm">
        <Link href="/cards">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Cards
        </Link>
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader
        title={card.name}
        description={`Details for ${card.name} from the ${card.setName} set.`}
        icon={TypeIcon}
        actions={pageActions}
      />
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
        </div>
        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{card.name}</CardTitle>
              <CardDescription>
                Card Number: {card.number} &bull; Set:{" "}
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

