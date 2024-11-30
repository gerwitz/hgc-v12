import moment from "moment";
const genesis = moment([1974, 2, 4]); // == moment([1974, 2, 9]).startOf('isoWeek');
import NunjucksLib from "nunjucks";

export const weeklink = (date) => {
  if (date instanceof Date) {
    thisweek = moment(date).startOf('isoWeek');
    weeknum = thisweek.diff(genesis, 'weeks');
  } else { // assume it's a number
    weeknum = parseInt(date);
  }
  return new NunjucksLib.runtime.SafeString('<a href="/weeks/'+weeknum+'/" class="weeklink">week '+weeknum+'</a>');
}
