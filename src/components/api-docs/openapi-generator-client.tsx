
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SwaggerViewer from "./swagger-viewer";
import { useToast } from "@/hooks/use-toast";
import jsYaml from 'js-yaml';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function OpenApiViewerClient() {
  const [specObject, setSpecObject] = useState<object | null>(null);
  const [isLoadingSpec, setIsLoadingSpec] = useState(true);
  const [specError, setSpecError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    toast({
      title: "API Documentation Viewer",
      description: "Fetching API specification...",
    });

    const fetchSpec = async () => {
      setIsLoadingSpec(true);
      setSpecError(null);
      try {
        // Cache-busting for the YAML file
        const response = await fetch(`/openapi.yaml?t=${new Date().getTime()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch openapi.yaml: ${response.statusText}`);
        }
        const yamlText = await response.text();
        const parsedSpec = jsYaml.load(yamlText) as object;
        setSpecObject(parsedSpec);
        toast({
          title: "API Specification Loaded",
          description: "Swagger UI is now rendering the specification.",
        });
      } catch (error) {
        console.error("Error fetching or parsing API spec:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        setSpecError(`Failed to load API specification: ${errorMessage}`);
        toast({
          title: "Error Loading Specification",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingSpec(false);
      }
    };

    fetchSpec();
  }, [toast]);

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline text-2xl">API Specification</CardTitle>
          <CardDescription>Review the API specification below using Swagger UI.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingSpec && (
          <div className="space-y-4 p-4">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {specError && !isLoadingSpec && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{specError}</AlertDescription>
          </Alert>
        )}
        {!isLoadingSpec && !specError && specObject && (
          <SwaggerViewer spec={specObject} />
        )}
      </CardContent>
    </Card>
  );
}
