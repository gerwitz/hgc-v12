// const stringify = require('javascript-stringify').stringify;

export const json = (string) => {
  return JSON.stringify(string, null, "\t");
}
