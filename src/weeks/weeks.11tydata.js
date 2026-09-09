import moment from "moment";

import { genesisMoment } from "../../eleventy/week.js";

const isIndexPage = (data) => data.page.filePathStem.endsWith("/index");

const getWeekNumber = (data) => Number(data.page.fileSlug);

export default {
  layout: "week",
  tags: ["weeknotes", "searchable"],
  eleventyComputed: {
    title: (data) => {
      if (isIndexPage(data)) {
        return data.title;
      }

      const weekNumber = data.week?.weeknum ?? getWeekNumber(data);
      return `Week ${weekNumber}`;
    },
    permalink: (data) => {
      if (isIndexPage(data)) {
        return data.permalink;
      }

      const weekSlug = data.week?.fileSlug || data.page.fileSlug;
      return `/weeks/${weekSlug}/`;
    },
    week: (data) => {
      if (isIndexPage(data) || data.week) {
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
