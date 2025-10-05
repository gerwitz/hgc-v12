import NunjucksLib from "nunjucks";

import { weekNumberFromDate } from "../week.js";

export const weeklink = (dateOrWeek) => {
  const weeknum =
    dateOrWeek instanceof Date ? weekNumberFromDate(dateOrWeek) : parseInt(dateOrWeek, 10);

  return new NunjucksLib.runtime.SafeString(
    `<a href="/weeks/${weeknum}/" class="weeklink">week ${weeknum}</a>`,
  );
};
