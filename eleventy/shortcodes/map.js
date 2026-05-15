import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import d3 from "d3";
import { parseHTML } from "linkedom";

import { getLand } from "./land.js";

const GENERATED_MAPS_DIR = path.resolve("src/_generated/maps");
const WARNING_PREFIX = "[maps]";

const getStableJson = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => getStableJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${getStableJson(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const getMapArtifactName = (input, name) => {
  if (name) {
    return `${name}.svg`;
  }

  return `${crypto
    .createHash("sha256")
    .update(getStableJson(input))
    .digest("hex")
    .slice(0, 8)}.svg`;
};

export const getMapArtifactPath = (input, name) => {
  return path.join(GENERATED_MAPS_DIR, getMapArtifactName(input, name));
};

export const renderMap = (input) => {
  const pinsGeojson = input;

  const width = 768;
  const height = 300;
  const margin = 120;
  const singleScale = 800;

  const window = parseHTML("<html><body></body></html>");
  const body = d3.select(window.document).select("body");
  const svg = body
    .append("svg")
    .classed("map", true)
    .attr("viewBox", `0 0 ${width} ${height}`);

  const projection = d3.geoEqualEarth();

  // Correct for https://github.com/d3/d3-geo/issues/237.
  if (pinsGeojson.features.length === 1) {
    const pin = pinsGeojson.features[0];
    projection
      .center(pin.geometry.coordinates)
      .scale(singleScale)
      .translate([width / 2, height / 2]);
  } else {
    projection.fitExtent(
      [
        [margin, margin],
        [width - margin, height - margin],
      ],
      pinsGeojson,
    );
  }

  const pathGenerator = d3.geoPath(projection);

  const landGeojson = getLand();

  svg
    .selectAll("path")
    .data(landGeojson.features)
    .enter()
    .append("path")
    .attr("d", pathGenerator)
    .attr("fill", "silver");

  // N.B. projection expects long, lat.
  if (pinsGeojson) {
    svg
      .selectAll(".pin")
      .data(pinsGeojson.features)
      .enter()
      .append("circle")
      .classed("pin", true)
      .attr("r", 8)
      .attr("transform", (feature) => {
        return `translate(${projection(feature.geometry.coordinates)})`;
      });
  }

  return body.html();
};

export const map = (input, name) => {
  const artifactPath = getMapArtifactPath(input, name);

  if (fs.existsSync(artifactPath)) {
    return fs.readFileSync(artifactPath, "utf8");
  }

  console.warn(
    `${WARNING_PREFIX} Missing generated map asset ${path.relative(process.cwd(), artifactPath)}; generating during build. Run npm run generate:maps and commit the result to avoid this cost during deployment.`,
  );

  const output = renderMap(input);

  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, output);

  return output;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.error("Use npm run generate:maps to generate map assets.");
  process.exit(1);
}
