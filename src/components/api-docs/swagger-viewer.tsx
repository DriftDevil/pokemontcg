
"use client";

import React, { useEffect, useState, memo } from 'react';
import "swagger-ui-react/swagger-ui.css";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface SwaggerViewerProps {
  spec: object | null; // Expecting a pre-parsed spec object
}

const MemoizedSwaggerUI = memo(function WrappedSwaggerUI({ LoadedSwaggerUI, spec }: { LoadedSwaggerUI: React.ComponentType<any>, spec: object }) {
  return <LoadedSwaggerUI spec={spec} />;
});

export default function SwaggerViewer({ spec }: SwaggerViewerProps) {
  const [LoadedSwaggerUI, setLoadedSwaggerUI] = useState<React.ComponentType<any> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    import('swagger-ui-react')
      .then(module => {
        setLoadedSwaggerUI(() => module.default);
      })
      .catch(err => {
        console.error("Failed to load Swagger UI React component:", err);
        setLoadError("Could not load Swagger UI component. Please ensure 'swagger-ui-react' is installed and its CSS is correctly imported.");
      });
  }, []);

  if (loadError) {
     return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Component Load Error</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  if (!LoadedSwaggerUI) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    );
  }

  if (!spec) {
    return (
       <Alert className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Specification</AlertTitle>
        <AlertDescription>API Specification not provided or is empty.</AlertDescription>
      </Alert>
    );
  }

  return (
    // Removed bg-card, p-1, rounded-md, shadow as these are handled by parent CardContent
    <div className="swagger-container">
      <MemoizedSwaggerUI LoadedSwaggerUI={LoadedSwaggerUI} spec={spec} />
    </div>
  );
}
