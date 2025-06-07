"use client"; 

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/page-header';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
      <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
      <PageHeader 
        title="Oops! Something went wrong."
        description={process.env.NODE_ENV === 'development' ? error.message : "We encountered an unexpected issue. Please try again."}
      />
      {process.env.NODE_ENV === 'development' && error.digest && (
        <p className="text-sm text-muted-foreground mb-4">Digest: {error.digest}</p>
      )}
      <Button
        onClick={() => reset()}
        size="lg"
      >
        Try Again
      </Button>
      <Button variant="link" asChild className="mt-4">
        <a href="/">Go to Homepage</a>
      </Button>
    </div>
  );
}
