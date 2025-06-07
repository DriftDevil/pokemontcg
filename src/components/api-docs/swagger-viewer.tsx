
"use client";

import React, { useEffect, useState } from 'react';
// Tabs and Textarea are not used if we remove the Raw YAML tab for now.
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Textarea } from '@/components/ui/textarea';
import "swagger-ui-react/swagger-ui.css"; 

interface SwaggerViewerProps {
  specUrl: string | null; // Expecting a URL string or null
}

export default function SwaggerViewer({ specUrl }: SwaggerViewerProps) {
  const [LoadedSwaggerUI, setLoadedSwaggerUI] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import('swagger-ui-react')
      .then(module => {
        setLoadedSwaggerUI(() => module.default); 
      })
      .catch(err => {
        console.error("Failed to load Swagger UI:", err);
        setError("Could not load Swagger UI component. Please ensure 'swagger-ui-react' is installed and its CSS is correctly imported.");
      });
  }, []);


  if (error) {
     return (
      <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (!LoadedSwaggerUI) {
    return (
      <div className="p-4 border rounded-md bg-muted">
        <p className="text-muted-foreground">Loading Swagger Viewer...</p>
      </div>
    );
  }
  
  if (!specUrl) {
    return (
      <div className="p-4 border rounded-md bg-muted">
        <p className="text-muted-foreground">API Specification URL not provided.</p>
      </div>
    );
  }
  
  // Simplified to only show Swagger UI directly
  return (
    <div className="swagger-container bg-card p-1 rounded-md shadow">
      <LoadedSwaggerUI url={specUrl} /> 
    </div>
  );
}
