const moment = require("moment");
const genesis = moment([1974, 2, 4]); // == moment([1974, 2, 9]).startOf('isoWeek');
const NunjucksLib = require("nunjucks");

module.exports = function(date) {
  thisweek = moment(date).startOf('isoWeek');
  weeknum = thisweek.diff(genesis, 'weeks');
  return this.env.filters.safe(weeknum);
}
