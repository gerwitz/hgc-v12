const moment = require("moment");

module.exports = function() {
  var weeksByYear = new Map();

  const genesis = moment([1974, 2, 4]); // == moment([1974, 2, 9]).startOf('isoWeek');
  var year = genesis.year();
  var currentYear = moment().year();
  var currentWeek = moment().diff(genesis, 'weeks');

  let firstYearWeeks = moment(year).isoWeeksInYear();
  let lastWeekInFirstYear = firstYearWeeks - genesis.isoWeek();
  let firstWeekInYear = genesis.isoWeek();
  let preWeeks = Array(firstWeekInYear).fill(null);
  let firstWeeks = preWeeks.concat(Array.from({length:(lastWeekInFirstYear)},(e,i)=>i+0));
 weeksByYear.set(year, firstWeeks);
// weeksByYear.set(year, Array.from({length:(lastWeekInFirstYear)},(e,i)=>i+0));

  year++;
  var weekCursor = lastWeekInFirstYear;
  for (; year < currentYear; year++) {
    let totalWeeks = moment(year).isoWeeksInYear() - 1;

    console.log(year, totalWeeks, weekCursor);

    console.log(year, totalWeeks, weekCursor);

    let weeks = Array.from({length:totalWeeks},(e,i)=>i+weekCursor);
    weekCursor += totalWeeks;
    weeksByYear.set(year, weeks);
  }

  console.log(currentWeek, weekCursor);

  let remainder = currentWeek - weekCursor;

  console.log(currentYear, remainder);

  let lastWeeks = Array.from({length:remainder},(e,i)=>i+weekCursor)
  weeksByYear.set(currentYear, lastWeeks);

  return weeksByYear;
}
