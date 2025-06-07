
"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SwaggerViewer from "./swagger-viewer";
import { useToast } from "@/hooks/use-toast";

export default function OpenApiViewerClient() {
  // Generate a cache-busting URL every time this component might re-render to ensure freshness
  const dynamicSpecUrl = `/openapi.yaml?t=${new Date().getTime()}`;
  const { toast } = useToast();

  useEffect(() => {
    // This toast provides an initial user feedback.
    // SwaggerUI component itself will show its own loading indicators for the spec.
    toast({
      title: "API Documentation Viewer",
      description: "Initializing Swagger UI to load the API specification.",
    });
  }, [toast]); // Runs once on mount as toast function is stable

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline text-2xl">API Specification</CardTitle>
          <CardDescription>Review the API specification below using Swagger UI.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {/* SwaggerViewer will handle errors related to fetching/parsing specUrl via swagger-ui-react */}
        <SwaggerViewer specUrl={dynamicSpecUrl} />
      </CardContent>
    </Card>
  );
}
