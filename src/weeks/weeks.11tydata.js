import moment from "moment";

import { genesisMoment } from "../../eleventy/week.js";

const isAuthoredWeeknote = (data) => data.page.inputPath.endsWith(".md");

const getWeekNumber = (data) => Number(data.page.fileSlug);

export default {
  layout: "week",
  tags: ["weeknotes", "searchable"],
  eleventyComputed: {
    title: (data) => {
      if (data.week || isAuthoredWeeknote(data)) {
        const weekNumber = data.week?.weeknum ?? getWeekNumber(data);
        return `Week ${weekNumber}`;
      }

      return data.title;
    },
    permalink: (data) => {
      if (data.week || isAuthoredWeeknote(data)) {
        const weekSlug = data.week?.fileSlug || data.page.fileSlug;
        return `/weeks/${weekSlug}/`;
      }

      return data.permalink;
    },
    week: (data) => {
      if (data.week || !isAuthoredWeeknote(data)) {
        return data.week;
      }

      const weekNumber = getWeekNumber(data);
      const currentWeek = moment().diff(genesisMoment(), "weeks");

      return {
        current: weekNumber === currentWeek,
        weeknum: weekNumber,
        fileSlug: data.page.fileSlug,
        date: data.page.date,
      };
    },
  },
};
