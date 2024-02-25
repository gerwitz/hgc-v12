const linkedom = require('linkedom');
const d3 = require('d3');
const h3 = require('h3-js');
const fs = require('fs');

module.exports = function(input) {

  var pins = input;

  const width = 768;
  const height = 384;

  const h3_resolution = 2;

  let window = linkedom.parseHTML("<html><body></body></html>");
  let body = d3.select(window.document).select('body');
  const svg = body.append('svg')
    .classed('map', true)
    .attr('viewBox', `0 0 ${width} ${height}`);

  var projection = d3.geoEqualEarth();
  var pathProjection = d3.geoPath(projection);

  var land_geojson = JSON.parse(fs.readFileSync('shortcodes/land.geojson'));

  projection.fitExtent([[0,0],[width,height]], land_geojson);

  svg.append('g')
    .attr('class', 'basemap')
    .selectAll('path')
    .data(land_geojson.features)
    .enter()
    .append('path')
    .attr('d', pathProjection)
    .attr('fill', 'silver');

  var cells = Map.groupBy(pins, (d) => h3.latLngToCell(...d.latlng, h3_resolution));

  var hexes = [];
  cells.forEach( (pins, cell) =>
    hexes.push({
      index: cell,
      // geojson: h3ToFeature(cell),
      projected_path: h3ToPath(cell, projection),
      nights: pins.reduce((n, {nights}) => n+ nights, 0),
      title: pins.length + " trips",
      slugs: pins.map((p) => p.trip)
    })
  );


  var nullProjection = d3.geoPath(null);

  if(hexes) {
    const backhex = svg.append("g")
    .classed("footprint", true)
    .selectAll("path")
    .data(hexes)
    .enter()
      .append("path")
      .classed('h3cell', true)
      .attr("data-nights", (d) => d.nights)
      .style("fill-opacity", (d) => d.nights/7)
      .attr("d", (d) => d.projected_path)
        .append("title")
        .text((d) => d.title)
  }

  return body.html();
};

/*
// from https://github.com/uber/geojson2h3
function h3ToFeature(h3Index, properties = {}) {
  const coordinates = h3.cellToBoundary(h3Index, true);

  // console.log(h3Index, " coordinates: ", coordinates);

  return {
      type: 'Feature',
      id: h3Index,
      properties,
      geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
      }
  };
}
*/

function h3ToPath(h3Index, projection) {
  const coordinates = h3.cellToBoundary(h3Index);

  // inspired by https://observablehq.com/d/9dc48b233ed553f4
  let path = `M${coordinates.map((d) => projection([d[1], d[0]])).join("L")}Z`;

  return path;
}
