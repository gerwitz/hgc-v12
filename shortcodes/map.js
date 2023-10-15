const linkedom = require('linkedom');
const d3 = require('d3');
const fs = require('fs');

module.exports = function(input) {

  try {
    var pins = JSON.parse(input);
  }
  catch (e) {
    console.log("Error with map JSON", this.page.inputPath, input);
    return "";
  }

  const width = 960;
  const height = 600;

  let window = linkedom.parseHTML("<html><body></body></html>");
  let body = d3.select(window.document).select('body');
  const svg = body.append('svg')
    .classed('map', true)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const projection = d3.geoEqualEarth()
    .scale(100)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath(projection);

  // console.log(fs.readFileSync('shortcodes/land-110m.json'));

  var geojson = JSON.parse(fs.readFileSync('shortcodes/land.geojson'));

  // console.log("Fatures ", typeof(geojson.features));

  svg.selectAll('path')
    .data(geojson.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('fill', 'silver');

  // N.B. projection expects long, lat
  if (pins) {
    svg.selectAll(".pin")
      .data(pins)
      .enter().append("circle")
      .classed('pin', true)
      .attr("r", 8)
      .attr("transform", function(d) {
        return "translate(" + projection([
          d[1],
          d[0]
        ]) + ")";
      });
  }
  // console.log("svg html", svg.html());

  return body.html();
};
