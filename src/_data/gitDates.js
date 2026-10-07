import { creationDates, readContentCatalog } from "../../scripts/content-catalog.mjs";

export default async () =>
{
  try
  {
    const catalog = await readContentCatalog(new URL("../../generated/content-metadata.json", import.meta.url));
    return creationDates(catalog);
  }
  catch (error)
  {
    console.warn(`Content catalog unavailable; using build-time date fallbacks. ${error.message}`);
    return {};
  }
};
