const moment = require("moment");

module.exports = function(weeknum) {
  const genesis = moment([1974, 2, 4]);
  return genesis.add(weeknum, 'weeks');
}
