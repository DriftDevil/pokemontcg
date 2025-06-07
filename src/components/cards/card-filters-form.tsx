
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SetOption { id: string; name: string; }

interface CardFiltersFormProps {
  initialSearch?: string;
  initialSet?: string;
  initialType?: string;
  initialRarity?: string;
  setOptions: SetOption[];
  typeOptions: string[];
  rarityOptions: string[];
}

export default function CardFiltersForm({
  initialSearch: initialSearchProp = "",
  initialSet: initialSetProp = "All Sets",
  initialType: initialTypeProp = "All Types",
  initialRarity: initialRarityProp = "All Rarities",
  setOptions,
  typeOptions,
  rarityOptions,
}: CardFiltersFormProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();

  // Initialize state directly from props, which already incorporate searchParams or defaults from parent
  const [searchTerm, setSearchTerm] = useState(initialSearchProp);
  const [selectedSet, setSelectedSet] = useState(initialSetProp);
  const [selectedType, setSelectedType] = useState(initialTypeProp);
  const [selectedRarity, setSelectedRarity] = useState(initialRarityProp);

  // Effect to update state if URL searchParams change externally
  useEffect(() => {
    const searchFromUrl = currentSearchParams.get('search');
    const setFromUrl = currentSearchParams.get('set');
    const typeFromUrl = currentSearchParams.get('type');
    const rarityFromUrl = currentSearchParams.get('rarity');

    if (searchFromUrl !== null && searchFromUrl !== searchTerm) {
      setSearchTerm(searchFromUrl);
    } else if (searchFromUrl === null && searchTerm !== initialSearchProp) {
      setSearchTerm(initialSearchProp);
    }

    if (setFromUrl !== null && setFromUrl !== selectedSet) {
      setSelectedSet(setFromUrl);
    } else if (setFromUrl === null && selectedSet !== initialSetProp) {
      setSelectedSet(initialSetProp);
    }

    if (typeFromUrl !== null && typeFromUrl !== selectedType) {
      setSelectedType(typeFromUrl);
    } else if (typeFromUrl === null && selectedType !== initialTypeProp) {
      setSelectedType(initialTypeProp);
    }

    if (rarityFromUrl !== null && rarityFromUrl !== selectedRarity) {
      setSelectedRarity(rarityFromUrl);
    } else if (rarityFromUrl === null && selectedRarity !== initialRarityProp) {
      setSelectedRarity(initialRarityProp);
    }
  }, [currentSearchParams, initialSearchProp, initialSetProp, initialTypeProp, initialRarityProp, searchTerm, selectedSet, selectedType, selectedRarity]);


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedSet && selectedSet !== "All Sets") params.set('set', selectedSet);
    if (selectedType && selectedType !== "All Types") params.set('type', selectedType);
    if (selectedRarity && selectedRarity !== "All Rarities") params.set('rarity', selectedRarity);
    
    router.push(`/cards?${params.toString()}`);
  };

  const handleClear = () => {
    // Reset local state first
    setSearchTerm(initialSearchProp); // Reset to initial prop default which is ""
    setSelectedSet(initialSetProp); // Reset to initial prop default "All Sets"
    setSelectedType(initialTypeProp); // Reset to initial prop default "All Types"
    setSelectedRarity(initialRarityProp); // Reset to initial prop default "All Rarities"
    // Then navigate to clear URL params
    router.push('/cards');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-card shadow">
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
          <Select name="set" value={selectedSet} onValueChange={setSelectedSet}>
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
        <div className="lg:col-start-4 flex gap-2">
          <Button type="submit" className="w-full md:w-auto">
            <Search className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
          <Button type="button" variant="outline" className="w-full md:w-auto" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>
    </form>
  );
}

    