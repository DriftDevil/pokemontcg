
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import SwaggerViewer from "./swagger-viewer";
import { useToast } from "@/hooks/use-toast";
// No longer need js-yaml here if SwaggerUI handles parsing
// import yaml from 'js-yaml';


export default function OpenApiViewerClient() {
  const [spec, setSpec] = useState<string | null>(null); // Store as string
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSpec = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/openapi.yaml');
        if (!response.ok) {
          throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
        }
        const yamlText = await response.text();
        setSpec(yamlText); // Store raw YAML text
        toast({
          title: "API Specification Loaded",
          description: "The OpenAPI specification has been successfully loaded.",
        });
      } catch (e) {
        console.error("Error loading OpenAPI spec:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        setError(`Failed to load OpenAPI spec: ${errorMessage}`);
        toast({
          variant: "destructive",
          title: "Loading Failed",
          description: `Could not load OpenAPI spec: ${errorMessage}`,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpec();
  }, [toast]);


  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading API Specification
          </CardTitle>
          <CardDescription>
            Please wait while the API documentation is being loaded.
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
        <AlertTitle>Error Loading Specification</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (spec) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">API Specification</CardTitle>
            <CardDescription>Review the API specification below using Swagger UI or view the raw YAML.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <SwaggerViewer spec={spec} />
        </CardContent>
      </Card>
    );
  }

  return null; 
}

