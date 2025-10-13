import browserslist from "browserslist";
import { browserslistToTargets, transform } from "lightningcss";

const BROWSER_QUERY = "> 0.2% and not dead";
const targets = browserslistToTargets(browserslist(BROWSER_QUERY));

export const cssmin = (code) => {
  try
  {
    const { code: output } = transform({
      code: Buffer.from(code, "utf8"),
      minify: true,
      sourceMap: false,
      targets,
      drafts:
      {
        nesting: true,
      },
    });

    return output.toString();
  }
  catch (error)
  {
    console.error("Error minifying inline CSS", error);
    return code;
  }
};
