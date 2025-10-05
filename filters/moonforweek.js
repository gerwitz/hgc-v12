import NunjucksLib from "nunjucks";

import { genesisMoment, isoThursdayForWeek } from "../eleventy/week.js";

const moonPhase = 2551443; // == seconds in a lunar phase
const moonAtGenesis = 1210000; // == approx moon age in seconds on genesis
const moonChars = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"]; // northern hemisphere

export const moonforweek = (weeknum) => {
  const thisThursday = isoThursdayForWeek(weeknum);
  const seconds = thisThursday.diff(genesisMoment(), "seconds");
  const thisMoon = (seconds + moonAtGenesis) % moonPhase;
  const thisPhase = Math.floor((thisMoon / moonPhase) * 8);

  return new NunjucksLib.runtime.SafeString(moonChars[thisPhase]);
};
