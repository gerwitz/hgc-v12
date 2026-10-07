import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRelatedData, updateRelatedGraph } from "../eleventy/related-graph.js";

const MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 64;
const EMBEDDING_REQUEST_TIMEOUT = 60000;
const CACHE_VERSION = 3;

const getEmbedding = (cachedItem) =>
{
  if (Array.isArray(cachedItem.embedding))
  {
    return Float32Array.from(cachedItem.embedding);
  }

  const bytes = Buffer.from(cachedItem.embedding, "base64");
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / Float32Array.BYTES_PER_ELEMENT);
};

const serializeEmbedding = (embedding) =>
{
  const vector = embedding instanceof Float32Array ? embedding : Float32Array.from(embedding);
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength).toString("base64");
};

const actualRequest = async (items, model) =>
{
  if (!process.env.OPENAI_API_KEY)
  {
    throw new Error(`OPENAI_API_KEY is required to generate embeddings for ${items.length} new or changed content entries.`);
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: items.map((item) => item.embeddingText),
      model,
    }),
    signal: AbortSignal.timeout(EMBEDDING_REQUEST_TIMEOUT),
  });

  if (!response.ok)
  {
    throw new Error(`OpenAI embeddings request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  return payload.data.sort((first, second) => first.index - second.index).map((item) => item.embedding);
};

const migrateCache = (content, cache, model) =>
{
  if (cache.version === 2 || cache.version === CACHE_VERSION)
  {
    return cache.embeddings || {};
  }

  const embeddings = {};

  for (const item of content)
  {
    const cachedItem = cache.items?.[item.url];

    // A legacy URL match alone cannot establish that its text is still current.
    if (!cachedItem || cachedItem.model !== model
      || (cachedItem.textHash !== item.textHash && cachedItem.hash !== item.textHash))
    {
      continue;
    }

    embeddings[item.textHash] = cachedItem;
  }

  return embeddings;
};

const updateEmbeddings = async (content, originalCache, model, requestEmbeddings, logger) =>
{
  const embeddings = { ...migrateCache(content, originalCache, model) };
  const missingItems = Array.from(new Map(content
    .filter((item) => !embeddings[item.textHash] || embeddings[item.textHash].model !== model)
    .map((item) => [item.textHash, item])).values());

  for (let start = 0; start < missingItems.length; start += EMBEDDING_BATCH_SIZE)
  {
    const batch = missingItems.slice(start, start + EMBEDDING_BATCH_SIZE);
    const requestedEmbeddings = await requestEmbeddings(batch, model);

    batch.forEach((item, index) =>
    {
      embeddings[item.textHash] = {
        embedding: serializeEmbedding(requestedEmbeddings[index]),
        model,
      };
    });

    logger.log(`Embedded ${Math.min(start + batch.length, missingItems.length)} of ${missingItems.length} changed items.`);
  }

  // URL metadata belongs to the shared catalog, not the embedding cache.
  const referencedHashes = new Set(content.map((item) => item.textHash));
  const currentEmbeddings = {};

  for (const textHash of referencedHashes)
  {
    const cachedItem = embeddings[textHash];
    currentEmbeddings[textHash] = {
      embedding: typeof cachedItem.embedding === "string"
        ? cachedItem.embedding
        : serializeEmbedding(getEmbedding(cachedItem)),
      model,
    };
  }

  return {
    version: CACHE_VERSION,
    model,
    embeddings: currentEmbeddings,
  };
};

export const updateRelatedContent = async ({
  content,
  originalCache = {},
  originalGraph = {},
  model = MODEL,
  requestEmbeddings = actualRequest,
  logger = console,
}) =>
{
  const cache = await updateEmbeddings(content, originalCache, model, requestEmbeddings, logger);
  const embeddings = new Map(content.map((item) =>
  {
    return [item.url, getEmbedding(cache.embeddings[item.textHash])];
  }));
  const graph = updateRelatedGraph(content, embeddings, originalGraph);
  const related = createRelatedData(content, graph, model);

  return { cache, graph, related };
};

const readJson = async (filePath, fallback) =>
{
  try
  {
    return JSON.parse(await readFile(filePath, "utf8"));
  }
  catch (error)
  {
    if (error.code === "ENOENT")
    {
      return fallback;
    }
    throw error;
  }
};

const writeJson = async (filePath, value) =>
{
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

// The parent launches staged code in an isolated working directory.
const prepareSnapshot = async () =>
{
  const { CATALOG_PATH, buildContentCatalog, readContentCatalog } = await import("./content-catalog.mjs");
  const { getContentRecords } = await import("../eleventy/content-records.js");
  const seeded = await readContentCatalog(CATALOG_PATH);
  // Fresh extraction also generates required map assets inside the snapshot.
  const content = await getContentRecords(MODEL);
  console.log(`Found ${content.length} searchable content entries.`);
  const { cache, graph, related } = await updateRelatedContent({
    content,
    originalCache: await readJson("generated/related-content-cache.json", {}),
    originalGraph: await readJson("generated/related-graph-cache.json", {}),
    model: MODEL,
  });
  await writeJson("generated/related-content-cache.json", cache);
  await writeJson("generated/related-graph-cache.json", graph);
  await writeJson("src/_data/related.json", related);
  await writeJson(CATALOG_PATH, buildContentCatalog({
    sources: seeded.sources,
    records: content,
    inputHash: seeded.inputHash,
    embeddingModel: MODEL,
  }));
};

const main = async () =>
{
  if (process.argv.includes("--worker"))
  {
    await prepareSnapshot();
    return;
  }
  if (process.argv.includes("--dry-run"))
  {
    const { getContentRecords } = await import("../eleventy/content-records.js");
    const content = await getContentRecords(MODEL);
    console.log(`Found ${content.length} searchable content entries.`);
    return;
  }

  // Preparation owns snapshot publication; importing this module never starts it.
  const { prepareContent } = await import("./prepare-content.mjs");
  await prepareContent();
};

if (process.argv[1] === fileURLToPath(import.meta.url))
{
  main().catch((error) =>
  {
    console.error(error.message);
    process.exitCode = 1;
  });
}
