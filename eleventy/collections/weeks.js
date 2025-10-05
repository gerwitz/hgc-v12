// every. single. week.

import moment from "moment";

import { genesisMoment, weekStartMoment } from "../week.js";

export const weeks = (collection) => {
  const weeknotes = collection.getFilteredByTag("weeknotes");
  const currentWeek = moment().diff(genesisMoment(), "weeks");

  const allWeeks = new Map();
  for (let i = 0; i < currentWeek; i += 1) {
    allWeeks.set(i, {
      weeknum: i,
      date: weekStartMoment(i),
      fileSlug: i.toString(),
      content: "<p><em>There are no comments for this week.</em></p>",
    });
  }

  for (const template of weeknotes) {
    const weeknum = Number(template.fileSlug);
    template.weeknum = weeknum;
    allWeeks.set(weeknum, template);
  }

  allWeeks.set(currentWeek, {
    current: true,
    weeknum: currentWeek,
    fileSlug: currentWeek.toString(),
    content: `<p>It was still ${moment().format("dddd")} of this week when the site was last published. Maybe you want <a href="/weeks/${currentWeek - 1}/">last week</a>?</p>`,
  });

  return Array.from(allWeeks.values());
};
