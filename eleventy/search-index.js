import { readFile } from "node:fs/promises";

import * as pagefind from "pagefind";

import { getContentRecords } from "./content-records.js";

const OUTPUT_PATH = "_site/pagefind";
const RELATED_DATA_PATH = "src/_data/related.json";
const MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const MAXIMUM_NEIGHBORS = 5;
const MINIMUM_PROPAGATION_SCORE = 0.65;
const MAXIMUM_SUMMARY_CHARACTERS = 240;

const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const getSummary = (text) => {
  if (text.length <= MAXIMUM_SUMMARY_CHARACTERS)
  {
    return text;
  }

  return `${text.slice(0, MAXIMUM_SUMMARY_CHARACTERS).replace(/\s+\S*$/, "")}…`;
};

const getNeighborVocabulary = (record, relatedData) => {
  const relationships = relatedData.sources?.[record.url]?.related || [];

  return relationships
    .filter((relationship) => relationship.score >= MINIMUM_PROPAGATION_SCORE)
    .filter((relationship) => {
      return relationship.semanticScore === undefined || relationship.semanticScore >= MINIMUM_PROPAGATION_SCORE;
    })
    .slice(0, MAXIMUM_NEIGHBORS)
    .flatMap((relationship) => [
      relationship.title,
      ...(relationship.sharedTopics || []),
      ...(relationship.topics || []),
    ])
    .filter(Boolean)
    .join(" ");
};

const createSearchDocument = (record, relatedData) => {
  const topics = record.topics.join(" ");
  const neighborVocabulary = getNeighborVocabulary(record, relatedData);
  return `<!doctype html>
<html lang="en">
<head>
  <title data-pagefind-meta="title">${escapeHtml(record.title)}</title>
  <meta data-pagefind-meta="summary[content]" name="summary" content="${escapeHtml(getSummary(record.text))}">
  <meta data-pagefind-meta="kind[content]" name="kind" content="${escapeHtml(record.kind)}">
  <meta data-pagefind-meta="date[content]" name="date" content="${escapeHtml(record.contentDate || "")}">
  <meta data-pagefind-meta="topics[content]" name="topics" content="${escapeHtml(topics)}">
</head>
<body>
  <main data-pagefind-body>
    <h1>${escapeHtml(record.title)}</h1>
    <div>${escapeHtml(record.text)}</div>
    <div data-pagefind-weight="3">${escapeHtml(topics)}</div>
    <div data-pagefind-weight="0.35">${escapeHtml(neighborVocabulary)}</div>
  </main>
</body>
</html>`;
};

const main = async () => {
  const [records, relatedData] = await Promise.all([
    getContentRecords(MODEL),
    readFile(RELATED_DATA_PATH, "utf8").then(JSON.parse),
  ]);
  const { index, errors: createErrors } = await pagefind.createIndex({
    forceLanguage: "en",
    verbose: false,
  });

  if (createErrors?.length)
  {
    throw new Error(createErrors.join("\n"));
  }

  for (const record of records)
  {
    const { errors } = await index.addHTMLFile({
      content: createSearchDocument(record, relatedData),
      url: record.url,
    });

    if (errors?.length)
    {
      throw new Error(`Could not index ${record.url}: ${errors.join("\n")}`);
    }
  }

  const { errors } = await index.writeFiles({ outputPath: OUTPUT_PATH });
  await index.deleteIndex();
  await pagefind.close();

  if (errors?.length)
  {
    throw new Error(errors.join("\n"));
  }

  console.log(`Wrote Pagefind index for ${records.length} content entries.`);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
