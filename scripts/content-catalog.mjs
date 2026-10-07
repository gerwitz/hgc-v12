import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

export const CATALOG_PATH = "generated/content-metadata.json";

const execute = promisify(execFile);
const CATALOG_FIELDS = ["version", "sources", "records", "inputHash", "embeddingModel"];
const RECORD_FIELDS = [
  "inputPath", "title", "kind", "categories", "topics", "contentDate", "description",
  "previewIconName", "wordCount", "textHash", "relationshipHash", "presentationHash",
];

const isObject = (value) =>
{
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const hasExactFields = (value, fields) =>
{
  return isObject(value)
    && Object.keys(value).length === fields.length
    && fields.every((field) => Object.hasOwn(value, field));
};

const normalizePath = (inputPath) =>
{
  return inputPath.replace(/^(?:\.\/)+/, "");
};

const isRepositoryPath = (filePath) =>
{
  return typeof filePath === "string"
    && !filePath.split("/").some((segment) => !segment || segment === "." || segment === "..")
    && !filePath.includes("\\");
};

const isSourcePath = (sourcePath) =>
{
  return isRepositoryPath(sourcePath) && sourcePath.startsWith("src/");
};

const needsCreationDate = (sourcePath) =>
{
  return isSourcePath(sourcePath)
    && !sourcePath.startsWith("src/_")
    && /\.(?:md|njk|html|11ty\.js)$/.test(sourcePath)
    // Match the existing filename-date convention, not dates in parent directories.
    && !/^\d{4}-\d{2}-\d{2}-/.test(path.posix.basename(sourcePath));
};

const isIsoDate = (value, allowDateOnly = false) =>
{
  if (typeof value !== "string")
  {
    return false;
  }

  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)
    || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== datePart)
  {
    return false;
  }

  return (allowDateOnly && value === datePart)
    || (/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)
      && !Number.isNaN(new Date(value).getTime()));
};

const isNullableString = (value) =>
{
  return value === null || typeof value === "string";
};

const isStringArray = (value) =>
{
  return Array.isArray(value) && value.every((item) => typeof item === "string");
};

const validateCatalog = (catalog) =>
{
  const invalid = (detail) =>
  {
    throw new Error(`Invalid content catalog: ${detail}. Expected the version 1 schema.`);
  };

  if (!hasExactFields(catalog, CATALOG_FIELDS) || catalog.version !== 1)
  {
    invalid("unsupported version or top-level fields");
  }
  if (!isObject(catalog.sources) || !isObject(catalog.records)
    || !isNullableString(catalog.inputHash) || !isNullableString(catalog.embeddingModel))
  {
    invalid("sources, records, inputHash, or embeddingModel");
  }

  for (const [sourcePath, source] of Object.entries(catalog.sources))
  {
    if (!needsCreationDate(sourcePath) || !hasExactFields(source, ["created", "origin"])
      || !isIsoDate(source.created) || !["git", "prepared"].includes(source.origin))
    {
      invalid(`source ${sourcePath}`);
    }
  }

  for (const [url, record] of Object.entries(catalog.records))
  {
    if (!url || !hasExactFields(record, RECORD_FIELDS)
      || !isSourcePath(record.inputPath)
      || !["title", "kind", "previewIconName", "textHash", "relationshipHash", "presentationHash"]
        .every((field) => typeof record[field] === "string")
      || !isStringArray(record.categories) || !isStringArray(record.topics)
      || !(record.contentDate === null || isIsoDate(record.contentDate, true))
      || !isNullableString(record.description)
      || !(record.wordCount === null || (Number.isInteger(record.wordCount) && record.wordCount >= 0)))
    {
      invalid(`record ${url}`);
    }
  }

  return catalog;
};

export const readContentCatalog = async (filePath = CATALOG_PATH) =>
{
  let content;
  try
  {
    content = await readFile(filePath, "utf8");
  }
  catch (error)
  {
    if (error.code === "ENOENT")
    {
      throw new Error(`Missing content catalog at ${filePath}. Run npm run content:prepare.`, { cause: error });
    }
    throw error;
  }

  try
  {
    return validateCatalog(JSON.parse(content));
  }
  catch (error)
  {
    throw new Error(`Cannot read content catalog at ${filePath}: ${error.message} Run npm run content:prepare.`, { cause: error });
  }
};

export const creationDates = (catalog) =>
{
  return Object.fromEntries(Object.entries(catalog.sources).map(([sourcePath, source]) =>
  {
    return [sourcePath, source.created];
  }));
};

const sortedEntries = (object) =>
{
  return Object.entries(object).sort(([first], [second]) => first < second ? -1 : first > second ? 1 : 0);
};

const git = async (repositoryPath, arguments_) =>
{
  const { stdout } = await execute("git", [
    "--no-pager", "--no-optional-locks", "--literal-pathspecs", ...arguments_,
  ], {
    cwd: repositoryPath,
    env: { ...process.env, GIT_EDITOR: "true", GIT_TERMINAL_PROMPT: "0" },
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120000,
  });
  return stdout.trim();
};

