import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env and fill it in."
      );
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

// pgvector wants a literal like "[0.1,0.2,0.3]" cast to ::vector
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export interface DocumentChunkInput {
  source: string;
  chunkIndex: number;
  content: string;
  metadata?: Record<string, unknown>;
  embedding: number[];
}

export async function insertDocumentChunk(chunk: DocumentChunkInput): Promise<void> {
  const db = getPool();
  await db.query(
    `INSERT INTO documents (source, chunk_index, content, metadata, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)`,
    [
      chunk.source,
      chunk.chunkIndex,
      chunk.content,
      JSON.stringify(chunk.metadata ?? {}),
      toVectorLiteral(chunk.embedding),
    ]
  );
}

export interface SimilarDocument {
  id: number;
  source: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number; // 1 - cosine distance, so closer to 1 is more similar
}

export async function findSimilarDocuments(
  embedding: number[],
  limit = 5
): Promise<SimilarDocument[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT id, source, chunk_index, content, metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [toVectorLiteral(embedding), limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    source: row.source,
    chunkIndex: row.chunk_index,
    content: row.content,
    metadata: row.metadata,
    similarity: Number(row.similarity),
  }));
}

export async function analyzeDocuments(): Promise<void> {
  const db = getPool();
  await db.query("ANALYZE documents");
}

export async function clearDocumentsBySource(source: string): Promise<void> {
  const db = getPool();
  await db.query("DELETE FROM documents WHERE source = $1", [source]);
}

export async function countDocuments(): Promise<number> {
  const db = getPool();
  const result = await db.query("SELECT COUNT(*)::int AS count FROM documents");
  return result.rows[0].count;
}
