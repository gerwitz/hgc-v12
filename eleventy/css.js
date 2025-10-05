import fs from "fs";
import path from "path";

import browserslist from "browserslist";
import { browserslistToTargets, bundleAsync } from "lightningcss";

const BROWSER_QUERY = "> 0.2% and not dead";

export default function cssPlugin(eleventyConfig, options = {}) {
  const { inputDir = "src" } = options;
  eleventyConfig.addWatchTarget(`./${inputDir}/css/`);

  eleventyConfig.addTemplateFormats("css");
  eleventyConfig.addExtension("css", {
    outputFileExtension: "css",
    compile: async function compile(inputContent, inputPath) {
      const parsed = path.parse(inputPath);
      if (parsed.name.startsWith("_")) {
        return undefined;
      }

      const targets = browserslistToTargets(browserslist(BROWSER_QUERY));

      return async () => {
        try {
          const { code } = await bundleAsync({
            filename: inputPath,
            minify: true,
            sourceMap: false,
            targets,
            include: 1,
            resolver: {
              read(file) {
                try {
                  return fs.readFileSync(file, "utf8");
                } catch (err) {
                  console.error(`Failed to read CSS file: ${file}`, err);
                  throw err;
                }
              },
              resolve(specifier, from) {
                try {
                  return path.resolve(path.dirname(from), specifier);
                } catch (err) {
                  console.error(
                    `Failed to resolve CSS import: ${specifier} from ${from}`,
                    err,
                  );
                  throw err;
                }
              },
            },
            drafts: {
              nesting: true,
            },
          });

          return code.toString();
        } catch (err) {
          console.error(`Error processing CSS file ${inputPath}:`, err);
          return inputContent;
        }
      };
    },
  });
}
