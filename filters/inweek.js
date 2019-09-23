/**
 * Select items in array whose `date` property falls in week number
 */
const moment = require("moment");
const genesis = moment([1974, 2, 4]); // == moment([1974, 2, 9]).startOf('isoWeek');

module.exports = function(list, weeknum) {
    const start = moment(genesis).add(weeknum, 'weeks')
    const end = moment(start).add(6, 'days');
    return list.filter(item => {
        const date = moment(item.date);
        return date.isBetween(start, end);
    });
};
