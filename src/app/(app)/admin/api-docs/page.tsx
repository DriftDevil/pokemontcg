import PageHeader from "@/components/page-header";
import OpenApiViewerClient from "@/components/api-docs/openapi-generator-client"; // Renaming this component might be good later
import { BookOpen } from "lucide-react";

export default function ApiDocsPage() {
  return (
    <>
      <PageHeader
        title="API Documentation Viewer"
        description="Explore the Pokémon TCG API specification."
        icon={BookOpen}
      />
      <OpenApiViewerClient />
    </>
  );
}
