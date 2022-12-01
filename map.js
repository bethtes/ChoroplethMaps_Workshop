// import our local data about philadelphia population by census tract
import phillyCensus from "./data/PhillyPopulation.geojson" assert { type: "json" };
console.log(phillyCensus);

// calculate population density: total pop/area
phillyCensus.features.forEach((d) => {
    d.properties["POP_DENSITY"] =
      d.properties.COUNT_ALL_RACES_ETHNICITIES / d.properties.AreaKM;
  });
   
  console.log(phillyCensus);

  //   filter out the entries whose population density is less than 100 inhabitants per square kilometer
phillyCensus.features = phillyCensus.features.filter((d) => {
    return d.properties.POP_DENSITY > 100;
  });
  
 // YOUR TOKEN HERE
mapboxgl.accessToken =
"pk.eyJ1IjoiYmV0aHRlcyIsImEiOiJjbDl3dHNzZDEwMzV1M3FvZWcxY2l1anNoIn0.WrO7OEaBfTQ9Dm2GlWZ8gA";
const map = new mapboxgl.Map({
  container: "map", // Container ID
  style: "mapbox://styles/bethtes/cl9wty6hi000914mj0tzen6yo", // YOUR STYLE HERE
  projection: "globe",
  //   center on philadelphia
  center: [-75.1638, 39.9526],
  zoom: 10,
});
 // stylize the globe effect