export const prepareCatalogSources = async ({
  repositoryPath,
  sourcePaths,
  renames = {},
  committedCatalog = null,
  now = new Date().toISOString(),
}) =>
{
  if (!Array.isArray(sourcePaths) || !sourcePaths.every((sourcePath) => typeof sourcePath === "string")
    || !isObject(renames) || !Object.values(renames).every((sourcePath) => typeof sourcePath === "string")
    || !isIsoDate(now))
  {
    throw new Error("Cannot prepare content sources: sourcePaths, renames, or now is invalid.");
  }
  if (committedCatalog !== null)
  {
    validateCatalog(committedCatalog);
  }

  const sources = {};
  const pending = [];
  const renamePaths = Object.fromEntries(Object.entries(renames).map(([newPath, oldPath]) =>
  {
    return [normalizePath(newPath), normalizePath(oldPath)];
  }));
  const paths = Array.from(new Set(sourcePaths.map(normalizePath))).filter(needsCreationDate).sort();

  for (const sourcePath of paths)
  {
    // A staged rename carries the old source's identity, even if its destination existed before.
    const historyPath = Object.hasOwn(renamePaths, sourcePath) ? renamePaths[sourcePath] : sourcePath;
    if (!isRepositoryPath(historyPath))
    {
      throw new Error(`Cannot prepare content sources: invalid rename path for ${sourcePath}.`);
    }
    const preserved = committedCatalog?.sources[historyPath];
    if (preserved)
    {
      sources[sourcePath] = { created: preserved.created, origin: preserved.origin };
    }
    else
    {
      pending.push({ sourcePath, historyPath });
    }
  }

  if (pending.length === 0)
  {
    return Object.fromEntries(sortedEntries(sources));
  }
  if (typeof repositoryPath !== "string" || !repositoryPath)
  {
    throw new Error("Cannot prepare content creation dates without a Git repository path.");
  }

  let shallow;
  let head;
  try
  {
    shallow = await git(repositoryPath, ["rev-parse", "--is-shallow-repository"]) === "true";
    try
    {
      head = await git(repositoryPath, ["rev-parse", "--verify", "--quiet", "HEAD"]);
    }
    catch (error)
    {
      // An unborn repository can still prepare its first staged sources.
      if (error.code !== 1)
      {
        throw error;
      }
      head = null;
    }
  }
  catch (error)
  {
    throw new Error("Cannot prepare content creation dates without readable Git history.", { cause: error });
  }

  for (const { sourcePath, historyPath } of pending)
  {
    let history = "";
    if (head)
    {
      try
      {
        history = await git(repositoryPath, [
          "log", "--follow", "--diff-filter=A", "--format=%aI", head, "--", historyPath,
        ]);
      }
      catch (error)
      {
        throw new Error(`Cannot read Git creation history for ${sourcePath}.`, { cause: error });
      }
    }

    if (history)
    {
      // Shallow roots look like additions; never publish their boundary date as creation.
      if (shallow)
      {
        throw new Error(`Cannot determine the Git creation date for ${sourcePath} from shallow history. Full Git history is required; unshallow the checkout before npm run content:prepare.`);
      }
      const created = history.split("\n").at(-1);
      if (!isIsoDate(created))
      {
        throw new Error(`Invalid Git creation date for ${sourcePath}; complete history is required.`);
      }
      sources[sourcePath] = { created, origin: "git" };
    }
    else
    {
      // Deliberately ignore any working-tree or staged catalog from a failed preparation.
      sources[sourcePath] = { created: now, origin: "prepared" };
    }
  }

  return Object.fromEntries(sortedEntries(sources));
};

export const buildContentCatalog = ({
  sources = {},
  records = [],
  inputHash = null,
  embeddingModel = null,
} = {}) =>
{
  if (!Array.isArray(records) || !isObject(sources))
  {
    throw new Error("Cannot build content catalog: sources must be an object and records must be an array.");
  }

  const metadataByUrl = new Map();
  for (const record of records)
  {
    if (!isObject(record) || typeof record.url !== "string" || !record.url)
    {
      throw new Error("Cannot build content catalog: each record needs a canonical URL.");
    }
    if (metadataByUrl.has(record.url))
    {
      throw new Error(`Cannot build content catalog: duplicate canonical URL ${record.url}.`);
    }

    // Whitelist metadata; bodies, embedding inputs, and vectors must stay out of the catalog.
    const metadata = Object.fromEntries(RECORD_FIELDS.map((field) => [field, record[field]]));
    if (typeof metadata.inputPath === "string")
    {
      metadata.inputPath = normalizePath(metadata.inputPath);
    }
    if (metadata.contentDate instanceof Date)
    {
      metadata.contentDate = metadata.contentDate.toISOString();
    }
    metadataByUrl.set(record.url, metadata);
  }

  return validateCatalog({
    version: 1,
    sources: Object.fromEntries(sortedEntries(sources).map(([sourcePath, source]) =>
    {
      return [sourcePath, { created: source.created, origin: source.origin }];
    })),
    records: Object.fromEntries(sortedEntries(Object.fromEntries(metadataByUrl))),
    inputHash,
    embeddingModel,
  });
};
