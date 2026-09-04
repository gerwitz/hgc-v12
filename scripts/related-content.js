import { readFile, writeFile } from "node:fs/promises";

import { getContentRecords } from "../eleventy/content-records.js";
import { createRelatedData, updateRelatedGraph } from "../eleventy/related-graph.js";

const CACHE_PATH = "generated/related-content-cache.json";
const RELATED_DATA_PATH = "src/_data/related.json";
const GRAPH_CACHE_PATH = "generated/related-graph-cache.json";
const MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const EMBEDDING_BATCH_SIZE = 64;
const CACHE_VERSION = 2;

const readJson = async (filePath, fallback) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  }
  catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
};

const writeJson = async (filePath, data) => {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
};


const getEmbedding = (cachedItem) => {
  if (Array.isArray(cachedItem.embedding)) {
    return Float32Array.from(cachedItem.embedding);
  }

  const bytes = Buffer.from(cachedItem.embedding, "base64");
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / Float32Array.BYTES_PER_ELEMENT);
};

const serializeEmbedding = (embedding) => {
  const vector = embedding instanceof Float32Array ? embedding : Float32Array.from(embedding);
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength).toString("base64");
};



const requestEmbeddings = async (items) => {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: items.map((item) => item.embeddingText),
      model: MODEL,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embeddings request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  return payload.data.sort((first, second) => first.index - second.index).map((item) => item.embedding);
};

const migrateCache = (content, cache) => {
  if (cache.version === CACHE_VERSION)
  {
    return cache;
  }

  const records = {};
  const embeddings = {};

  for (const item of content)
  {
    const cachedItem = cache.items?.[item.url];

    if (!cachedItem || cachedItem.model !== MODEL)
    {
      continue;
    }

    records[item.url] = {
      presentationHash: item.presentationHash,
      relationshipHash: item.relationshipHash,
      textHash: item.textHash,
    };
    embeddings[item.textHash] = {
      embedding: serializeEmbedding(getEmbedding(cachedItem)),
      model: MODEL,
    };
  }

  return {
    embeddings,
    model: MODEL,
    records,
    version: CACHE_VERSION,
  };
};

const updateEmbeddings = async (content, originalCache) => {
  const cache = migrateCache(content, originalCache);
  const records = {};
  const embeddings = { ...cache.embeddings };
  const missingItems = content.filter((item) => {
    return !embeddings[item.textHash] || embeddings[item.textHash].model !== MODEL;
  });

  if (missingItems.length && !process.env.OPENAI_API_KEY)
  {
    throw new Error(`OPENAI_API_KEY is required to generate embeddings for ${missingItems.length} new or changed content entries.`);
  }

  for (let start = 0; start < missingItems.length; start += EMBEDDING_BATCH_SIZE)
  {
    const batch = missingItems.slice(start, start + EMBEDDING_BATCH_SIZE);
    const requestedEmbeddings = await requestEmbeddings(batch);

    batch.forEach((item, index) => {
      embeddings[item.textHash] = {
        embedding: serializeEmbedding(requestedEmbeddings[index]),
        model: MODEL,
      };
    });

    console.log(`Embedded ${Math.min(start + batch.length, missingItems.length)} of ${missingItems.length} changed items.`);
  }

  for (const item of content)
  {
    records[item.url] = {
      presentationHash: item.presentationHash,
      relationshipHash: item.relationshipHash,
      textHash: item.textHash,
    };
  }

  const referencedHashes = new Set(Object.values(records).map((record) => record.textHash));
  for (const textHash of Object.keys(embeddings))
  {
    if (!referencedHashes.has(textHash))
    {
      delete embeddings[textHash];
      continue;
    }

    embeddings[textHash].embedding = serializeEmbedding(getEmbedding(embeddings[textHash]));
  }

  return {
    embeddings,
    model: MODEL,
    records,
    version: CACHE_VERSION,
  };
};


const main = async () => {
  const content = await getContentRecords(MODEL);
  console.log(`Found ${content.length} searchable content entries.`);

  if (process.argv.includes("--dry-run")) {
    return;
  }

  const cache = await readJson(CACHE_PATH, {
    embeddings: {},
    model: MODEL,
    records: {},
    version: CACHE_VERSION,
  });
  const updatedCache = await updateEmbeddings(content, cache);
  const embeddings = new Map(content.map((item) => {
    const cachedEmbedding = updatedCache.embeddings[updatedCache.records[item.url].textHash];
    return [item.url, getEmbedding(cachedEmbedding)];
  }));
  const graphCache = await readJson(GRAPH_CACHE_PATH, { records: {}, version: 1 });
  const updatedGraph = updateRelatedGraph(content, embeddings, graphCache);
  const relatedData = createRelatedData(content, updatedGraph, MODEL);

  await writeJson(CACHE_PATH, updatedCache);
  await writeJson(GRAPH_CACHE_PATH, updatedGraph);
  await writeJson(RELATED_DATA_PATH, relatedData);
  console.log(`Wrote related content for ${content.length} sources.`);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
