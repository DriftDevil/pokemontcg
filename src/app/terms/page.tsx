
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Home } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Terms of Service"
        description="Please read our terms and conditions carefully."
        icon={FileText}
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Our Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Welcome to PokeAPI Admin! These terms and conditions outline the rules and regulations for the use of
            our application.
          </p>
          <p>
            By accessing this application we assume you accept these terms and conditions. Do not continue to use
            PokeAPI Admin if you do not agree to take all of the terms and conditions stated on this page.
          </p>
          <h3 className="font-semibold text-lg mt-4">License</h3>
          <p>
            Unless otherwise stated, PokeAPI Admin and/or its licensors own the intellectual property rights for
            all material on PokeAPI Admin. All intellectual property rights are reserved. You may access this
            from PokeAPI Admin for your own personal use subjected to restrictions set in these terms and conditions.
          </p>
          <p>You must not:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Republish material from PokeAPI Admin</li>
            <li>Sell, rent or sub-license material from PokeAPI Admin</li>
            <li>Reproduce, duplicate or copy material from PokeAPI Admin</li>
            <li>Redistribute content from PokeAPI Admin</li>
          </ul>
          <p>This Agreement shall begin on the date hereof.</p>
          <h3 className="font-semibold text-lg mt-4">Disclaimer</h3>
          <p>
            To the maximum extent permitted by applicable law, we exclude all representations, warranties and
            conditions relating to our application and the use of this application. Nothing in this disclaimer will:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>limit or exclude our or your liability for death or personal injury;</li>
            <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
            <li>limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
            <li>exclude any of our or your liabilities that may not be excluded under applicable law.</li>
          </ul>
          <p>
            The limitations and prohibitions of liability set in this Section and elsewhere in this disclaimer: (a)
            are subject to the preceding paragraph; and (b) govern all liabilities arising under the disclaimer,
            including liabilities arising in contract, in tort and for breach of statutory duty.
          </p>
          <p>
            As long as the application and the information and services on the application are provided free of charge,
            we will not be liable for any loss or damage of any nature.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            These are placeholder terms. Please replace with your actual Terms of Service.
            Last updated: {new Date().toLocaleDateString()}.
          </p>
        </CardContent>
      </Card>
      <div className="mt-8 text-center">
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
