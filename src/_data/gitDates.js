import { generateGitDates } from "../../scripts/git-dates.mjs";

export default async () =>
{
  const metadata = await generateGitDates();
  return metadata.created;
};
