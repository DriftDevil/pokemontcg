"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';
import PageHeader from '@/components/page-header';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-background">
      <AlertTriangle className="h-20 w-20 text-destructive mb-8" />
      <PageHeader 
        title="404 - Page Not Found"
        description="Sorry, the page you are looking for does not exist or has been moved."
      />
      <div className="flex gap-4 mt-8">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="mr-2 h-5 w-5" />
            Go to Homepage
          </Link>
        </Button>
        <Button variant="outline" size="lg" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    </div>
  );
}
