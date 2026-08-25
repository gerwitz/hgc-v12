import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import Eleventy from "@11ty/eleventy";

const CACHE_PATH = "eleventy/related-content-cache.json";
const RELATED_DATA_PATH = "src/_data/related.json";
const MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const MINIMUM_SCORE = 0.5;
const MAXIMUM_RELATED = 8;
const MAXIMUM_EMBEDDING_CHARACTERS = 12000;
const EMBEDDING_BATCH_SIZE = 64;

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


const extractFrontMatter = (rawInput) => {
  const match = rawInput.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  return match ? match[1] : "";
};

const extractCategories = (frontMatter) => {
  const blockMatch = frontMatter.match(/^categories:\s*\n((?:\s*-\s*.+\n?)+)/m);

  if (blockMatch) {
    return blockMatch[1]
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
  }

  const inlineMatch = frontMatter.match(/^categories:\s*\[([^\]]*)\]/m);
  return inlineMatch
    ? inlineMatch[1].split(",").map((category) => category.trim()).filter(Boolean)
    : [];
};

const extractArticleText = (rawInput) => {
  const withoutFrontMatter = rawInput.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");

  return withoutFrontMatter
    .replace(/\{[%#][\s\S]*?[%#]\}/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/!?(\[[^\]]*\])\([^)]*\)/g, "$1")
    .replace(/[`*_>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const decodeHtml = (value) => {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

const stripHtml = (value) => {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
};

const extractTitle = (content, inputPath) => {
  const headingMatch = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

  if (headingMatch) {
    return stripHtml(headingMatch[1]);
  }

  return path.basename(inputPath, path.extname(inputPath));
};

const getKind = (inputPath) => {
  const segments = inputPath.split("/");
  return segments[2] || "page";
};

const getContentHash = (content) => {
  return createHash("sha256").update(content).digest("hex");
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

const getCosineSimilarity = (firstEmbedding, secondEmbedding) => {
  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (let index = 0; index < firstEmbedding.length; index += 1) {
    dotProduct += firstEmbedding[index] * secondEmbedding[index];
    firstMagnitude += firstEmbedding[index] ** 2;
    secondMagnitude += secondEmbedding[index] ** 2;
  }

  return dotProduct / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude));
};

const getSearchableContent = async () => {
  const eleventy = new Eleventy("src", "_site", { configPath: ".eleventy.js" });
  const results = await eleventy.toJSON();
  const searchIndex = results.find((result) => result.inputPath.endsWith("search/lunr.json.11ty.cjs"));

  if (!searchIndex) {
    throw new Error("Could not find the generated Lunr search index.");
  }

  const searchableUrls = new Set(Object.values(JSON.parse(searchIndex.content).map).map((item) => item.url));

  return results
    .filter((result) => searchableUrls.has(result.url) && typeof result.rawInput === "string" && typeof result.content === "string")
    .map((result) => {
      const frontMatter = extractFrontMatter(result.rawInput);
      const kind = getKind(result.inputPath);
      const categories = kind === "writing" ? extractCategories(frontMatter) : [];
      const articleText = extractArticleText(result.rawInput);
      const title = extractTitle(result.content, result.inputPath);
      const embeddingText = [
        `Title: ${title}`,
        `Kind: ${kind}`,
        categories.length ? `Category: ${categories.join(", ")}` : "",
        `Content: ${articleText}`,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, MAXIMUM_EMBEDDING_CHARACTERS);

      return {
        categories,
        embeddingText,
        inputPath: result.inputPath,
        kind,
        title,
        url: result.url,
      };
    })
    .filter((item) => item.url && item.embeddingText);
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

const updateEmbeddings = async (content, cache) => {
  const cachedItems = cache.items || {};
  const missingItems = [];

  for (const item of content) {
    const contentHash = getContentHash(item.embeddingText);
    const cachedItem = cachedItems[item.url];

    if (cachedItem?.contentHash !== contentHash || cachedItem?.model !== MODEL) {
      missingItems.push({ ...item, contentHash });
    }
  }

  if (missingItems.length && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate embeddings for new or changed content.");
  }

  for (let start = 0; start < missingItems.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = missingItems.slice(start, start + EMBEDDING_BATCH_SIZE);
    const embeddings = await requestEmbeddings(batch);

    batch.forEach((item, index) => {
      cachedItems[item.url] = {
        contentHash: item.contentHash,
        embedding: serializeEmbedding(embeddings[index]),
        model: MODEL,
      };
    });

    console.log(`Embedded ${Math.min(start + batch.length, missingItems.length)} of ${missingItems.length} changed items.`);
  }

  const currentUrls = new Set(content.map((item) => item.url));
  for (const url of Object.keys(cachedItems)) {
    if (!currentUrls.has(url)) {
      delete cachedItems[url];
      continue;
    }

    cachedItems[url].embedding = serializeEmbedding(getEmbedding(cachedItems[url]));
  }

  return {
    items: cachedItems,
    model: MODEL,
  };
};

const createRelatedData = (content, cache) => {
  const candidates = new Map(content.map((item) => [item.url, []]));

  for (let firstIndex = 0; firstIndex < content.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < content.length; secondIndex += 1) {
      const first = content[firstIndex];
      const second = content[secondIndex];
      const score = getCosineSimilarity(
        getEmbedding(cache.items[first.url]),
        getEmbedding(cache.items[second.url]),
      );

      if (score >= MINIMUM_SCORE) {
        candidates.get(first.url).push({ score, url: second.url });
        candidates.get(second.url).push({ score, url: first.url });
      }
    }
  }

  const selectedUrls = new Map();
  for (const [url, related] of candidates) {
    selectedUrls.set(url, new Set(
      related
        .sort((first, second) => second.score - first.score)
        .slice(0, MAXIMUM_RELATED)
        .map((item) => item.url),
    ));
  }

  const contentByUrl = new Map(content.map((item) => [item.url, item]));
  const sources = {};

  for (const source of content) {
    const related = candidates.get(source.url)
      .filter((item) => selectedUrls.get(source.url).has(item.url) && selectedUrls.get(item.url).has(source.url))
      .sort((first, second) => second.score - first.score)
      .map((item) => {
        const destination = contentByUrl.get(item.url);

        return {
          category: destination.categories,
          kind: destination.kind,
          score: Number(item.score.toFixed(3)),
          title: destination.title,
          url: destination.url,
        };
      });

    sources[source.url] = {
      category: source.categories,
      kind: source.kind,
      related,
    };
  }

  return {
    maximumRelated: MAXIMUM_RELATED,
    minimumScore: MINIMUM_SCORE,
    model: MODEL,
    sources,
  };
};

const main = async () => {
  const content = await getSearchableContent();
  console.log(`Found ${content.length} searchable content entries.`);

  if (process.argv.includes("--dry-run")) {
    return;
  }

  const cache = await readJson(CACHE_PATH, { items: {}, model: MODEL });
  const updatedCache = await updateEmbeddings(content, cache);
  const relatedData = createRelatedData(content, updatedCache);

  await writeJson(CACHE_PATH, updatedCache);
  await writeJson(RELATED_DATA_PATH, relatedData);
  console.log(`Wrote related content for ${content.length} sources.`);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
