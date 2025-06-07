import PageHeader from "@/components/page-header";
import OpenApiGeneratorClient from "@/components/api-docs/openapi-generator-client";
import { FileText } from "lucide-react";

export default function ApiDocsPage() {
  return (
    <>
      <PageHeader
        title="API Documentation Generator"
        description="Use AI to generate OpenAPI 3.0 specifications for your API endpoints."
        icon={FileText}
      />
      <OpenApiGeneratorClient />
    </>
  );
}
