import fs from "fs";
import path from "path";

let cachedLand;

export const getLand = () => {
  if (!cachedLand) {
    const landPath = path.join(new URL("./land.geojson", import.meta.url).pathname);
    const contents = fs.readFileSync(landPath, "utf8");
    cachedLand = JSON.parse(contents);
  }

  return cachedLand;
};