map.on("style.load", () => {
    map.setFog({
      range: [1, 7],
      color: "#d6fffc",
      "horizon-blend": 0.03,
      "high-color": "#000000",
      "space-color": "#000000",
      "star-intensity": 0,
    });
  });
   
  // once the basemap is loaded, begin to add data sources and layers
  map.on("load", () => {
    //   add source for philly data
    map.addSource("phillyPop", {
      type: "geojson",
      data: phillyCensus,
    });
   
  //   create the color value scale for the data using a quantile function
    const scale = getQuantileScale(phillyCensus, "AreaKM");
   
    // add layer for philly data
    map.addLayer({
      id: "phillyPop",
      type: "fill",
      source: "phillyPop", // reference the data source
      layout: {},
      paint: {
        // style the layer based on POP_DENSITY property
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "AreaKM"],
          // use our quantile scale function that we created above to automatically generate the color scale
          ...scale[0],
        ],
      //   change opacity based on zoom level
      "fill-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        7, //zoom level
        0, //opacity
        9, //zoom level
        0.8, //opacity
        12, //zoom level
        0.5, //opacity
        13, //zoom level
        0, //opacity
      ],
    },
  });

 
      // get the data from the landuse layer
  const landuseData = map.querySourceFeatures("composite", {
    sourceLayer: "landuse",
  });
  console.log(landuseData);
   
  const landuseTypes = [...new Set(landuseData.map((d) => d.properties.class))];
  console.log(landuseTypes);

  const landuseColors = [
    ["park", "MediumSpringGreen"],
    ["school", "Plum"],
    ["hospital", "OrangeRed"],
    ["industrial", "RosyBrown"],
    ["rgba(0,0,0,0)"], //for all other categories, set the color to transparent
  ];
 
  // set the fill color of the landuse layer to based on the category
  map.setPaintProperty("land-use", "fill-color", [
    "match",
    ["get", "class"],
    ...landuseColors.flat(),
  ]);

    // change the fill opacity of the landuse layer to 0.5
    map.setPaintProperty("land-use", "fill-opacity", 0.5);

 
  //   create a landuse legend
  const landuseLegend = document.createElement("div");
  landuseLegend.className = "map-overlay";
  landuseLegend.id = "landuse-legend";
 
  //   create a legend title
  const landuseLegendTitle = document.createElement("h3");
  landuseLegendTitle.innerHTML = "Landuse";
  landuseLegend.appendChild(landuseLegendTitle);
 
  //   create a legend container
  const landuseLegendContainer = document.createElement("div");
 
  //   create a legend item for each landuse category
  landuseColors.forEach((d) => {
    if (d.length > 1) {
      // create a legend item
      const landuseLegendItem = document.createElement("div");
      landuseLegendItem.className = "legend-item";
 
      // create a legend item color
      const landuseLegendItemColor = document.createElement("div");
      landuseLegendItemColor.className = "legend-key";
      landuseLegendItemColor.style.display = "inline-block";
      landuseLegendItemColor.style.backgroundColor = d[1];
 
//   create a legend item label
      const landuseLegendItemLabel = document.createElement("div");
      landuseLegendItemLabel.className = "legend-item-label";
      landuseLegendItemLabel.innerHTML = d[0];
      landuseLegendItem.appendChild(landuseLegendItemColor);
      landuseLegendItem.appendChild(landuseLegendItemLabel);
      landuseLegendContainer.appendChild(landuseLegendItem);
    }
  });
 
  landuseLegend.appendChild(landuseLegendContainer);
  // append the legend to the document body
  document.body.appendChild(landuseLegend);

  // create legend
  const legend = document.getElementById("legend");
 
  //   create a title for the legend
  const title = document.createElement("h2");
  title.id = "legend-title";
  title.textContent = "Population Density";
  legend.appendChild(title);
 
  //   create a child element for the legend explaining the metric
  const description = document.createElement("p");
  description.id = "legend-description";
  description.textContent = "People per square km";
  legend.appendChild(description);
 
  //   create a container for the actual legend items
  const ramp = document.createElement("div");
  ramp.className = "legend-items";
 
  // get the values and color for the legend from the same scale as the choropleth layer
  const [legendValues, legendColors] = [scale[1], scale[2]];
 
  //   create a legend item for each value and color
  legendValues.forEach((layer, i) => {
    const color = legendColors[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;
 
    const value = document.createElement("div");
    value.innerHTML = `${round(layer)}`;
    item.appendChild(key);
    item.appendChild(value);
    ramp.appendChild(item);
  });
  //  add the legend items to the legend
  legend.appendChild(ramp);
 
  // add a popup to the map on hover
 const hoverPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  });
 
  // add a popup on hover over the population geojson
  map.on("mousemove", "phillyPop", (e) => {
    // if the mouse is over a feature and the zoom is less than 10
    if (e.features.length > 0 && map.getZoom() < 11) {
      // set the cursor to pointer
      map.getCanvas().style.cursor = "pointer";
      const { POP_DENSITY } = e.features[0].properties;
      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(
          `<h3>Population Density</h3><p><em>${round(
            POP_DENSITY
          )} people per square km</em></p>`
        )
        .addTo(map);
    }
  });
 
  // When the mouse leaves the choropleth, remove the popup from the previous feature.
  map.on("mouseleave", "phillyPop", () => {
    // set the cursor to default
    map.getCanvas().style.cursor = "";
    hoverPopup.remove();
  });

  /**
   * CUSTOMIZING CATEGORICAL DATA
   * now that we have a choropleth map, lets also try to add another layer from the Philly311 dataset.
   * Instead of downloading the data, we are going to fetch it from the web, so that it can update automatically.
   * once the data is fetched, we will add it to the map as a new source and layer.
   *
   */
 
  // retrieve the data from the 311 carto dataset for the past 14 days (output: geojson)
  fetch(
    "https://phl.carto.com/api/v2/sql?format=GeoJSON&q=SELECT * FROM public_cases_fc WHERE requested_datetime >= current_date - 14"
  )
    .then((response) => response.json())
    .then((data) => {
        const philly311 = data.features.filter(
            (d) => d.geometry !== null && d.properties.subject !== null
          );

            // create an object with the response types as keys and the number of responses as values
      const responseTypes = {};
      philly311.forEach((d) => {
        d.properties.subject = d.properties.subject.toUpperCase();
 
        if (responseTypes[d.properties.subject]) {
          responseTypes[d.properties.subject] += 1;
        } else {
          responseTypes[d.properties.subject] = 1;
        }
      });
 
      //   create a function to get the top 10 responses
      function getTopTenResponses(data) {
        const complaintArray = Object.entries(data).sort((a, b) => b[1] - a[1]);
 
        //   return array to object
        const responseTypesObject = complaintArray.reduce(
          (obj, [key, value]) => {
            obj[key] = value;
            return obj;
          },
          {}
        );
 
        const topTen = Object.entries(data)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
          }, {});
        return topTen;
      }
 

       
      //   call the getTopTenResponses function to get the top 10 responses so we know what to filter for
      const topIssues = Object.keys(getTopTenResponses(responseTypes));
     
          // add a new source to the map from the filtered data
          map.addSource("philly311", {
            type: "geojson",
            data: data,
            promoteId: "cartodb_id",
          });
     
          // add a new layer to the map from the new source
          map.addLayer({
            id: "philly311Circles",
            type: "circle",
            source: "philly311",
            layout: {},
            paint: {
                /**
                 * assign circle color based on the subject of the complaint
                 * the subject of the complaint is a string, and the color is a rgb, hex, hsl, or web color (ex "red")
                 */
                "circle-color": [
                  "match",
                  ["get", "subject"],
                  topIssues[0],
                  "rgb(244, 133, 0)",
                  topIssues[1],
                  "rgb(29, 168, 39)",
                  topIssues[2],
                  "rgb(80, 128, 234)",
                  topIssues[3],
                  "rgb(80, 128, 234)",
                  topIssues[4],
                  "rgb(128, 63, 138)",
                  topIssues[5],
                  "rgb(252, 75, 56)",
                  topIssues[6],
                  "rgb(128, 63, 138)",
                  topIssues[7],
                  "rgb(128, 63, 138)",
                  topIssues[8],
                  "rgb(252, 75, 56)",
                  topIssues[9],
                  "rgb(128, 63, 138)",
                  "rgba(33, 33, 33, 125)", //fallback for other categories
                ],
      
              },
  
            });
          });
      });
      
    

  /**
   * AUTO GENERATE LEGEND
   * This section offers two methods to generate a legend: Quantile and Equal Interval
   * Quantile is often used for choropleth maps, while Equal Interval is often used for heatmaps.
   * Both methods are acceptable, but tell a different story.
   *
   * In this example, we will use Quantile to generate our legend, but you can easily switch to Equal Interval
   * by switching the getQuantileScale function to getEqualIntervalScale throughout the code.
   *
   * I encourage you to check both methods and see which one tells a better story for your data.
   *
   * CASE 1: QUANTILE SCALE:
   * Quantile slices the domain into intervals of (roughly) equal absolute frequency
   * (i.e. equal number of individuals for each color)
   */
   
 // number of bins for your legend
