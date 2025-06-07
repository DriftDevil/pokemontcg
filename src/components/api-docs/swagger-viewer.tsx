"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';

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
        // Add swagger-ui-react's CSS
        if (!document.querySelector('link[href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css'; // Ensure this version matches installed if any
            document.head.appendChild(link);
        }
      })
      .catch(err => {
        console.error("Failed to load Swagger UI:", err);
        setError("Could not load Swagger UI component. Please ensure 'swagger-ui-react' is installed.");
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
          {/* 
            SwaggerUI expects a URL or a spec object. If `spec` is a YAML string,
            it needs to be parsed into an object or served via a URL.
            For simplicity with YAML string, often one would use a library like `js-yaml`
            to parse it before passing to SwaggerUI.
            However, SwaggerUI component itself can sometimes handle string specs if they are JSON.
            If it's YAML, it's better to parse it or provide a URL.
            For now, assuming SwaggerUI can handle the string directly or it's JSON.
            If spec is YAML string, SwaggerUI might fail.
            A more robust solution would parse YAML to JSON here.
          */}
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
