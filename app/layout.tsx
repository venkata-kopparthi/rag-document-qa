import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Document Q&A | RAG Chatbot",
  description: "A Next.js RAG chatbot using Azure OpenAI and PostgreSQL pgvector.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
