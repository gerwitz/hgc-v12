const moment = require("moment");
require("twix");

module.exports = function(weeknum) {
    var start = moment([1974, 2, 4]).add(weeknum, 'weeks');
    var end = moment(start).add(6, 'days');
    var range = start.twix(end, {allDay: true});
    return range.format({hideTime: true, monthFormat: 'MMMM', implicitYear: false});
}
