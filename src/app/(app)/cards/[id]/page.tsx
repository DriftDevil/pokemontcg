import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Fire, Droplet, Leaf, EyeIcon, Brain, ShieldHalf, Palette, Star, Dna } from "lucide-react"; // Added more icons
import Image from "next/image";
import Link from "next/link";
import { PokemonCard } from "../page"; // Assuming type is exported from parent

// Mock function to get card details
async function getCardDetails(id: string): Promise<PokemonCard | null> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const mockCardsDb: PokemonCard[] = [ // Extended mock data for detail view
    { id: "base1-4", name: "Charizard", setName: "Base Set", rarity: "Holo Rare", type: "Fire", imageUrl: "https://placehold.co/300x418.png?text=Charizard", number: "4/102", artist: "Mitsuhiro Arita" },
    { id: "base1-58", name: "Pikachu", setName: "Base Set", rarity: "Common", type: "Lightning", imageUrl: "https://placehold.co/300x418.png?text=Pikachu", number: "58/102", artist: "Mitsuhiro Arita" },
    { id: "neo1-1", name: "Ampharos", setName: "Neo Genesis", rarity: "Holo Rare", type: "Lightning", imageUrl: "https://placehold.co/300x418.png?text=Ampharos", number: "1/111", artist: "Kimiya Masago" },
    { id: "swsh1-50", name: "Zacian V", setName: "Sword & Shield", rarity: "Ultra Rare", type: "Metal", imageUrl: "https://placehold.co/300x418.png?text=ZacianV", number: "138/202", artist: "5ban Graphics" },
    { id: "sv1-198", name: "Miraidon ex", setName: "Scarlet & Violet", rarity: "Double Rare", type: "Lightning", imageUrl: "https://placehold.co/300x418.png?text=MiraidonEx", number: "079/198", artist: "5ban Graphics" },
    { id: "gym1-1", name: "Blaine's Arcanine", setName: "Gym Heroes", rarity: "Holo Rare", type: "Fire", imageUrl: "https://placehold.co/300x418.png?text=Arcanine", number: "1/132", artist: "Ken Sugimori" },
  ];
  return mockCardsDb.find(card => card.id === id) || null;
}

const typeIcons: { [key: string]: React.ElementType } = {
  Fire: Fire,
  Lightning: Zap,
  Water: Droplet,
  Grass: Leaf,
  Psychic: Brain,
  Fighting: EyeIcon, // Representing focus/fighting spirit
  Darkness: ShieldHalf, // Representing resilience or dark type
  Metal: ShieldHalf,
  Fairy: Star,
  Dragon: Dna, // Representing draconic/mythical
  Colorless: Palette, // Representing general/versatile
};

export default async function CardDetailPage({ params }: { params: { id: string } }) {
  const card = await getCardDetails(params.id);

  if (!card) {
    return (
      <div className="text-center py-12">
        <PageHeader title="Card Not Found" description="The requested Pokémon card could not be found." />
        <Button asChild variant="outline">
          <Link href="/cards">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cards
          </Link>
        </Button>
      </div>
    );
  }

  const TypeIcon = typeIcons[card.type] || Palette;


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
            <Image
              src={card.imageUrl}
              alt={card.name}
              width={400}
              height={557}
              className="w-full h-auto object-contain"
              data-ai-hint="pokemon card image"
            />
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{card.name}</CardTitle>
              <CardDescription>Card Number: {card.number}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground">Set</p>
                  <p className="text-foreground">{card.setName}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Rarity</p>
                  <Badge variant="secondary">{card.rarity}</Badge>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Type</p>
                   <Badge style={{backgroundColor: `hsl(var(--${card.type.toLowerCase()}-type-bg, var(--muted)))`, color: `hsl(var(--${card.type.toLowerCase()}-type-fg, var(--muted-foreground)))`}} className="border">
                    <TypeIcon className="mr-1 h-3 w-3" /> {card.type}
                   </Badge>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Artist</p>
                  <p className="text-foreground">{card.artist}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-headline text-lg mb-2 text-foreground">Description</h3>
                <p className="text-muted-foreground text-sm">
                  This is a placeholder description for {card.name}. In a real application, this would contain flavor text,
                  attacks, abilities, HP, weakness, resistance, and retreat cost. For example, Charizard is a Fire-type Pokémon
                  known for its powerful flames and iconic status.
                </p>
              </div>

              {/* Placeholder for attacks/abilities */}
              <div className="border-t pt-4">
                <h4 className="font-headline text-md mb-2 text-foreground">Abilities & Attacks (Placeholder)</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><strong>Ability: Battle Sense</strong> - Once during your turn, you may look at the top 3 cards of your deck and put 1 of them into your hand. Discard the other cards.</li>
                  <li><strong>Flamethrower (120 Fire Energy)</strong> - Discard an Energy from this Pokémon.</li>
                </ul>
              </div>

            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">
                    Pokémon and Pokémon character names are trademarks of Nintendo. Card data is illustrative.
                </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
