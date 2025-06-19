
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MinusCircle, Loader2, ShoppingBag } from 'lucide-react';
import type { AppUser } from '@/app/page';

interface CardListItemCollectionControlsProps {
  cardId: string;
  setId: string; // Assuming setId will always be valid when this component is rendered
  user: AppUser; // Assuming user will always be valid when this component is rendered
}

interface CollectedCardInSet {
  id: string; // Card ID
  quantity: number;
}

interface CollectionSetResponse {
  data?: CollectedCardInSet[];
}

export default function CardListItemCollectionControls({ cardId, setId, user }: CardListItemCollectionControlsProps) {
  const { toast } = useToast();
  const [quantityInCollection, setQuantityInCollection] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitial, setIsFetchingInitial] = useState(true);

  const fetchCollectionQuantity = useCallback(async () => {
    if (!user || !setId || setId === "unknown-set-id") {
      setIsFetchingInitial(false);
      setQuantityInCollection(0);
      return;
    }
    setIsFetchingInitial(true);
    try {
      const response = await fetch(`/api/user/collection/set/${setId}?t=${Date.now()}`, { // Cache-bust
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        console.error(`Failed to fetch collection for set ${setId} for card ${cardId}: ${response.status}`);
        setQuantityInCollection(0);
        return;
      }
      const result: CollectionSetResponse = await response.json();
      const cardInCollection = Array.isArray(result.data) ? result.data.find(c => c.id === cardId) : undefined;
      setQuantityInCollection(cardInCollection?.quantity || 0);
    } catch (error) {
      console.error(`Error fetching collection quantity for card ${cardId} in set ${setId}:`, error);
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
      // This case should ideally be prevented by parent component logic
      toast({ title: "Not Logged In", description: "You must be logged in.", variant: "destructive" });
      return;
    }
     if (!setId || setId === "unknown-set-id") {
      toast({ title: "Missing Set Information", description: "This card is not associated with a specific set for collection tracking.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/collection/cards/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: [cardId] }),
        credentials: 'include',
      });

      if (response.ok) {
        await fetchCollectionQuantity(); 
        toast({
          title: `Card ${action === 'add' ? 'Added' : 'Removed'}`,
          description: `Successfully updated your collection.`,
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
      console.error(`Error ${action}ing card ${cardId}:`, error);
      toast({ title: "Network Error", description: `Could not connect to the server to ${action} card.`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingInitial) {
    return (
      <div className="flex items-center justify-center gap-2 py-1 h-[34px]"> {/* Adjusted height to match button group */}
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1">
       <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 shrink-0" // Smaller buttons for card list
          onClick={() => handleCollectionAction('remove')}
          disabled={isLoading || quantityInCollection === 0}
          aria-label="Remove one from collection"
        >
          <MinusCircle className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium w-7 text-center" aria-live="polite">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : quantityInCollection}
        </span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 shrink-0"
          onClick={() => handleCollectionAction('add')}
          disabled={isLoading}
          aria-label="Add one to collection"
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
      <ShoppingBag className={`h-4 w-4 ${quantityInCollection > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
    </div>
  );
}

