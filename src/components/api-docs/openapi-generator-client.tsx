
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import SwaggerViewer from "./swagger-viewer";
import { useToast } from "@/hooks/use-toast";

export default function OpenApiViewerClient() {
  const [specUrl, setSpecUrl] = useState<string | null>('/openapi.yaml'); 
  const [isLoading, setIsLoading] = useState(false); // SwaggerUI will handle its own loading internally
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!specUrl) {
      const errorMessage = "OpenAPI specification URL is not configured.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: errorMessage,
      });
    } else {
       toast({
        title: "API Specification URL Ready",
        description: `Swagger UI will load the specification from: ${specUrl}`,
      });
    }
    // Since SwaggerUI handles its own loading from the URL, 
    // this component's isLoading is minimal.
    setIsLoading(false); 
  }, [specUrl, toast]);


  if (isLoading) { // Minimal loading state for this component
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

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Initializing Viewer</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (specUrl) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">API Specification</CardTitle>
            <CardDescription>Review the API specification below using Swagger UI.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <SwaggerViewer specUrl={specUrl} />
        </CardContent>
      </Card>
    );
  }

  return null; 
}
