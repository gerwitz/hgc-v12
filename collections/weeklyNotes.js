import { weekNumberFromDate } from "../eleventy/week.js";

export const weeklyNotes = (collection) => {
  const notesByWeek = {};

  collection.getFilteredByTag("notes").forEach((item) => {
    const weekNum = weekNumberFromDate(item.date);

    if (weekNum in notesByWeek) {
      notesByWeek[weekNum].push(item);
    } else {
      notesByWeek[weekNum] = [item];
    }
  });

  return notesByWeek;
};
