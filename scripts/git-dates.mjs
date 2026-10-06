import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const REPOSITORY_PATH = fileURLToPath(new URL("../", import.meta.url));
const METADATA_VERSION = 1;

const git = async (repositoryPath, arguments_) =>
{
  const { stdout } = await execute("git", ["--no-pager", ...arguments_], {
    cwd: repositoryPath,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_EDITOR: "true" },
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120000,
  });
  return stdout;
};

export const httpsRemote = (remote) =>
{
  const scp = remote.match(/^[^@]+@([^:]+):(.+)$/);
  if (scp)
  {
    return `https://${scp[1]}/${scp[2]}`;
  }
  if (remote.startsWith("ssh://"))
  {
    const url = new URL(remote);
    return `https://${url.hostname}${url.pathname}`;
  }
  return remote;
};

const needsCreationDate = (sourcePath) =>
{
  return /^src\//.test(sourcePath)
    && !/^src\/_/.test(sourcePath)
    && /\.(?:md|njk|html|11ty\.js)$/.test(sourcePath)
    // A filename date already supplies the publication date.
    && !/^\d{4}-\d{2}-\d{2}-/.test(path.posix.basename(sourcePath));
};

export const generateGitDates = async ({
  repositoryPath = REPOSITORY_PATH,
  outputPath = path.join(repositoryPath, "generated/content-dates.json"),
  logger = console,
} = {}) =>
{
  let commit;
  try
  {
    commit = (await git(repositoryPath, ["rev-parse", "HEAD"])).trim();
  }
  catch (error)
  {
    throw new Error("Cannot generate publication dates without Git history. The Docker build context must include .git.", { cause: error });
  }

  // Coolify may supply a shallow checkout. Fetch this exact commit's ancestors, not a newer branch tip.
  if ((await git(repositoryPath, ["rev-parse", "--is-shallow-repository"])).trim() === "true")
  {
    const remote = httpsRemote((await git(repositoryPath, ["remote", "get-url", "origin"])).trim());
    logger.log("Fetching complete Git history for publication dates.");
    try
    {
      await git(repositoryPath, ["fetch", "--unshallow", "--no-tags", remote, commit]);
    }
    catch
    {
      // Git's command error can contain credentials embedded in an origin URL.
      throw new Error("Cannot fetch complete Git history. Ensure the checkout's origin is reachable over HTTPS and has any required build-time credentials.");
    }
  }

  try
  {
    const cached = JSON.parse(await readFile(outputPath, "utf8"));
    if (cached.version === METADATA_VERSION && cached.commit === commit
      && cached.created && typeof cached.created === "object" && !Array.isArray(cached.created))
    {
      return cached;
    }
  }
  catch (error)
  {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError))
    {
      throw error;
    }
  }

  const files = (await git(repositoryPath, ["ls-tree", "-r", "--name-only", "-z", commit, "--", "src"]))
    .split("\0")
    .filter(needsCreationDate);
  const created = {};
  let nextIndex = 0;
  const worker = async () =>
  {
    while (nextIndex < files.length)
    {
      const sourcePath = files[nextIndex];
      nextIndex += 1;
      const history = await git(repositoryPath, [
        "log", "--follow", "--diff-filter=A", "--format=%aI", commit, "--", sourcePath,
      ]);
      const timestamp = history.trim().split("\n").at(-1);
      if (!timestamp || Number.isNaN(new Date(timestamp).getTime()))
      {
        throw new Error(`No Git creation date found for ${sourcePath}; complete history is required.`);
      }
      created[sourcePath] = timestamp;
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker));

  const metadata = {
    version: METADATA_VERSION,
    commit,
    created: Object.fromEntries(Object.entries(created).sort(([first], [second]) => first.localeCompare(second))),
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(metadata, null, 2)}\n`);
  logger.log(`Generated Git creation dates for ${files.length} undated source files.`);
  return metadata;
};

if (process.argv[1] === fileURLToPath(import.meta.url))
{
  generateGitDates().catch((error) =>
  {
    console.error(error.message);
    process.exitCode = 1;
  });
}
