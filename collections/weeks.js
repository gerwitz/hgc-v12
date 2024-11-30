// every. single. week.

import moment from "moment";

export const weeks = (collection) => {
  // module.exports = function(collection) {
  var weeknotes = collection.getFilteredByTag('weeknotes');
  const genesis = moment([1974, 2, 4]); // == moment([1974, 2, 9]).startOf('isoWeek');
  var current = moment().diff(genesis, 'weeks');

  // create a hashtable of default weeks
  var allWeeks = new Map();
  for (var i = 0; i < current; i++) {
    allWeeks.set(i, {
      weeknum: i,
      date: genesis.add(i, 'weeks'),
      fileSlug: i.toString(),
      content: '<p><em>There are no comments for this week.</em></p>',
    });
  }

  // overwrite with weeknotes templates
  for (const template of weeknotes) {
    var weeknum = 1 * template.fileSlug;
    // restore weeknum property
    template.weeknum = weeknum;
    allWeeks.set(weeknum, template);
  }

  // TODO: we could proatively weave in other collections, instead of maintaining the awkward weeknum hashmaps

  // overwrite current week to hide notes-in-progress
  allWeeks.set(current, {
    current: true,
    weeknum: current,
    fileSlug: current.toString(),
    content: '<p>It was still '+moment().format('dddd')+' of this week when the site was last published. Maybe you want <a href="/weeks/'+(current-1)+'/">last week</a>?</p>'
  });

  return Array.from(allWeeks.values());
};
