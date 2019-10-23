const moment = require("moment");

module.exports = function(collection) {
  const genesis = moment([1974, 2, 4]); // == moment([1974, 2, 9]).startOf('isoWeek');
  var notesByWeek = {};

  collection.getFilteredByTag('notes').forEach(function(item) {
    var itemWeek = moment(item.date).startOf('isoWeek');
    var weekNum = itemWeek.diff(genesis, 'weeks');

    if (weekNum in notesByWeek) {
      notesByWeek[weekNum].push(item);
    } else {
      notesByWeek[weekNum] = [item];
    }
  });

  return notesByWeek;
};
