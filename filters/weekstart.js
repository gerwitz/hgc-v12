import moment from "moment";

export const weekstart = (weeknum) => {
  const genesis = moment([1974, 2, 4]);
  return genesis.add(weeknum, 'weeks');
}
