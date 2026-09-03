import { createHash } from "node:crypto";
import path from "node:path";

import Eleventy from "@11ty/eleventy";

const EMBEDDING_INPUT_VERSION = 1;
const RELATIONSHIP_INPUT_VERSION = 1;
const PRESENTATION_INPUT_VERSION = 1;
const MAXIMUM_EMBEDDING_CHARACTERS = 12000;

const hashValue = (value) => {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
};

const extractFrontMatter = (rawInput) => {
  const match = rawInput.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  return match ? match[1] : "";
};

const extractCategories = (frontMatter) => {
  const blockMatch = frontMatter.match(/^categories:\s*\n((?:\s*-\s*.+\n?)+)/m);

  if (blockMatch)
  {
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

  if (headingMatch)
  {
    return stripHtml(headingMatch[1]);
  }

  return path.basename(inputPath, path.extname(inputPath));
};

const getKind = (inputPath) => {
  const segments = inputPath.split("/");
  return segments[2] || "page";
};

const normalizeTopics = (topics) => {
  if (!Array.isArray(topics))
  {
    return [];
  }

  return Array.from(new Set(
    topics
      .map((topic) => String(topic).trim().toLowerCase())
      .filter(Boolean),
  )).sort();
};

export const createContentRecord = (result, model) => {
  const frontMatter = extractFrontMatter(result.rawInput);
  const kind = getKind(result.inputPath);
  const categories = kind === "writing" ? extractCategories(frontMatter) : [];
  const text = extractArticleText(result.rawInput);
  const title = extractTitle(result.content, result.inputPath);
  const topics = normalizeTopics(result.data?.topics);
  const embeddingText = [
    `Title: ${title}`,
    `Kind: ${kind}`,
    categories.length ? `Category: ${categories.join(", ")}` : "",
    `Content: ${text}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAXIMUM_EMBEDDING_CHARACTERS);
  const textHash = hashValue({
    embeddingText,
    model,
    version: EMBEDDING_INPUT_VERSION,
  });
  const relationshipHash = hashValue({
    textHash,
    topics,
    version: RELATIONSHIP_INPUT_VERSION,
  });
  const presentationHash = hashValue({
    date: result.data?.contentDate || null,
    title,
    url: result.url,
    version: PRESENTATION_INPUT_VERSION,
  });

  return {
    categories,
    contentDate: result.data?.contentDate || null,
    embeddingText,
    inputPath: result.inputPath,
    kind,
    presentationHash,
    relationshipHash,
    text,
    textHash,
    title,
    topics,
    url: result.url,
  };
};

export const getContentRecords = async (model) => {
  const eleventy = new Eleventy("src", "_site", { configPath: ".eleventy.js" });
  const results = await eleventy.toJSON();
  const manifest = results.find((result) => result.inputPath.endsWith("search/records.json.11ty.js"));

  if (!manifest)
  {
    throw new Error("Could not find the canonical search-record manifest.");
  }

  const metadataByUrl = new Map(
    JSON.parse(manifest.content).map((metadata) => [metadata.url, metadata]),
  );

  return results
    .filter((result) => metadataByUrl.has(result.url))
    .filter((result) => typeof result.rawInput === "string" && typeof result.content === "string")
    .map((result) => createContentRecord({
      ...result,
      data: metadataByUrl.get(result.url),
    }, model))
    .filter((record) => record.url && record.embeddingText);
};
