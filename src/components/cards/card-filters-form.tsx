
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react"; // Using XIcon for clear

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

  // Effect to synchronize local state with URL search parameters when they change externally
  useEffect(() => {
    setSearchTerm(currentSearchParams.get('search') || "");
    setSelectedSet(currentSearchParams.get('set') || "All Sets");
    setSelectedType(currentSearchParams.get('type') || "All Types");
    setSelectedRarity(currentSearchParams.get('rarity') || "All Rarities");
  }, [currentSearchParams]);

  // Effect to update URL search parameters when local filter state changes (debounced)
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedSet && selectedSet !== "All Sets") params.set('set', selectedSet);
    if (selectedType && selectedType !== "All Types") params.set('type', selectedType);
    if (selectedRarity && selectedRarity !== "All Rarities") params.set('rarity', selectedRarity);
    const newQueryString = params.toString();

    // Get current query string from URL for comparison to avoid unnecessary pushes
    const currentQueryStringFromHook = currentSearchParams.toString();

    // Only push if the new query string is different from the current one
    if (newQueryString !== currentQueryStringFromHook) {
      const handler = setTimeout(() => {
        router.push(`/cards?${newQueryString}`);
      }, 700); // Debounce time

      return () => clearTimeout(handler);
    }
  }, [searchTerm, selectedSet, selectedType, selectedRarity, router, currentSearchParams]);


  const handleClear = () => {
    // Reset state and navigate to clear filters
    setSearchTerm("");
    setSelectedSet("All Sets");
    setSelectedType("All Types");
    setSelectedRarity("All Rarities");
    router.push('/cards'); // This will trigger the useEffect above, which will see no diff and not push again
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
