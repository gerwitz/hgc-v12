import cleanCSS from "clean-css";

export const cssmin = (code) => {
  return new cleanCSS({}).minify(code).styles;
};
