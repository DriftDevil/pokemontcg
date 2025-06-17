
"use client";
import { useState, useEffect } from 'react';

interface LocalizedTimeDisplayProps {
  isoDateString: string | null | undefined;
  fallbackText?: string;
}

export default function LocalizedTimeDisplay({ isoDateString, fallbackText = "N/A" }: LocalizedTimeDisplayProps) {
  const [localizedTime, setLocalizedTime] = useState<string>(fallbackText);

  useEffect(() => {
    // This effect runs only on the client, after hydration
    if (isoDateString) {
      try {
        const date = new Date(isoDateString);
        // Using toLocaleString with options for clarity and to ensure both date and time
        setLocalizedTime(date.toLocaleString(undefined, {
          year: 'numeric', month: 'numeric', day: 'numeric',
          hour: 'numeric', minute: 'numeric', second: 'numeric',
          hour12: true, // Adjust if 24-hour format is preferred
        }));
      } catch (e) {
        console.error("Error formatting date:", e);
        setLocalizedTime(fallbackText); // Fallback if parsing fails
      }
    } else {
      setLocalizedTime(fallbackText);
    }
  }, [isoDateString, fallbackText]);

  return <>{localizedTime}</>;
}
