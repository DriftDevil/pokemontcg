
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import "swagger-ui-react/swagger-ui.css"; // Import CSS from the package

interface SwaggerViewerProps {
  spec: string | object; // Can be YAML string or JSON object
}

// Dynamically import SwaggerUI to avoid SSR issues
let SwaggerUI: any = null;

export default function SwaggerViewer({ spec }: SwaggerViewerProps) {
  const swaggerUIRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    import('swagger-ui-react')
      .then(module => {
        SwaggerUI = module.default;
      })
      .catch(err => {
        console.error("Failed to load Swagger UI:", err);
        setError("Could not load Swagger UI component. Please ensure 'swagger-ui-react' is installed and its CSS is correctly imported.");
      });
  }, []);

  const specString = typeof spec === 'object' ? JSON.stringify(spec, null, 2) : spec;

  if (!isClient || !SwaggerUI) {
    return (
      <div className="p-4 border rounded-md bg-muted">
        <p className="text-muted-foreground">Loading Swagger Viewer...</p>
        {error && <p className="text-destructive mt-2">{error}</p>}
        <Textarea
          value={specString}
          readOnly
          className="mt-4 min-h-[400px] w-full font-code text-sm bg-background"
          aria-label="Raw OpenAPI Specification"
        />
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
        <p>{error}</p>
         <Textarea
          value={specString}
          readOnly
          className="mt-4 min-h-[400px] w-full font-code text-sm bg-background"
          aria-label="Raw OpenAPI Specification"
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
        <div ref={swaggerUIRef} className="swagger-container bg-card p-1 rounded-md shadow">
          <SwaggerUI spec={spec} />
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
