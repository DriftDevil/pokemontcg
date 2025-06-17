
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from "@/components/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShoppingBag, Eye, Layers as LayersIcon, AlertTriangle, ExternalLink, Inbox, User, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { DisplayUser as TableUser } from '@/app/(app)/admin/users/page'; // For user details


// Interface aligned with the backend UserCardDetail struct's JSON output
interface BackendSet {
  id: string;
  name: string;
  symbolUrl?: string;
  series?: string;
  releaseDate?: string;
}
interface RawCollectedCard {
  id: string;         
  name: string;         
  number: string;       
  imageSmall?: string;  
  imageLarge?: string;  
  rarity?: string | null; 
  quantity: number;     
  set: BackendSet;      
}

interface UserCollectionApiResponse {
  data?: RawCollectedCard[];
  totalUniqueCards?: number;
  totalCards?: number;
  message?: string; 
}

interface UserListApiResponse { // For fetching user details
  data?: TableUser[];
  total?: number;
  message?: string;
}

// Structure for frontend display, grouped by set
interface DisplayCollectedCard {
  id: string; 
  name: string;
  imageUrl: string;
  number: string;
  rarity?: string;
  quantity: number;
}

interface DisplayCollectedSet {
  id: string; 
  name: string;
  symbolUrl?: string;
  series?: string;
  releaseDate?: string;
  cards: DisplayCollectedCard[];
  totalQuantityInSet: number;
  uniqueCardsInSet: number;
}

export default function UserCollectionAdminPage() {
  const params = useParams();
  const router = useRouter();
  const userID = params.userID as string;

  const [viewedUser, setViewedUser] = useState<TableUser | null>(null);
  const [collectedSets, setCollectedSets] = useState<DisplayCollectedSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);

  useEffect(() => {
    if (!userID) return;

    const fetchUserDetailsAndCollection = async () => {
      setIsLoading(true);
      setError(null);
      let fetchedUserName = "User";

      try {
        // 1. Fetch user details to get name/email
        const userDetailsResponse = await fetch('/api/users/all', { cache: 'no-store', credentials: 'include' });
        if (!userDetailsResponse.ok) {
          const errText = await userDetailsResponse.text();
          console.error(`[UserCollectionAdminPage] Failed to fetch user details for ${userID}. Status: ${userDetailsResponse.status}. Error: ${errText.substring(0, 100)}`);
          // Continue, but header might be generic
        } else {
          const userListResult: UserListApiResponse = await userDetailsResponse.json();
          const targetUser = userListResult.data?.find(u => u.id === userID);
          if (targetUser) {
            setViewedUser(targetUser);
            fetchedUserName = targetUser.name || targetUser.email || "User";
          } else {
             console.warn(`[UserCollectionAdminPage] User with ID ${userID} not found in /api/users/all list.`);
          }
        }

        // 2. Fetch user's collection
        const collectionResponse = await fetch(`/api/admin/users/${userID}/collection/cards`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const collectionResult: UserCollectionApiResponse = await collectionResponse.json();

        if (!collectionResponse.ok) {
          const errorMsg = collectionResult.message || `Failed to fetch collection for user ${userID} (HTTP ${collectionResponse.status})`;
          console.error(`[UserCollectionAdminPage] HTTP Error fetching collection: ${errorMsg}`, collectionResult);
          setError(errorMsg);
          toast({ title: `Error Fetching ${fetchedUserName}'s Collection`, description: errorMsg, variant: "destructive" });
          setCollectedSets([]);
          return;
        }

        if (!collectionResult.data || !Array.isArray(collectionResult.data) || collectionResult.data.length === 0) {
          console.log(`[UserCollectionAdminPage] ${fetchedUserName}'s collection is empty or data field is null/empty. API response:`, collectionResult);
          setCollectedSets([]);
          return;
        }
        
        const rawCards = collectionResult.data;
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
            id: card.id,
            name: card.name || 'Unknown Card',
            imageUrl: card.imageSmall || card.imageLarge || `https://placehold.co/96x134.png?text=${encodeURIComponent(placeholderText)}`,
            number: card.number,
            rarity: card.rarity || undefined,
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
        const errorMsg = err instanceof Error ? err.message : `An unknown error occurred while fetching data for user ${userID}.`;
        console.error("[UserCollectionAdminPage] Catch block error:", err);
        setError(errorMsg);
        toast({ title: "Failed to Load User Collection", description: errorMsg, variant: "destructive" });
        setCollectedSets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetailsAndCollection();
  }, [userID, toast]);

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

  const headerTitle = viewedUser ? `${viewedUser.name}'s Collection` : "User's Collection";
  const headerDescription = viewedUser ? `Viewing cards collected by ${viewedUser.email || userID}` : `Viewing collection for user ID: ${userID}`;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading Collection..." icon={ShoppingBag} description="Fetching user and card data..." />
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
        <PageHeader title={headerTitle} icon={User} description="Oops! Something went wrong." 
          actions={<Button variant="outline" onClick={() => router.push('/admin/users')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Users</Button>}
        />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Collection</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </>
    );
  }
  
  const totalUniqueCardsAcrossSets = collectedSets.reduce((sum, set) => sum + set.uniqueCardsInSet, 0);
  const totalCardsOverall = collectedSets.reduce((sum, set) => sum + set.totalQuantityInSet, 0);
  const pageSubDescription = `${totalUniqueCardsAcrossSets} unique card(s) totaling ${totalCardsOverall} card(s) across ${collectedSets.length} set(s).`;

  if (collectedSets.length === 0) {
    return (
      <>
        <PageHeader title={headerTitle} icon={User} description={headerDescription} 
          actions={<Button variant="outline" onClick={() => router.push('/admin/users')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Users</Button>}
        />
        <div className="text-center py-12">
          <Inbox className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Cards Collected by This User</h3>
          <p className="text-muted-foreground mb-6">
            This user hasn't added any cards to their collection yet.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title={headerTitle} 
        icon={User}
        description={`${headerDescription} ${pageSubDescription}`}
        actions={<Button variant="outline" onClick={() => router.push('/admin/users')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Users</Button>}
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

