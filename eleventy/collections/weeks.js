// Every week for the woven archive, whether or not it has an authored weeknote.

import moment from "moment";

import { genesisMoment, weekStartMoment } from "../week.js";

const getWeeks = (collection) => {
  const weeknotes = collection.getFilteredByTag("weeknotes");
  const currentWeek = moment().diff(genesisMoment(), "weeks");
  const weeksByNumber = new Map();

  for (let weekNumber = 0; weekNumber < currentWeek; weekNumber += 1) {
    weeksByNumber.set(weekNumber, {
      weeknum: weekNumber,
      date: weekStartMoment(weekNumber),
      fileSlug: weekNumber.toString(),
      url: `/weeks/${weekNumber}/`,
      content: "<p><em>There are no comments for this week.</em></p>",
      empty: true,
    });
  }

  for (const weeknote of weeknotes) {
    const weekNumber = Number(weeknote.fileSlug);

    weeksByNumber.set(weekNumber, {
      weeknum: weekNumber,
      date: weekStartMoment(weekNumber),
      fileSlug: weekNumber.toString(),
      url: weeknote.url,
      empty: false,
      current: weekNumber === currentWeek,
      weeknote,
    });
  }

  if (!weeksByNumber.has(currentWeek)) {
    weeksByNumber.set(currentWeek, {
      current: true,
      weeknum: currentWeek,
      date: weekStartMoment(currentWeek),
      fileSlug: currentWeek.toString(),
      url: `/weeks/${currentWeek}/`,
      content: `<p>It was still ${moment().format("dddd")} of this week when the site was last published. Maybe you want <a href="/weeks/${currentWeek - 1}/">last week</a>?</p>`,
      empty: true,
    });
  }

  return Array.from(weeksByNumber.values());
};

export const weeks = (collection) => getWeeks(collection);

export const emptyWeeks = (collection) => {
  return getWeeks(collection).filter((week) => week.empty);
};
