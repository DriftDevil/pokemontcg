"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { generateOpenAPISpec, type GenerateOpenAPISpecInput, type GenerateOpenAPISpecOutput } from "@/ai/flows/generate-openapi-spec";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Wand2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SwaggerViewer from "./swagger-viewer";


const formSchema = z.object({
  apiEndpoints: z.string().min(1, "Please enter at least one API endpoint."),
  existingSpec: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function OpenApiGeneratorClient() {
  const [generatedSpec, setGeneratedSpec] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiEndpoints: "/api/cards, /api/sets, /api/users/{id}",
      existingSpec: "",
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    setError(null);
    setGeneratedSpec(null);

    try {
      const inputData: GenerateOpenAPISpecInput = {
        apiEndpoints: data.apiEndpoints,
        existingSpec: data.existingSpec || undefined,
      };
      const result: GenerateOpenAPISpecOutput = await generateOpenAPISpec(inputData);
      setGeneratedSpec(result.openApiSpec);
      toast({
        title: "OpenAPI Spec Generated",
        description: "The OpenAPI specification has been successfully generated.",
      });
    } catch (e) {
      console.error("Error generating OpenAPI spec:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to generate OpenAPI spec: ${errorMessage}`);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: `Could not generate OpenAPI spec: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedSpec) {
      navigator.clipboard.writeText(generatedSpec).then(() => {
        setCopied(true);
        toast({ title: "Copied to clipboard!"});
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error("Failed to copy text: ", err);
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy to clipboard."});
      });
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Generate OpenAPI Specification</CardTitle>
          <CardDescription>
            Provide a comma-separated list of API endpoints and an optional existing OpenAPI spec (YAML) to extend.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="apiEndpoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="apiEndpoints">API Endpoints</FormLabel>
                    <FormControl>
                      <Input id="apiEndpoints" placeholder="/api/v1/users, /api/v1/products/{id}" {...field} />
                    </FormControl>
                    <FormDescription>
                      Comma-separated list of API endpoints to document.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="existingSpec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="existingSpec">Existing OpenAPI Spec (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        id="existingSpec"
                        placeholder="Paste your existing OpenAPI YAML here..."
                        className="min-h-[150px] font-code text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      If you have an existing OpenAPI 3.0 spec in YAML format, paste it here to extend it.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} size="lg">
                {isLoading ? (
                  <>
                    <Wand2 className="mr-2 h-5 w-5 animate-pulse" /> Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" /> Generate Spec
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generatedSpec && (
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline text-2xl">Generated OpenAPI 3.0 Specification</CardTitle>
              <CardDescription>Review the generated YAML specification below or view it in Swagger UI.</CardDescription>
            </div>
            <Button onClick={handleCopy} variant="outline" size="sm" className="ml-auto">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy YAML'}
            </Button>
          </CardHeader>
          <CardContent>
            <SwaggerViewer spec={generatedSpec} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
