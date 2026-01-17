let genderData = [];
let countryRegionMap = [];

let selectedYear = null;
let selectedLevel = null;
let selectedRegion = null;

// --------------------------------------------------
// LOAD DATA
// --------------------------------------------------
Promise.all([
  fetch("data.json").then(r => r.json()),
  fetch("country_to_wb_region_array.json").then(r => r.json())
]).then(([gData, cMap]) => {
  genderData = gData;
  countryRegionMap = cMap;

  initControls();
  updateDashboard();
});

// --------------------------------------------------
// CONTROLS
// --------------------------------------------------
function initControls() {
  const years = [...new Set(genderData.map(d => d.year))].sort();
  const levels = [...new Set(genderData.map(d => d.level))];

  const yearSelect = document.getElementById("yearSelect");
  const levelSelect = document.getElementById("levelSelect");

  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });

  levels.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l;
    opt.textContent = l;
    levelSelect.appendChild(opt);
  });

  selectedYear = years[0];
  selectedLevel = levels[0];

  yearSelect.value = selectedYear;
  levelSelect.value = selectedLevel;

  yearSelect.onchange = e => {
    selectedYear = +e.target.value;
    updateDashboard();
  };

  levelSelect.onchange = e => {
    selectedLevel = e.target.value;
    updateDashboard();
  };
}

// --------------------------------------------------
// DASHBOARD UPDATE
// --------------------------------------------------
function updateDashboard() {
  const filtered = genderData.filter(d =>
    d.year === selectedYear &&
    d.level === selectedLevel
  );

  drawMap(filtered);
  drawBarChart();
}

// --------------------------------------------------
// MAP
// --------------------------------------------------
function drawMap(filteredData) {
  const regionValue = {};
  filteredData.forEach(d => {
    regionValue[d.region] = d.gender_gap;
  });

  const countries = [];
  const values = [];
  const hover = [];

  countryRegionMap.forEach(d => {
    const val = regionValue[d.region];
    if (val !== undefined) {
      countries.push(d.country);
      values.push(val);
      hover.push(
        `<b>${d.country}</b><br>${d.region}<br>Gender gap: ${val}`
      );
    }
  });

  const trace = {
    type: "choropleth",
    locations: countries,
    locationmode: "country names",
    z: values,
    colorscale: "Cividis",
    zmid: 0,
    hovertemplate: "%{text}<extra></extra>"
  };

  const layout = {
    geo: {
      projection: { type: "natural earth" }
    }
  };

  Plotly.newPlot("map", [trace], layout);

  document.getElementById("map").on("plotly_click", e => {
    const country = e.points[0].location;
    const region = countryRegionMap.find(d => d.country === country)?.region;
    selectedRegion = region;
    drawBarChart();
  });
}

// --------------------------------------------------
// LINE CHART
// --------------------------------------------------
function drawBarChart() {
  if (!selectedRegion) {
    Plotly.purge("bar");
    return;
  }

  const data = genderData.filter(d =>
    d.region === selectedRegion &&
    d.year === selectedYear
  );

  const trace = {
    type: "bar",
    x: data.map(d => d.gender_gap),
    y: data.map(d => d.level),
    orientation: "h",
    marker: {
      color: data.map(d => d.gender_gap),
      colorscale: "RdBu",
      cmin: -10,
      cmax: 10
    }
  };

  const layout = {
    title: `Gender gap – ${selectedRegion}`,
    xaxis: { title: "Gender gap" },
    yaxis: { title: "Education level" }
  };

  Plotly.newPlot("bar", [trace], layout);
}

