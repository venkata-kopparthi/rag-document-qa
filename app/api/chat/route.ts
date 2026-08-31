import { convertToModelMessages, streamText } from "ai";

import { chatModel, embedText } from "@/lib/azure-openai";
import { findSimilarDocuments, type SimilarDocument } from "@/lib/db";
import type { RagUIMessage } from "@/lib/types";

export const maxDuration = 30;
export const runtime = "nodejs"; // pg needs a real TCP socket, no edge runtime

const TOP_K = 5;

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions using ONLY the context
provided below, which was retrieved from the user's own documents via semantic
search over a pgvector index.

Rules:
- Answer strictly from the context. If the context doesn't contain the answer,
  say so instead of making something up.
- When you use a piece of context, cite it inline like [1], [2], matching the
  numbered sources below.
- Be concise.`;

function getLastUserText(messages: RagUIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";
  return lastUser.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function buildContextBlock(matches: SimilarDocument[]): string {
  if (matches.length === 0) {
    return "No relevant context was found in the document index.";
  }
  return matches
    .map(
      (m, i) =>
        `[${i + 1}] (source: ${m.source}, chunk ${m.chunkIndex}, similarity: ${m.similarity.toFixed(3)})\n${m.content}`
    )
    .join("\n\n---\n\n");
}

export async function POST(req: Request) {
  const { messages }: { messages: RagUIMessage[] } = await req.json();

  const query = getLastUserText(messages);

  let matches: SimilarDocument[] = [];
  if (query) {
    const queryEmbedding = await embedText(query);
    matches = await findSimilarDocuments(queryEmbedding, TOP_K);
  }

  const sources = matches.map((m) => ({
    source: m.source,
    chunkIndex: m.chunkIndex,
    similarity: m.similarity,
  }));

  const result = streamText({
    model: chatModel,
    system: `${SYSTEM_PROMPT}\n\nContext:\n${buildContextBlock(matches)}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "start") {
        return { sources };
      }
    },
  });
}
