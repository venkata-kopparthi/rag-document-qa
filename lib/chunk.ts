export interface TextChunk {
  content: string;
  index: number;
}

export interface ChunkOptions {
  chunkSize?: number; // chars per chunk, rough stand-in for tokens
  chunkOverlap?: number;
}

// splits on paragraph boundaries first, only hard-splitting when a single
// paragraph is bigger than chunkSize (dense PDF text with no line breaks)
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const chunkSize = options.chunkSize ?? 1000;
  const chunkOverlap = options.chunkOverlap ?? 150;

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: TextChunk[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) {
      chunks.push({ content: current.trim(), index: chunks.length });
    }
  };

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    // flush and carry a small overlap tail into the next chunk
    if (current) {
      flush();
      current = current.slice(-chunkOverlap);
    }

    if (paragraph.length <= chunkSize) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }

    // paragraph itself too long, hard-split it
    let start = 0;
    while (start < paragraph.length) {
      const end = Math.min(start + chunkSize, paragraph.length);
      chunks.push({ content: paragraph.slice(start, end).trim(), index: chunks.length });
      if (end === paragraph.length) break;
      start = Math.max(end - chunkOverlap, start + 1);
    }
    current = "";
  }

  flush();
  return chunks;
}
