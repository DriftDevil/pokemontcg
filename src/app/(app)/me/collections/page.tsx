
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from "@/components/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShoppingBag, Eye, Layers as LayersIcon, AlertTriangle, ExternalLink, Inbox } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

// Interface aligned with the backend UserCardDetail struct's JSON output
interface BackendSet {
  id: string;
  name: string;
  symbolUrl?: string;
  series?: string;
  releaseDate?: string;
  // Add other fields from your backend Set struct if needed
}
interface RawCollectedCard {
  id: string;           // from UserCardDetail.ID json:"id"
  name: string;         // from UserCardDetail.Name json:"name"
  number: string;       // from UserCardDetail.Number json:"number"
  imageSmall?: string;  // from UserCardDetail.SmallImage json:"imageSmall"
  imageLarge?: string;  // from UserCardDetail.LargeImage json:"imageLarge"
  rarity?: string | null; // from UserCardDetail.Rarity json:"rarity,omitempty" which is *string
  quantity: number;     // from UserCardDetail.Quantity json:"quantity"
  set: BackendSet;      // from UserCardDetail.Set json:"set"
}

interface UserCollectionApiResponse {
  data?: RawCollectedCard[];
  totalUniqueCards?: number;
  totalCards?: number;
  message?: string; // For errors
}

// Structure for frontend display, grouped by set
interface DisplayCollectedCard {
  id: string; // cardId
  name: string;
  imageUrl: string;
  number: string;
  rarity?: string;
  quantity: number;
}

interface DisplayCollectedSet {
  id: string; // setId
  name: string;
  symbolUrl?: string;
  series?: string;
  releaseDate?: string;
  cards: DisplayCollectedCard[];
  totalQuantityInSet: number;
  uniqueCardsInSet: number;
}

