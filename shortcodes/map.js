const linkedom = require('linkedom');
const d3 = require('d3');
const fs = require('fs');

module.exports = function(input) {

  try {
    var pins_geojson = JSON.parse(input);
  }
  catch (e) {
    console.log("Error with map JSON", this.page.inputPath, input);
    return "";
  }

  const width = 768;
  const height = 300;
  const margin = 120;
  const singleScale = 800;

  let window = linkedom.parseHTML("<html><body></body></html>");
  let body = d3.select(window.document).select('body');
  const svg = body.append('svg')
    .classed('map', true)
    .attr('viewBox', `0 0 ${width} ${height}`);

  var projection = d3.geoEqualEarth();

  // correcting for https://github.com/d3/d3-geo/issues/237
  if (pins_geojson.features.length == 1) {
    let pin = pins_geojson.features[0];
    projection
      .center(pin.geometry.coordinates)
      .scale(singleScale)
      .translate([width / 2, height / 2]);
  } else {
    projection
      .fitExtent([[margin,margin],[width-margin,height-margin]], pins_geojson);
  }

  const path = d3.geoPath(projection);

  var land_geojson = JSON.parse(fs.readFileSync('shortcodes/land.geojson'));

  svg.selectAll('path')
    .data(land_geojson.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('fill', 'silver');

  // N.B. projection expects long, lat
  if (pins_geojson) {
    svg.selectAll(".pin")
    .data(pins_geojson.features)
    .enter().append("circle")
    .classed('pin', true)
    .attr("r", 8)
    .attr("transform", function(d) {
      return "translate(" + projection(d.geometry.coordinates) + ")";
    });
  }

  return body.html();
};
