// pages with an confession

export const confessions = (collection) => {
  var pages = collection.getAll();
  var confessions = pages
    .filter(function(item) {
      return !!(item.data.confession) && !(item.data.excludeFromFeed);
    });

  confessions.sort(function(a, b) {
      return (a.date - b.date);
    });

  return confessions;
};
