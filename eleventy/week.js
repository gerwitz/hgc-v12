import moment from "moment";

const GENESIS_DATE = [1974, 2, 4];

export const genesisMoment = () => moment(GENESIS_DATE);

export const weekNumberFromDate = (date) => {
  return moment(date).startOf("isoWeek").diff(genesisMoment(), "weeks");
};

export const weekStartMoment = (weekNumber) => {
  return genesisMoment().add(weekNumber, "weeks");
};

export const isoThursdayForWeek = (weekNumber) => {
  return weekStartMoment(weekNumber).isoWeekday(4);
};
