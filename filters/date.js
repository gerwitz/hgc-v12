const moment = require("moment");

module.exports = function(date, format) {
  if( format === 'iso8601' ) {
    return moment(date).toISOString();
  } else {
    return moment(date).format(format);
  }
}
