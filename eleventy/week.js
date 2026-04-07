import moment from "moment";

// Weeks are numbered from Hans's birthdate (the "genesis"). Week 0 starts Monday 1974-03-04.
const GENESIS_DATE = [1974, 2, 4];

export const genesisMoment = () => moment(GENESIS_DATE);

// Returns the week number (integer, 0-based from genesis) for a given date.
export const weekNumberFromDate = (date) => {
  return moment(date).startOf("isoWeek").diff(genesisMoment(), "weeks");
};

// Returns a moment for the Monday that starts week number n.
export const weekStartMoment = (weekNumber) => {
  return genesisMoment().add(weekNumber, "weeks");
};

// Returns a moment for the Thursday of week number n (used to determine ISO year for URL paths).
export const isoThursdayForWeek = (weekNumber) => {
  return weekStartMoment(weekNumber).isoWeekday(4);
};
