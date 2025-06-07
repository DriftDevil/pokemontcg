
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Flame, Droplet, Leaf, EyeIcon, Brain, ShieldHalf, Palette, Star, Dna, HelpCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PokemonCard as PokemonCardSummary } from "../page"; // Use existing summary type

const API_BASE_URL = 'https://api.pokemontcg.io/v2';

// More detailed type for the card detail page, extending summary or defining new one based on API
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
  // using large image for detail view
  largeImageUrl?: string; 
}

interface ApiPokemonCardDetail {
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
  tcgplayer?: any; // Can be expanded if needed
  cardmarket?: any; // Can be expanded if needed
}


async function getCardDetails(id: string): Promise<PokemonCardDetail | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/cards/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      console.error("Failed to fetch card details:", response.status, await response.text());
      return null;
    }
    const data = await response.json();
    const apiCard: ApiPokemonCardDetail = data.data;

    if (!apiCard) return null;

    return {
      id: apiCard.id,
      name: apiCard.name,
      setName: apiCard.set.name,
      rarity: apiCard.rarity || "Unknown",
      type: apiCard.types?.[0] || "Colorless",
      imageUrl: apiCard.images.large, // Use large image for detail view
      largeImageUrl: apiCard.images.large,
      number: apiCard.number,
      artist: apiCard.artist || "N/A",
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
  } catch (error) {
    console.error("Error fetching card details:", error);
    return null;
  }
}

const typeIcons: { [key: string]: React.ElementType } = {
  Fire: Flame,
  Lightning: Zap,
  Water: Droplet,
  Grass: Leaf,
  Psychic: Brain,
  Fighting: EyeIcon, 
  Darkness: ShieldHalf, 
  Metal: ShieldHalf, // Using ShieldHalf for Metal too
  Fairy: Star,
  Dragon: Dna,
  Colorless: Palette,
  Unknown: HelpCircle, // Icon for unknown type
};

export default async function CardDetailPage({ params }: { params: { id: string } }) {
  const card = await getCardDetails(params.id);

  if (!card) {
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

  const TypeIcon = typeIcons[card.type] || typeIcons.Unknown;

  return (
    <>
      <PageHeader
        title={card.name}
        description={`Details for ${card.name} from the ${card.setName} set.`}
        icon={TypeIcon}
        actions={
          <Button asChild variant="outline">
            <Link href="/cards">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Cards
            </Link>
          </Button>
        }
      />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="overflow-hidden shadow-xl">
            {card.largeImageUrl ? (
              <Image
                src={card.largeImageUrl}
                alt={card.name}
                width={400}
                height={557}
                className="w-full h-auto object-contain"
                priority // Prioritize loading hero image
              />
            ) : <div className="w-full aspect-[400/557] bg-muted flex items-center justify-center text-muted-foreground">No Image Available</div>}
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{card.name}</CardTitle>
              <CardDescription>Card Number: {card.number} &bull; Set: {card.setName}</CardDescription>
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
                    Pokémon and Pokémon character names are trademarks of Nintendo. Card data provided by pokemontcg.io.
                </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}

