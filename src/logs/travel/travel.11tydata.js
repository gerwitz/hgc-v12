export default {
  "layout" : "trip",
  "tags" : ["trips"],
  "eleventyComputed" : {
    "pins" : data => {
      var pins = [];
      try {
        // dumb hack for index because this is both a "directory data file" and a "template data file"
        if (data.page.fileSlug == "travel") {
          for (const trip of data.collections.trips) {
            for (const dest of trip.data.destinations) {
              if (dest.geo) {
                pins.push({
                  where: dest.location + ' in ' + dest.title,
                  latlng: dest.geo,
                  nights: dest.nights,
                  trip: trip.page.fileSlug,
                  title: trip.data.title,
                  url: trip.url
                });
              }
            }
          };
        }
      } catch(e) {
        console.log("Error assembling pins", data.page.inputPath, e.message);
      }
      return pins;

    },
    "geojson" : data => {
      var geojson = {
        type: "FeatureCollection",
        features: []
      };
      try {
        // dumb hack for index because this is both a "directory data file" and a "template data file"
        if (data.page.fileSlug == "travel") {
/*
          // console.log("Index page");
          // console.log("data ", data.collections);
          // console.log("Trips ", data.collections.trips);
          for (const trip of data.collections.trips) {
            // console.log("trip", trip);
            for (const dest of trip.data.destinations) {
              if (dest.geo) {
                geojson.features.push({
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [ dest.geo[1], dest.geo[0] ]
                  },
                  properties: {
                    title: trip.title,
                    url: trip.url
                  }
                });
              }
            };
          };
*/
        } else {
          for (const dest of data.destinations) {
            if (dest.geo) {
              geojson.features.push({
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [ dest.geo[1], dest.geo[0] ]
                },
                properties: {
                  title: dest.title,
                  location: dest.location,
                  nights: dest.nights
                }
              });
            }
          };
        }
      } catch(e) {
        console.log("Error in destinations", data.page.inputPath, e.message);
      }
      return geojson;
    }
  }
};
