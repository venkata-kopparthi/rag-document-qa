import { createAzure } from "@ai-sdk/azure";
import { embed, embedMany } from "ai";

const resourceName = process.env.AZURE_OPENAI_RESOURCE_NAME;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

if (!resourceName || !apiKey) {
  console.warn(
    "[azure-openai] AZURE_OPENAI_RESOURCE_NAME / AZURE_OPENAI_API_KEY are not set, " +
      "copy .env.example to .env and fill in your Azure OpenAI details"
  );
}

// resourceName is just the resource name, e.g. "my-resource" for
// https://my-resource.openai.azure.com, not the deployment name
export const azure = createAzure({
  resourceName: resourceName ?? "",
  apiKey: apiKey ?? "",
  apiVersion,
});

// deployment names from Azure AI Foundry, can differ from the model name
const embeddingDeployment =
  process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small";
const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-4o-mini";

export const embeddingModel = azure.textEmbeddingModel(embeddingDeployment);
export const chatModel = azure(chatDeployment);

// has to match the VECTOR(n) column size in db/init.sql
export const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS || 1536);

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({ model: embeddingModel, values: texts });
  return embeddings;
}
