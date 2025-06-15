
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

  const [searchTerm, setSearchTerm] = useState(initialSearchProp);
  const [selectedSet, setSelectedSet] = useState(initialSetProp);
  const [selectedType, setSelectedType] = useState(initialTypeProp);
  const [selectedRarity, setSelectedRarity] = useState(initialRarityProp);

  useEffect(() => {
    const searchFromUrl = currentSearchParams.get('search');
    const setFromUrl = currentSearchParams.get('set');
    const typeFromUrl = currentSearchParams.get('type');
    const rarityFromUrl = currentSearchParams.get('rarity');

    const targetSearch = searchFromUrl !== null ? searchFromUrl : initialSearchProp;
    if (targetSearch !== searchTerm) {
      setSearchTerm(targetSearch);
    }

    const targetSet = setFromUrl !== null ? setFromUrl : initialSetProp;
    if (targetSet !== selectedSet) {
      setSelectedSet(targetSet);
    }

    // If type/rarity are explicitly in URL, use them. Otherwise, use initial prop (which defaults to "All...").
    // This ensures that if a user navigates with a URL having type/rarity, it's respected.
    // If they select a new set via UI, the onValueChange for Set will reset these.
    const targetType = typeFromUrl !== null ? typeFromUrl : initialTypeProp;
    if (targetType !== selectedType) {
      setSelectedType(targetType);
    }

    const targetRarity = rarityFromUrl !== null ? rarityFromUrl : initialRarityProp;
    if (targetRarity !== selectedRarity) {
      setSelectedRarity(targetRarity);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearchParams, initialSearchProp, initialSetProp, initialTypeProp, initialRarityProp]);


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
    setSearchTerm(""); 
    setSelectedSet("All Sets"); 
    setSelectedType("All Types"); 
    setSelectedRarity("All Rarities"); 
    router.push('/cards');
  };

  const handleSetChange = (newSetId: string) => {
    setSelectedSet(newSetId);
    // When a new set is selected, reset type and rarity to "All"
    setSelectedType("All Types");
    setSelectedRarity("All Rarities");
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

