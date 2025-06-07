
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SetOption { id: string; name: string; } // Define SetOption if not globally available

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
  initialSearch = "",
  initialSet = "All Sets",
  initialType = "All Types",
  initialRarity = "All Rarities",
  setOptions,
  typeOptions,
  rarityOptions,
}: CardFiltersFormProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams(); // Renamed to avoid conflict

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedSet, setSelectedSet] = useState(initialSet);
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedRarity, setSelectedRarity] = useState(initialRarity);

  useEffect(() => {
    setSearchTerm(currentSearchParams.get('search') || initialSearch);
    setSelectedSet(currentSearchParams.get('set') || initialSet);
    setSelectedType(currentSearchParams.get('type') || initialType);
    setSelectedRarity(currentSearchParams.get('rarity') || initialRarity);
  }, [currentSearchParams, initialSearch, initialSet, initialType, initialRarity]);

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
    router.push('/cards');
    // Reset local state as well, though useEffect will also catch it
    setSearchTerm("");
    setSelectedSet("All Sets");
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
