# Documents

Place PDF files in this directory and run:

```bash
npm run ingest
```

The ingestion script extracts text, creates overlapping chunks, generates embeddings with Azure OpenAI, and stores the chunks in PostgreSQL/pgvector.

Do not add confidential or personally identifiable documents to a public repository.
