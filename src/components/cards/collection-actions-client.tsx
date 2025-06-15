
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MinusCircle, Loader2, ShoppingBag } from 'lucide-react';
import type { AppUser } from '@/app/page'; // Assuming AppUser type is defined here or can be imported

interface CollectionActionsClientProps {
  cardId: string;
  setId: string | null; // A card might not always have a set ID (e.g. promos not tied to a main set)
  user: AppUser | null;
}

interface CollectedCard {
  cardId: string;
  quantity: number;
  // cardDetails?: any; // Assuming backend might also send full card details
}

interface CollectionSetResponse {
  data?: CollectedCard[];
  // other potential fields like totalUniqueItems, totalQuantity
}

export default function CollectionActionsClient({ cardId, setId, user }: CollectionActionsClientProps) {
  const { toast } = useToast();
  const [quantityInCollection, setQuantityInCollection] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitial, setIsFetchingInitial] = useState(true);

  const fetchCollectionQuantity = useCallback(async () => {
    if (!user || !setId) {
      setIsFetchingInitial(false);
      return;
    }
    setIsFetchingInitial(true);
    try {
      const response = await fetch(`/api/user/collection/set/${setId}`, {
        credentials: 'include', // ensure cookies are sent
      });
      if (!response.ok) {
        // Don't toast error for initial fetch failure, could be common (e.g., no collection yet)
        console.error(`Failed to fetch collection for set ${setId}: ${response.status}`);
        setQuantityInCollection(0);
        return;
      }
      const result: CollectionSetResponse = await response.json();
      const cardInCollection = result.data?.find(c => c.cardId === cardId);
      setQuantityInCollection(cardInCollection?.quantity || 0);
    } catch (error) {
      console.error("Error fetching collection quantity:", error);
      setQuantityInCollection(0);
    } finally {
      setIsFetchingInitial(false);
    }
  }, [cardId, setId, user]);

  useEffect(() => {
    fetchCollectionQuantity();
  }, [fetchCollectionQuantity]);

  const handleCollectionAction = async (action: 'add' | 'remove') => {
    if (!user) {
      toast({ title: "Not Logged In", description: "You must be logged in to manage your collection.", variant: "destructive" });
      return;
    }
    if (!setId) {
      toast({ title: "Missing Set Information", description: "This card is not associated with a specific set, cannot add to collection.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/collection/cards/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: [cardId] }), // API expects an array
        credentials: 'include',
      });

      if (response.ok) {
        const newQuantity = action === 'add' ? quantityInCollection + 1 : Math.max(0, quantityInCollection - 1);
        setQuantityInCollection(newQuantity);
        toast({
          title: `Card ${action === 'add' ? 'Added' : 'Removed'}`,
          description: `Successfully ${action === 'add' ? 'added 1 copy to' : 'removed 1 copy from'} your collection.`,
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: `Failed to ${action} card.` }));
        toast({
          title: `Error ${action === 'add' ? 'Adding' : 'Removing'} Card`,
          description: errorData.message || `An unknown error occurred.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing card:`, error);
      toast({ title: "Network Error", description: `Could not connect to the server to ${action} card.`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !setId) {
    // Don't render anything if user is not logged in or if the card has no associated set
    // (collections are per-set)
    return null;
  }

  if (isFetchingInitial) {
    return (
      <div className="flex items-center gap-2 mt-4 p-3 border rounded-lg bg-muted/50 justify-center h-[88px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading collection status...</span>
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 border rounded-lg bg-card shadow-sm">
      <h4 className="font-headline text-md mb-3 text-foreground flex items-center">
        <ShoppingBag className="mr-2 h-5 w-5 text-primary" /> My Collection (This Set)
      </h4>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handleCollectionAction('remove')}
            disabled={isLoading || quantityInCollection === 0}
            aria-label="Remove one from collection"
          >
            <MinusCircle className="h-5 w-5" />
          </Button>
          <span className="text-lg font-semibold w-10 text-center" aria-live="polite">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : quantityInCollection}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handleCollectionAction('add')}
            disabled={isLoading}
            aria-label="Add one to collection"
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {quantityInCollection > 0 ? `You have ${quantityInCollection} cop${quantityInCollection === 1 ? 'y' : 'ies'}.` : "Not in collection."}
        </p>
      </div>
    </div>
  );
}
