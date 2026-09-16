import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paseo launcher",
  description: "Run a private Paseo host in your Vercel account.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
