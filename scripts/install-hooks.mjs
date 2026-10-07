import { execFile } from "node:child_process";
import { chmod, lstat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const HOOKS = ["pre-commit", "pre-push"];

const exists = async (filePath) =>
{
  try
  {
    await lstat(filePath);
    return true;
  }
  catch (error)
  {
    if (error.code === "ENOENT")
    {
      return false;
    }
    throw error;
  }
};

export const installHooks = async ({ repositoryPath = ROOT, logger = console } = {}) =>
{
  // Docker dependency installation intentionally has neither repository sources nor Git.
  if (!await exists(path.join(repositoryPath, ".git")))
  {
    return { installed: false };
  }
  let current;
  try
  {
    const { stdout } = await execute("git", ["config", "--get", "core.hooksPath"], { cwd: repositoryPath });
    current = stdout.trim();
  }
  catch (error)
  {
    if (error.code !== 1)
    {
      throw error;
    }
  }
  if (current && path.resolve(repositoryPath, current) !== path.join(repositoryPath, ".githooks"))
  {
    logger.warn(`Existing Git hooksPath is preserved: ${current}. Chain this repository's hooks into your existing hooks to enable preparation.`);
    return { installed: false };
  }
  if (!current)
  {
    const { stdout } = await execute("git", ["rev-parse", "--path-format=absolute", "--git-path", "hooks"], { cwd: repositoryPath });
    for (const hook of [...HOOKS, "post-commit"])
    {
      if (await exists(path.join(stdout.trim(), hook)))
      {
        logger.warn(`Existing ${hook} hook is preserved. Chain this repository's hooks into your existing hooks to enable preparation.`);
        return { installed: false };
      }
    }
  }
  for (const hook of HOOKS)
  {
    await chmod(path.join(repositoryPath, ".githooks", hook), 0o755);
  }
  await execute("git", ["config", "--local", "core.hooksPath", ".githooks"], { cwd: repositoryPath });
  logger.log("Installed content preparation Git hooks.");
  return { installed: true };
};

if (process.argv[1] === fileURLToPath(import.meta.url))
{
  installHooks().catch((error) =>
  {
    console.error(error.message);
    process.exitCode = 1;
  });
}
