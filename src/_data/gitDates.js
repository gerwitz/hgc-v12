import { creationDates, readContentCatalog } from "../../scripts/content-catalog.mjs";

export default async () =>
{
  const catalog = await readContentCatalog(new URL("../../generated/content-metadata.json", import.meta.url));
  return creationDates(catalog);
};
