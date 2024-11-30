import moment from "moment";

export const weeklyWriting = (collection) => {
  const genesis = moment([1974, 2, 4]); // == moment([1974, 2, 9]).startOf('isoWeek');
  var weeklyWriting = {};

  collection.getFilteredByTag('writing').forEach(function(item) {
    var itemWeek = moment(item.date).startOf('isoWeek');
    var weekNum = itemWeek.diff(genesis, 'weeks');

    if (weekNum in weeklyWriting) {
      weeklyWriting[weekNum].push(item);
    } else {
      weeklyWriting[weekNum] = [item];
    }
  });

  return weeklyWriting;
};
