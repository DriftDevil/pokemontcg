
"use client";

import { useEffect, useState } from "react"; // Keep useState for isLoading and error
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import SwaggerViewer from "./swagger-viewer";
import { useToast } from "@/hooks/use-toast";

export default function OpenApiViewerClient() {
  // Generate a cache-busting URL every time this component renders
  const dynamicSpecUrl = `/openapi.yaml?t=${new Date().getTime()}`;
  
  const [isLoading, setIsLoading] = useState(true); // Set to true initially
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // This effect can be simplified or used for initial setup messages.
    // The actual loading of the spec is handled by SwaggerViewer via the URL.
    toast({
      title: "API Specification Viewer",
      description: `Loading API specification...`, 
    });
    // SwaggerUI has its own loading. We can set isLoading to false after a short delay
    // or rely on SwaggerUI's internal loading indicators.
    // For simplicity, let's assume initial setup is quick.
    const timer = setTimeout(() => setIsLoading(false), 500); // Simulate initial setup
    return () => clearTimeout(timer);
  }, [toast]);


  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Initializing API Viewer
          </CardTitle>
          <CardDescription>
            Preparing to load API documentation.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) { // This error state is for issues within OpenApiViewerClient itself
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Initializing Viewer</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // SwaggerViewer will handle errors related to fetching/parsing the specUrl
  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline text-2xl">API Specification</CardTitle>
          <CardDescription>Review the API specification below using Swagger UI.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <SwaggerViewer specUrl={dynamicSpecUrl} />
      </CardContent>
    </Card>
  );
}
