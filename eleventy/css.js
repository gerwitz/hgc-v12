import fs from "fs";
import path from "path";
import crypto from "crypto";

import browserslist from "browserslist";
import { browserslistToTargets, bundleAsync } from "lightningcss";

const BROWSER_QUERY = "> 0.2% and not dead";
const manifest = new Map();

function toPosixPath(filePath)
{
  return filePath.split(path.sep).join("/");
}

function collectCssEntries(rootDirectory)
{
  const entries = [];
  if (!fs.existsSync(rootDirectory))
  {
    return entries;
  }

  const stack = [rootDirectory];
  while (stack.length > 0)
  {
    const currentDirectory = stack.pop();
    const directoryEntries = fs.readdirSync(currentDirectory, { withFileTypes: true });

    for (const entry of directoryEntries)
    {
      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory())
      {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && path.extname(entry.name) === ".css" && !entry.name.startsWith("_"))
      {
        entries.push(entryPath);
      }
    }
  }

  return entries;
}

function removeStaleBundles(targetDirectory, baseName)
{
  if (!fs.existsSync(targetDirectory))
  {
    return;
  }

  const pattern = new RegExp(`^${baseName}\\.[a-f0-9]{8}\\.css$`);
  for (const fileName of fs.readdirSync(targetDirectory))
  {
    if (pattern.test(fileName))
    {
      fs.rmSync(path.join(targetDirectory, fileName), { force: true });
      const sourceMapPath = path.join(targetDirectory, `${fileName}.map`);
      if (fs.existsSync(sourceMapPath))
      {
        fs.rmSync(sourceMapPath, { force: true });
      }
    }
  }
}

async function buildCssBundles({ cssRoot, outputDir, generateSourceMaps })
{
  manifest.clear();

  const targets = browserslistToTargets(browserslist(BROWSER_QUERY));
  const entries = collectCssEntries(cssRoot);

  for (const inputPath of entries)
  {
    const parsed = path.parse(inputPath);
    const relativeDirectory = toPosixPath(path.relative(cssRoot, parsed.dir));
    const outputDirectory = relativeDirectory ? `css/${relativeDirectory}` : "css";
    const outputDirectoryOnDisk = path.join(outputDir, outputDirectory);

    try
    {
      const { code, map } = await bundleAsync({
        filename: inputPath,
        minify: true,
        sourceMap: generateSourceMaps,
        targets,
        include: 1,
        resolver:
        {
          read(file)
          {
            return fs.readFileSync(file, "utf8");
          },
          resolve(specifier, from)
          {
            return path.resolve(path.dirname(from), specifier);
          },
        },
        drafts:
        {
          nesting: true,
        },
      });

      const hash = crypto.createHash("sha256").update(code).digest("hex").slice(0, 8);
      const hashedFileName = `${parsed.name}.${hash}.css`;
      const outputPathRelative = `${outputDirectory}/${hashedFileName}`;
      const fullOutputPath = path.join(outputDir, outputPathRelative);

      fs.mkdirSync(path.dirname(fullOutputPath), { recursive: true });
      removeStaleBundles(outputDirectoryOnDisk, parsed.name);
      fs.writeFileSync(fullOutputPath, code);

      if (generateSourceMaps && map)
      {
        fs.writeFileSync(`${fullOutputPath}.map`, map);
      }

      const manifestKey = `css/${relativeDirectory ? `${relativeDirectory}/` : ""}${parsed.base}`;
      manifest.set(`/${toPosixPath(manifestKey)}`, `/${toPosixPath(outputPathRelative)}`);
    }
    catch (error)
    {
      console.error(`Error processing CSS file ${inputPath}:`, error);
    }
  }
}

export default function cssPlugin(eleventyConfig, options = {})
{
  const { inputDir = "src", outputDir = "_site" } = options;
  const cssRoot = path.join(process.cwd(), inputDir, "css");
  const generateSourceMaps = process.env.ELEVENTY_ENV !== "production";

  eleventyConfig.addWatchTarget(`./${inputDir}/css/`);

  eleventyConfig.on("eleventy.before", async () =>
  {
    await buildCssBundles({ cssRoot, outputDir, generateSourceMaps });
  });

  eleventyConfig.addGlobalData("assetPaths", () =>
  {
    return {
      css: Object.fromEntries(manifest),
    };
  });
}
