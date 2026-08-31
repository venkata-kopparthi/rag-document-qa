import type { UIMessage } from "ai";

export interface RagSource {
  source: string;
  chunkIndex: number;
  similarity: number;
}

export interface RagMessageMetadata {
  sources?: RagSource[];
}

// shared between the API route and the chat UI
export type RagUIMessage = UIMessage<RagMessageMetadata>;
