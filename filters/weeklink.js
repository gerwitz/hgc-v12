const moment = require("moment");
const genesis = moment([1974, 2, 9]).startOf('isoWeek');

module.exports = function(date) {
  thisweek = moment(date).startOf('isoWeek');
  weeknum = thisweek.diff(genesis, 'weeks');
  return '<a href="/weeks/'+weeknum+'.html">'+weeknum+'</a>';
}