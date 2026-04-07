import NunjucksLib from"nunjucks";
import moment from "moment";
import from from "twix";

// Format a date for use in templates.
// format: 'iso8601' → ISO string; 'nice' → <time> element with "Month Dth, YYYY";
//         'weekstarted' → <time> element with week date range; otherwise any moment.js format string.
export const date = (date, format) => {
  var theDate = moment(date);
  if( format === 'iso8601' ) {
    return theDate.toISOString();
  } else if( format === 'nice' ) {
    var formatted = '<time datetime="' + theDate.toISOString() + '"';
    // if (kwargs.class) {
    //   formatted +' class="' + kwargs.class + '"';
    // }
    formatted += '>' + theDate.format('MMMM Do, YYYY') + '</time>';
    return new NunjucksLib.runtime.SafeString(formatted);
  } else if( format === 'weekstarted' ) {
    var end = moment(theDate).add(6, 'days');
    var range = theDate.twix(end, {allDay: true});
    var formatted = '<time datetime="' + theDate.format('YYYY[W]WW') + '"';
    // if (kwargs.class) {
    //   formatted +' class="' + kwargs.class + '"';
    // }
    formatted += '>' + range.format({hideTime: true, monthFormat: 'MMMM', dayFormat: 'Do', implicitYear: false}) + '</time>';
    return new NunjucksLib.runtime.SafeString(formatted);
  } else {
    return theDate.format(format);
  }
}
