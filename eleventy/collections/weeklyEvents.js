import { weekNumberFromDate } from "../week.js";

export const weeklyEvents = (collection) => {
  const eventsByWeek = {};

  collection.getFilteredByTag("events").forEach((item) => {
    const weekNum = weekNumberFromDate(item.date);

    if (weekNum in eventsByWeek) {
      eventsByWeek[weekNum].push(item);
    } else {
      eventsByWeek[weekNum] = [item];
    }
  });

  return eventsByWeek;
};