export default function MyCollectionsPage() {
  const [collectedSets, setCollectedSets] = useState<DisplayCollectedSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);


  useEffect(() => {
    const fetchCollection = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/user/collection/cards', {
          credentials: 'include',
          cache: 'no-store',
        });
        const result: UserCollectionApiResponse = await response.json();

        if (!response.ok) { 
          const errorMsg = result.message || `Failed to fetch collection (HTTP ${response.status})`;
          console.error(`[CollectionsPage] HTTP Error: ${errorMsg}`, result);
          setError(errorMsg);
          toast({ title: "Error Fetching Collection", description: errorMsg, variant: "destructive" });
          setCollectedSets([]);
          return;
        }

        if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
          console.log("[CollectionsPage] Collection is empty or data field is null/empty. API response:", result);
          setCollectedSets([]); 
          return;
        }
        
        const rawCards = result.data;
        
        const groupedBySet: Record<string, DisplayCollectedSet> = {};
        rawCards.forEach(card => {
          const setId = card.set.id;
          if (!groupedBySet[setId]) {
            groupedBySet[setId] = {
              id: setId,
              name: card.set.name,
              symbolUrl: card.set.symbolUrl,
              series: card.set.series,
              releaseDate: card.set.releaseDate,
              cards: [],
              totalQuantityInSet: 0,
              uniqueCardsInSet: 0,
            };
          }
          
          const placeholderText = (typeof card.name === 'string' && card.name.length > 0)
            ? card.name.substring(0,3) 
            : 'Card';

          groupedBySet[setId].cards.push({
            id: card.id, // Use card.id from backend
            name: card.name || 'Unknown Card', // Use card.name from backend
            imageUrl: card.imageSmall || card.imageLarge || `https://placehold.co/96x134.png?text=${encodeURIComponent(placeholderText)}`, // Prioritize imageSmall, then imageLarge
            number: card.number, // Use card.number from backend
            rarity: card.rarity || undefined, // Handle nullable rarity
            quantity: card.quantity,
          });
          groupedBySet[setId].totalQuantityInSet += card.quantity;
          groupedBySet[setId].uniqueCardsInSet += 1; 
        });

        const displaySetsArray = Object.values(groupedBySet).sort((a, b) => {
            if (a.releaseDate && b.releaseDate) {
                const dateComparison = new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
                if (dateComparison !== 0) return dateComparison;
            } else if (a.releaseDate) {
                return -1; 
            } else if (b.releaseDate) {
                return 1; 
            }
            return a.name.localeCompare(b.name);
        });
        
        displaySetsArray.forEach(set => {
            set.cards.sort((a,b) => naturalSortCompare(a.number, b.number));
        });

        setCollectedSets(displaySetsArray);
        if (displaySetsArray.length > 0) {
             setActiveAccordionItems(displaySetsArray.slice(0, 3).map(s => s.id));
        }

      } catch (err) { 
        const errorMsg = err instanceof Error ? err.message : "An unknown error occurred while fetching collection.";
        console.error("[CollectionsPage] Catch block error:", err);
        setError(errorMsg);
        toast({ title: "Failed to Load Collection", description: errorMsg, variant: "destructive" });
        setCollectedSets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollection();
  }, [toast]);

  function naturalSortCompare(aStr: string, bStr: string): number {
    const re = /(\D+)|(\d+)/g;
    const aParts = String(aStr).match(re) || [];
    const bParts = String(bStr).match(re) || [];

    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        const aPart = aParts[i];
        const bPart = bParts[i];
        if (/\d/.test(aPart) && /\d/.test(bPart)) {
        const aNum = parseInt(aPart, 10);
        const bNum = parseInt(bPart, 10);
        if (aNum !== bNum) return aNum - bNum;
        } else {
        const aPartLower = aPart.toLowerCase();
        const bPartLower = bPart.toLowerCase();
        if (aPartLower !== bPartLower) return aPartLower.localeCompare(bPartLower);
        }
    }
    return aParts.length - bParts.length;
  }


  if (isLoading) {
    return (
      <>
        <PageHeader title="My Pokémon Card Collections" icon={ShoppingBag} description="Loading your treasured cards..." />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[1,2,3,4,5].map(j => <Skeleton key={j} className="aspect-[5/7] w-full" />)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="My Collections" icon={ShoppingBag} description="Oops! Something went wrong." />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Collection</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </>
    );
  }

  if (collectedSets.length === 0) {
    return (
      <>
        <PageHeader title="My Pokémon Card Collections" icon={ShoppingBag} description="Your collection is currently empty." />
        <div className="text-center py-12">
          <Inbox className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Cards Collected Yet</h3>
          <p className="text-muted-foreground mb-6">
            Start building your collection by browsing cards and adding them!
          </p>
          <Button asChild>
            <Link href="/cards">
              <Eye className="mr-2 h-4 w-4" /> Browse Cards
            </Link>
          </Button>
        </div>
      </>
    );
  }
  
  const totalUniqueCardsAcrossSets = collectedSets.reduce((sum, set) => sum + set.uniqueCardsInSet, 0);
  const totalCardsOverall = collectedSets.reduce((sum, set) => sum + set.totalQuantityInSet, 0);

  return (
    <>
      <PageHeader 
        title="My Pokémon Card Collections" 
        icon={ShoppingBag}
        description={`You have ${totalUniqueCardsAcrossSets} unique card(s) totaling ${totalCardsOverall} card(s) across ${collectedSets.length} set(s).`} 
      />
      <Accordion 
        type="multiple" 
        value={activeAccordionItems}
        onValueChange={setActiveAccordionItems}
        className="w-full space-y-2"
      >
        {collectedSets.map(set => (
          <AccordionItem value={set.id} key={set.id} className="border bg-card shadow-sm rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline rounded-t-lg data-[state=open]:border-b">
              <div className="flex items-center gap-3 w-full">
                {set.symbolUrl && (
                  <Image 
                    src={set.symbolUrl} 
                    alt={`${set.name} symbol`} 
                    width={28} 
                    height={28} 
                    className="object-contain shrink-0"
                    data-ai-hint="set symbol"
                  />
                )}
                <div className="flex-grow text-left">
                  <h3 className="font-headline text-lg text-primary">{set.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {set.uniqueCardsInSet} unique card(s) &bull; {set.totalQuantityInSet} total card(s)
                    {set.releaseDate && ` &bull; Released: ${new Date(set.releaseDate).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {set.cards.map(card => (
                  <Card key={card.id} className="flex flex-col overflow-hidden group">
                    <CardHeader className="p-0 relative aspect-[5/7]">
                      <Image
                        src={card.imageUrl}
                        alt={card.name}
                        width={150}
                        height={210}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        data-ai-hint={card.imageUrl.includes('placehold.co') ? "pokemon card" : "pokemon card art"}
                      />
                    </CardHeader>
                    <CardContent className="p-2 flex-grow">
                      <CardTitle className="text-sm font-semibold leading-tight mb-1 truncate" title={card.name}>
                        {card.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        #{card.number} &bull; Qty: {card.quantity}
                      </CardDescription>
                       {card.rarity && <Badge variant="outline" className="text-xs mt-1 py-0 px-1.5">{card.rarity}</Badge>}
                    </CardContent>
                    <CardFooter className="p-2 border-t">
                       <Button asChild variant="outline" size="sm" className="w-full text-xs">
                        <Link href={`/cards/${card.id}`}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> View Card
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              <div className="mt-4 text-right">
                <Button asChild variant="secondary" size="sm">
                    <Link href={`/cards?set=${encodeURIComponent(set.id)}`}>
                        <LayersIcon className="mr-2 h-4 w-4" /> View All Cards in {set.name}
                        <ExternalLink className="ml-2 h-3 w-3 opacity-70"/>
                    </Link>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
