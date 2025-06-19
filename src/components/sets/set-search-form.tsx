
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
// import { Search } from "lucide-react"; // Search icon not used in this version
// import { Button } from '../ui/button'; // Button not used

interface SetSearchFormProps {
  initialSearchTerm: string;
}

export default function SetSearchForm({ initialSearchTerm }: SetSearchFormProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  // Effect to update internal searchTerm state if the initialSearchTerm prop changes
  // This typically happens if the URL is manipulated directly or via browser back/forward.
  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  // Effect to debounce navigation when searchTerm state changes
  useEffect(() => {
    const currentQuerySearch = currentSearchParams.get('search') || "";

    // Avoid navigation if the state's search term is the same as what's currently in the URL.
    // This prevents an unnecessary push on initial load or if the prop update matches current state.
    if (searchTerm === currentQuerySearch) {
      return;
    }

    const handler = setTimeout(() => {
      const params = new URLSearchParams(currentSearchParams.toString());
      if (searchTerm) {
        params.set('search', searchTerm);
      } else {
        params.delete('search');
      }
      // Reset page to 1 when search term changes
      params.set('page', '1'); 
      
      router.push(`/sets?${params.toString()}`);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, router, currentSearchParams]);

  return (
    <div className="flex items-center gap-2">
      <Input
        type="search"
        name="search" // Name attribute is good for accessibility/forms, though not submitted traditionally
        placeholder="Search sets by name..."
        className="w-full md:w-64" // Responsive width
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="Search sets"
      />
      {/* The Search button is removed as search is dynamic */}
    </div>
  );
}
