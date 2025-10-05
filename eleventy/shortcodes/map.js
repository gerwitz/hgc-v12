import {parseHTML} from "linkedom";
import d3 from "d3";
import fs from "fs";

export const map = (input) => {

  var pins_geojson = input;

  const width = 768;
  const height = 300;
  const margin = 120;
  const singleScale = 800;

  let window = parseHTML("<html><body></body></html>");
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

  var land_geojson = JSON.parse(fs.readFileSync('eleventy/shortcodes/land.geojson'));

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
