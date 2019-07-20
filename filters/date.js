const moment = require("moment");

module.exports = function(date, format) {
  if( format === 'iso8601' ) {
    return moment(date).toISOString();
  } else if( format === 'nice' ) {
    return moment(date).format('MMMM Do, YYYY');
  } else {
    return moment(date).format(format);
  }
}
