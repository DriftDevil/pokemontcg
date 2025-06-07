'use server';

/**
 * @fileOverview Generates an OpenAPI 3.0 specification by introspecting the API endpoints
 * and adding descriptions using a large language model.
 *
 * - generateOpenAPISpec - A function that handles the generation of the OpenAPI specification.
 * - GenerateOpenAPISpecInput - The input type for the generateOpenAPISpec function.
 * - GenerateOpenAPISpecOutput - The return type for the generateOpenAPISpec function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateOpenAPISpecInputSchema = z.object({
  apiEndpoints: z
    .string()
    .describe('A list of API endpoints to document, separated by commas.'),
  existingSpec: z.string().optional().describe('An existing OpenAPI specification to extend.'),
});
export type GenerateOpenAPISpecInput = z.infer<typeof GenerateOpenAPISpecInputSchema>;

const GenerateOpenAPISpecOutputSchema = z.object({
  openApiSpec: z.string().describe('The generated OpenAPI 3.0 specification.'),
});
export type GenerateOpenAPISpecOutput = z.infer<typeof GenerateOpenAPISpecOutputSchema>;

export async function generateOpenAPISpec(input: GenerateOpenAPISpecInput): Promise<GenerateOpenAPISpecOutput> {
  return generateOpenAPISpecFlow(input);
}

const endpointDetailsTool = ai.defineTool({
  name: 'getEndpointDetails',
  description: 'Retrieves details about a specific API endpoint, including its parameters, request body, and response structure.',
  inputSchema: z.object({
    endpoint: z.string().describe('The API endpoint to retrieve details for.'),
  }),
  outputSchema: z.string().describe('Details about the API endpoint.'),
}, async (input) => {
  // Placeholder implementation for fetching endpoint details.
  // In a real application, this would involve introspecting the API endpoint
  // (e.g., using reflection or parsing route definitions).
  return `Details for endpoint ${input.endpoint} not available in this stub.`;
});

const prompt = ai.definePrompt({
  name: 'generateOpenAPISpecPrompt',
  input: {schema: GenerateOpenAPISpecInputSchema},
  output: {schema: GenerateOpenAPISpecOutputSchema},
  tools: [endpointDetailsTool],
  prompt: `You are an API documentation expert. Your task is to generate an OpenAPI 3.0 specification for a given set of API endpoints.

You can use the getEndpointDetails tool to fetch information about individual endpoints.

Endpoints: {{{apiEndpoints}}}

Existing Specification (if any): {{{existingSpec}}}

Based on the provided endpoints and any existing specification, create a complete OpenAPI 3.0 specification in YAML format. Ensure that the specification includes:

- Paths for each endpoint, with appropriate HTTP methods (GET, POST, PUT, DELETE, etc.).
- Parameters for each endpoint, including query parameters, path parameters, and request body parameters.
- Request body schema (if applicable).
- Response schema for each endpoint, including different response codes (200, 400, 500, etc.).
- Comprehensive descriptions for each endpoint, parameter, request body, and response.

Make sure to use the getEndpointDetails tool to fetch more information about the endpoints.

Output the complete OpenAPI 3.0 specification in YAML format:
`,
});

const generateOpenAPISpecFlow = ai.defineFlow(
  {
    name: 'generateOpenAPISpecFlow',
    inputSchema: GenerateOpenAPISpecInputSchema,
    outputSchema: GenerateOpenAPISpecOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
