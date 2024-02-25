const linkedom = require('linkedom');
const d3 = require('d3');
const h3 = require('h3-js');
const fs = require('fs');

module.exports = function(input) {

  var pins = input;

  const width = 768;
  const height = 300;

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
      trips: pins.length
    })
  );


  var nullProjection = d3.geoPath(null);

  if(hexes) {
    const backhex = svg.append("g")
    .attr("class", "footprint")
    .selectAll("path")
    .data(hexes)
    .enter()
    .append("path")
    .classed('h3cell', true)
    .attr("data-trips", (d) => d.trips)
    // .attr("d", (d) => pathProjection(d.geojson))
    .attr("d", (d) => d.projected_path)
    .style("stroke", "#0F0")
    .style("stroke-width", 1.5)
    .style("fill", "none")
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

  console.log(h3Index, " coords: ", coordinates);

  let path = `M${coordinates.map((d) => projection([d[1], d[0]])).join("L")}Z`;

  console.log(h3Index, " path: ", path);

  return path;
}
