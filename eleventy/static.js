const passthroughGlobs = [
  "src/**/*.gif",
  "src/**/*.jpg",
  "src/**/*.jpeg",
  "src/**/*.png",
  "src/!(_generated)/**/*.svg",
  "src/**/*.pdf",
  "src/projects/**/*.js",
  "src/js/**/*.js",
  "src/projects/**/*.pde",
  "src/projects/**/*.json",
  "src/css/fonts/*",
];

export default function staticAssetsPlugin(eleventyConfig) {
  passthroughGlobs.forEach((pattern) => eleventyConfig.addPassthroughCopy(pattern));
  eleventyConfig.addPassthroughCopy({ "src/_meta": "/" });
}
