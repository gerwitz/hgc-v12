import moment from "moment";

export const weeklyEvents = (collection) => {
  const genesis = moment([1974, 2, 4]); // == moment([1974, 2, 9]).startOf('isoWeek');
  var weeklyEvents = {};

  collection.getFilteredByTag('events').forEach(function(item) {
    var itemWeek = moment(item.date).startOf('isoWeek');
    var weekNum = itemWeek.diff(genesis, 'weeks');

    if (weekNum in weeklyEvents) {
      weeklyEvents[weekNum].push(item);
    } else {
      weeklyEvents[weekNum] = [item];
    }
  });

  return weeklyEvents;
};
