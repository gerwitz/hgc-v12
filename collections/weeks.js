// every. single. week.

const moment = require("moment");

module.exports = function(collection) {
  var weeknotes = collection.getFilteredByTag('weeknotes');
  const genesis = moment([1974, 2, 4]); // == moment([1974, 2, 9]).startOf('isoWeek');
  var current = moment().diff(genesis, 'weeks');

  // create a hashtable of default weeks
  var emptyWeeks = new Map();
  for (var i = 0; i < current; i++) {
    emptyWeeks.set(i, {
      fileSlug: i.toString(),
      url: '/weeks/'+i+'/',
      templateContent: '<p><em>There are no comments for this week.</em></p>'
    });
  }

  // merge that hashtable with the collection from the filesystem
  // thanks to https://stackoverflow.com/a/26265095/5610
  var populatedWeeks = weeknotes.reduce(function(map, item) {
    item.url = '/weeks/'+item.fileSlug + '/.';
    map.set(1*item.fileSlug, item);
    return map;
  }, emptyWeeks);

  // overwrite current week to hide notes-in-progress
  populatedWeeks.set(current, {
    fileSlug: current.toString(),
    url: '/weeks/'+current+'/',
    templateContent: '<p>This week has not concluded. Maybe you want <a href="/weeks/'+(current-1)+'/">last week</a>.</p>'
  });

  return Array.from(populatedWeeks.values());
};
