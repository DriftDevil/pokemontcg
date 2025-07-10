
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react"; // Using XIcon for clear
import logger from '@/lib/logger';

interface SetOption { id: string; name: string; }

interface CardFiltersFormProps {
  setOptions: SetOption[];
  typeOptions: string[];
  rarityOptions: string[];
}

export default function CardFiltersForm({
  setOptions,
  typeOptions,
  rarityOptions,
}: CardFiltersFormProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(currentSearchParams.get('search') || "");
  const [selectedSet, setSelectedSet] = useState(currentSearchParams.get('set') || "All Sets");
  const [selectedType, setSelectedType] = useState(currentSearchParams.get('type') || "All Types");
  const [selectedRarity, setSelectedRarity] = useState(currentSearchParams.get('rarity') || "All Rarities");

  const isInitialMount = useRef(true);

  // Effect to synchronize local state with URL search parameters when they change externally
  useEffect(() => {
    setSearchTerm(currentSearchParams.get('search') || "");
    setSelectedSet(currentSearchParams.get('set') || "All Sets");
    setSelectedType(currentSearchParams.get('type') || "All Types");
    setSelectedRarity(currentSearchParams.get('rarity') || "All Rarities");
  }, [currentSearchParams]);

  // Effect to update URL search parameters when local filter state changes (debounced)
  useEffect(() => {
    // Skip the first execution on mount, to avoid resetting page on load.
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
      
    const handler = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      // Update search term
      if (searchTerm) params.set('search', searchTerm);
      else params.delete('search');

      // Update set
      if (selectedSet && selectedSet !== "All Sets") params.set('set', selectedSet);
      else params.delete('set');

      // Update type
      if (selectedType && selectedType !== "All Types") params.set('type', selectedType);
      else params.delete('type');

      // Update rarity
      if (selectedRarity && selectedRarity !== "All Rarities") params.set('rarity', selectedRarity);
      else params.delete('rarity');
      
      // Reset page to 1 whenever filters change, BUT NOT ON INITIAL LOAD.
      // This is now the key logic. This effect runs when filters change, so resetting page is correct.
      params.set('page', '1');

      const newQueryString = params.toString();
      logger.debug("CardFiltersForm:useEffect", `Pushing new query string: ${newQueryString}`);
      router.push(`/cards?${newQueryString}`);
      
    }, 700); // Debounce time

    return () => clearTimeout(handler);
  // We should NOT include currentSearchParams here, as that would cause a loop.
  // We only want this effect to run when the user *manually* changes a filter in this component.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedSet, selectedType, selectedRarity, router]);


  const handleClear = () => {
    // Reset state and navigate to clear filters
    setSearchTerm("");
    setSelectedSet("All Sets");
    setSelectedType("All Types");
    setSelectedRarity("All Rarities");
    router.push('/cards'); 
  };

  const handleSetChange = (newSetId: string) => {
    setSelectedSet(newSetId);
    // When a new set is selected, reset type and rarity to "All"
    // This state change will be picked up by the debounced useEffect
    setSelectedType("All Types");
    setSelectedRarity("All Rarities");
  };

  return (
    <div className="mb-6 p-4 border rounded-lg bg-card shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label htmlFor="search-filter" className="block text-sm font-medium text-muted-foreground mb-1">Search by Name</label>
          <Input
            type="search"
            id="search-filter"
            name="search"
            placeholder="e.g., Charizard"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="set-filter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Set</label>
          <Select name="set" value={selectedSet} onValueChange={handleSetChange}>
            <SelectTrigger id="set-filter">
              <SelectValue placeholder="Select Set" />
            </SelectTrigger>
            <SelectContent>
              {setOptions.map(setOpt => <SelectItem key={setOpt.id} value={setOpt.id}>{setOpt.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="type-filter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Type</label>
          <Select name="type" value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger id="type-filter">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map(typeName => <SelectItem key={typeName} value={typeName}>{typeName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="rarity-filter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Rarity</label>
          <Select name="rarity" value={selectedRarity} onValueChange={setSelectedRarity}>
            <SelectTrigger id="rarity-filter">
              <SelectValue placeholder="Select Rarity" />
            </SelectTrigger>
            <SelectContent>
              {rarityOptions.map(rarityName => <SelectItem key={rarityName} value={rarityName}>{rarityName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-start-4 flex justify-end">
          <Button type="button" variant="outline" className="w-full md:w-auto" onClick={handleClear}>
            <XIcon className="mr-2 h-4 w-4" /> Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
