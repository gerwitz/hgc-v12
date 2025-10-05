import { weekNumberFromDate } from "../eleventy/week.js";

export const weeklyWriting = (collection) => {
  const writingByWeek = {};

  collection.getFilteredByTag("writing").forEach((item) => {
    const weekNum = weekNumberFromDate(item.date);

    if (weekNum in writingByWeek) {
      writingByWeek[weekNum].push(item);
    } else {
      writingByWeek[weekNum] = [item];
    }
  });

  return writingByWeek;
};
