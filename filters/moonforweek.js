import NunjucksLib from "nunjucks"; // for SafeString

import moment from "moment";

const genesis = moment([1974, 2, 4]); // == start of ISO week
const moonPhase = 2551443; // == seconds in a lunar phase
const moonAtGenesis = 1210000; // == approx moon age in seconds on genesis
const moonChars = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘']; // northern hemisphere

export const moonforweek = (weeknum) => {
  var thisThursday = moment(genesis).add(weeknum, 'weeks').isoWeekday(4);
  var seconds = thisThursday.diff(genesis, 'seconds');
  var thisMoon = (seconds + moonAtGenesis) % moonPhase;
  var thisPhase = Math.floor((thisMoon / moonPhase) * 8);

  return new NunjucksLib.runtime.SafeString(moonChars[thisPhase]);
}
