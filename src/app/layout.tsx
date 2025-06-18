
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster }from "@/components/ui/toaster";
import { ThemeInitializer } from '@/components/theme-initializer'; // Import the new component

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'PokemonTCG',
  description: 'Manage and explore Pokémon TCG data.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head />
      <body className="font-body antialiased">
        <ThemeInitializer /> {/* Add ThemeInitializer here */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
