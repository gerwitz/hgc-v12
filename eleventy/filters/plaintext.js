import { parseHTML } from "linkedom";

export const plaintext = (value) => {
  const { document } = parseHTML(`<html><body>${String(value ?? "")}</body></html>`);
  return document.body.textContent;
};
