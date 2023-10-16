module.exports = {
  "layout" : "trip",
  "tags" : ["trips"],
  "eleventyComputed" : {
    "geojson" : data => {
      var geojson = {
        type: "FeatureCollection",
        features: []
      };
      try {
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
      } catch {
        console.log("Error in destinations", data.page.inputPath);
      }
      return geojson;
    }
  }
};