const numberOfBins = 6;
 
// styles for our choropleth map
let colorRamp = {
  red: [
    "#f7f4f9",
    "#e7e1ef",
    "#d4b9da",
    "#c994c7",
    "#df65b0",
    "#e7298a",
    "#ce1256",
    "#980043",
    "#67001f",
  ],
  blue: [
    "#ffffd9",
    "#edf8b1",
    "#c7e9b4",
    "#7fcdbb",
    "#41b6c4",
    "#1d91c0",
    "#225ea8",
    "#253494",
    "#081d58",
  ],
  greyScale: [
    "#3F3F43",
    "#515155",
    "#646467",
    "#777779",
    "#8A8A8C",
    "#9C9C9E",
    "#AFAFB0",
    "#C2C2C2",
    "#D5D5D5",
    "#D5D5D5",
  ],
  qualitative: [
    "#e41a1c",
    "#377eb8",
    "#4daf4a",
    "#984ea3",
    "#ff7f00",
    "#ffff33",
    "#a65628",
    "#f781bf",
    "#999999",
  ],
  newColors: [
    "#FF1010",
    "#E51120",
    "#CB1230",
    "#B21341",
    "#981451",
    "#7F1562",
    "#651672",
    "#4C1783",
    "#321893",
    "#1919A4",
  ],
};
 
// select the color ramp to be used
const selectedColorRamp = colorRamp.newColors;
   
  function getQuantileScale(jsonSource, prop) {
    /**
     * @param {array} jsonSource - the data source
     * @param {string} prop - the property to be used for the scale
     */
   
    //sort the data in ascending order and assign to a data array
    const data = jsonSource.features
      .map((el) => el.properties[prop])
      .sort((a, b) => a - b);
   
    // create a quantile function based off the data array and assign to the colors array
    const color = d3.scaleQuantile().domain(data).range(selectedColorRamp);
   
    // get the quantile breaks of the data property
    const quantileBreaks = Math.floor(data.length / numberOfBins + 1);
   
    // get the min value of each group
    const groups = [];
    for (let i = 0; i < numberOfBins; i++) {
      // divide data into groups of equal size (quantileBreaks)
      groups.push(
        d3.min(data.slice(i * quantileBreaks, (i + 1) * quantileBreaks))
      );
    }
    // for each density break, get the color using our quantile function
    const colorBreaks = groups.map((d) => color(d));
   
    // combine density breaks and color breaks into an array of objects
    const colorScale = groups
      .map((d, i) => {
        return Object.values({
          density: d,
          color: colorBreaks[i],
        });
      })
      .flat();
   
    //return an array with the color scale, the groups, and the color breaks
    return [colorScale, groups, colorBreaks];
  }
   
/**
 * Utilities- This section contains functions that are used to check if the device is mobile
 * and to round any numbers to a legible number of significant digits
 */
 
 
  //   create a function to round the number to a significant digit
  function round(value) {
    if (value < 1) {
      return value.toFixed(2);
    }
    if (value < 10) {
      return Math.round(value * 10) / 10;
    }
    if (value < 100) {
      return Math.round(value);
    }
    if (value < 1000) {
      return Math.round(value / 10) * 10;
    }
    if (value >= 1000) {
      return Math.round(value / 1000) + "k";
    }
  }

   
//   createMap();
  