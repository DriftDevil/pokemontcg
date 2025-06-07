
"use client";

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import "swagger-ui-react/swagger-ui.css"; 

interface SwaggerViewerProps {
  spec: string | null; // Expecting a YAML/JSON string or null
}

export default function SwaggerViewer({ spec }: SwaggerViewerProps) {
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

  const specString = spec || "";

  if (error) {
     return (
      <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
        <p>{error}</p>
         <Textarea
          value={specString}
          readOnly
          className="mt-4 min-h-[400px] w-full font-code text-sm bg-background"
          aria-label="Raw OpenAPI Specification (Error State)"
        />
      </div>
    );
  }

  if (!LoadedSwaggerUI || !spec) { // Also check if spec is loaded
    return (
      <div className="p-4 border rounded-md bg-muted">
        <p className="text-muted-foreground">Loading Swagger Viewer or Specification...</p>
        <Textarea
          value={specString}
          readOnly
          className="mt-4 min-h-[400px] w-full font-code text-sm bg-background"
          aria-label="Raw OpenAPI Specification (Loading State)"
        />
      </div>
    );
  }
  
  return (
    <Tabs defaultValue="swagger-ui" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="swagger-ui">Swagger UI</TabsTrigger>
        <TabsTrigger value="raw-yaml">Raw YAML</TabsTrigger>
      </TabsList>
      <TabsContent value="swagger-ui">
        <div className="swagger-container bg-card p-1 rounded-md shadow">
          {/* Pass the spec string directly */}
          <LoadedSwaggerUI spec={specString} /> 
        </div>
      </TabsContent>
      <TabsContent value="raw-yaml">
        <Textarea
          value={specString}
          readOnly
          className="min-h-[600px] w-full font-code text-sm bg-background"
          aria-label="Raw OpenAPI Specification"
        />
      </TabsContent>
    </Tabs>
  );
}

