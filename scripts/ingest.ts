// Reads PDFs from ./documents (or a folder passed as an arg), chunks and
// embeds them, and loads them into the documents table.
//
//   npm run ingest
//   npm run ingest -- ./my-docs

import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { PDFParse } from "pdf-parse";

import { embedTexts } from "../lib/azure-openai";
import { analyzeDocuments, clearDocumentsBySource, insertDocumentChunk } from "../lib/db";
import { chunkText } from "../lib/chunk";

const EMBED_BATCH_SIZE = 16;

async function extractPdfText(path: string): Promise<string> {
  const buffer = await readFile(path);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    // strip the "-- N of M --" page markers pdf-parse inserts between pages
    return result.text.replace(/^--\s*\d+\s+of\s+\d+\s*--$/gm, "");
  } finally {
    await parser.destroy();
  }
}

async function ingestFile(path: string, filename: string) {
  console.log(`\n[ingest] ${filename}`);

  const text = await extractPdfText(path);
  if (!text.trim()) {
    console.warn(`  skipped: no extractable text (scanned image PDF with no OCR layer?)`);
    return { chunks: 0 };
  }

  const chunks = chunkText(text, { chunkSize: 1000, chunkOverlap: 150 });
  if (chunks.length === 0) {
    console.warn(`  skipped: chunking produced 0 chunks`);
    return { chunks: 0 };
  }
  console.log(`  extracted ${text.length} chars -> ${chunks.length} chunks`);

  // clear old chunks from this file so re-running doesn't duplicate rows
  await clearDocumentsBySource(filename);

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedTexts(batch.map((c) => c.content));

    await Promise.all(
      batch.map((chunk, j) =>
        insertDocumentChunk({
          source: filename,
          chunkIndex: chunk.index,
          content: chunk.content,
          metadata: { charLength: chunk.content.length },
          embedding: embeddings[j],
        })
      )
    );
    console.log(`  embedded + inserted chunks ${i + 1}-${Math.min(i + batch.length, chunks.length)} / ${chunks.length}`);
  }

  return { chunks: chunks.length };
}

async function main() {
  const targetDir = resolve(process.cwd(), process.argv[2] || process.env.INGEST_DIR || "documents");
  console.log(`Scanning ${targetDir} for PDFs...`);

  let entries: string[];
  try {
    entries = await readdir(targetDir);
  } catch (err) {
    throw new Error(`Could not read directory ${targetDir}: ${(err as Error).message}`);
  }

  const pdfFiles = entries.filter((f) => extname(f).toLowerCase() === ".pdf");
  if (pdfFiles.length === 0) {
    console.log(
      `No PDF files found in ${targetDir}. Drop some .pdf files there (or pass a different folder) and re-run.`
    );
    return;
  }

  let totalChunks = 0;
  for (const filename of pdfFiles) {
    const { chunks } = await ingestFile(join(targetDir, filename), filename);
    totalChunks += chunks;
  }

  await analyzeDocuments();
  console.log(`\nDone. Ingested ${pdfFiles.length} file(s), ${totalChunks} chunk(s) total.`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
