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
  genderData = gData.map(d => ({
    ...d,
    gender_gap: -1 * d.gender_gap
  }));

  countryRegionMap = cMap;

  initControls();
  updateDashboard();
});

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------
const REGION_LABELS = {
  "East Asia and Pacific (WB)": "EAP",
  "Europe and Central Asia (WB)": "ECA",
  "Latin America and Caribbean (WB)": "LAC",
  "Middle East and North Africa (WB)": "MENA",
  "North America (WB)": "NA",
  "South Asia (WB)": "SA",
  "Sub-Saharan Africa (WB)": "SSA"
};

// Okabe–Ito inspired, color-blind safe
const REGION_COLORS = {
  "East Asia and Pacific (WB)": "#0072B2",
  "Europe and Central Asia (WB)": "#E69F00",
  "Latin America and Caribbean (WB)": "#009E73",
  "Middle East and North Africa (WB)": "#CC79A7",
  "North America (WB)": "#D55E00",
  "South Asia (WB)": "#56B4E9",
  "Sub-Saharan Africa (WB)": "#000000"
};

const DEFAULT_BAR_COLOR = "#b7b7b7";
const FADED_OPACITY = 0.35;

const LEVEL_LABELS = {
  "primary": "Primary education",
  "lower_secondary": "Lower secondary education",
  "upper_secondary": "Upper secondary education",
  "tertiary": "Tertiary education"
};


// --------------------------------------------------
// CONTROLS
// --------------------------------------------------
function initControls() {
  const years = [...new Set(genderData.map(d => d.year))].sort((a, b) => a - b);

  const yearSlider = document.getElementById("yearSlider");
  const yearValue = document.getElementById("yearValue");

  yearSlider.min = years[0];
  yearSlider.max = years[years.length - 1];

  selectedYear = years.includes(2021) ? 2021 : years[years.length - 1];
  yearSlider.value = selectedYear;
  yearValue.textContent = selectedYear;

  yearSlider.oninput = e => {
    selectedYear = +e.target.value;
    yearValue.textContent = selectedYear;
    updateDashboard();
  };

  initLevelButtons();
}

function initLevelButtons() {
  const levels = [...new Set(genderData.map(d => d.level))];
  const container = document.getElementById("levelButtons");
  container.innerHTML = "";

  levels.forEach((l, i) => {
    const btn = document.createElement("button");
    btn.textContent = l;
    btn.onclick = () => {
      selectedLevel = l;
      updateActiveButtons(container, btn);
      updateDashboard();
    };
    container.appendChild(btn);

    if (i === 0) {
      btn.classList.add("active");
      selectedLevel = l;
    }
  });
}

function updateActiveButtons(container, activeBtn) {
  [...container.children].forEach(b => b.classList.remove("active"));
  activeBtn.classList.add("active");
}

document.getElementById("resetRegionBtn").onclick = () => {
  selectedRegion = null;
  updateDashboard();
};

// --------------------------------------------------
// DASHBOARD UPDATE
// --------------------------------------------------
function updateDashboard() {
  const filtered = genderData.filter(d =>
    d.year === selectedYear &&
    d.level === selectedLevel
  );

  drawMap(filtered);
  drawBarCharts();
  drawLineChart();
}

// --------------------------------------------------
// MAP (Cividis – color-blind safe)
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
    if (regionValue[d.region] !== undefined) {
      countries.push(d.country);
      values.push(regionValue[d.region]);
      hover.push(`<b>${d.region}</b><br>Gender gap: ${regionValue[d.region]}`);
    }
  });

  const trace = {
    type: "choropleth",
    locations: countries,
    locationmode: "country names",
    z: values,
    colorscale: "Cividis",
    zmin: -10,
    zmax: 10,
    text: hover,
    hovertemplate: "%{text}<extra></extra>",
    colorbar: {
      title: "Gender gap",
      orientation: "h",
      x: 0.5,
      xanchor: "center",
      y: -0.25,
      len: 0.6
    }
  };

  Plotly.newPlot("map", [trace], {
    margin: { t: 0, b: 0, l: 0, r: 0 },
    geo: { projection: { type: "equirectangular" } }
  });

  document.getElementById("map").on("plotly_click", e => {
    const country = e.points[0].location;
    selectedRegion = countryRegionMap.find(d => d.country === country)?.region;
    updateDashboard();
  });
}

// --------------------------------------------------
// BAR CHARTS (grey + highlight)
// --------------------------------------------------
function drawBarCharts() {
  const levels = [...new Set(genderData.map(d => d.level))];
  const container = document.getElementById("bar");

  container.innerHTML = "";
  container.style.display = "grid";
  container.style.gridTemplateColumns = "1fr 1fr";
  container.style.gap = "20px";

  levels.forEach(level => {
    const div = document.createElement("div");
    div.style.height = "350px";
    container.appendChild(div);

    const data = genderData.filter(d =>
      d.year === selectedYear &&
      d.level === level
    );

    const regions = data.map(d => d.region);
    const values = data.map(d => d.gender_gap);

    const marker = selectedRegion
      ? {
          color: regions.map(r =>
            r === selectedRegion ? REGION_COLORS[r] : DEFAULT_BAR_COLOR
          ),
          opacity: regions.map(r => (r === selectedRegion ? 1 : FADED_OPACITY))
        }
      : { color: DEFAULT_BAR_COLOR };

    const trace = {
      type: "bar",
      x: regions.map(r => REGION_LABELS[r]),
      y: values,
      customdata: regions,
      marker: marker,
      hovertemplate:
        "<b>%{customdata}</b><br>Gender gap: %{y}<extra></extra>"
    };

    Plotly.newPlot(div, [trace], {
      title: level,
      margin: { l: 40, r: 20, t: 40, b: 80 },
      xaxis: { tickangle: -75 },
      yaxis: { title: "Gender gap", range: [-10, 10], zeroline: true }
    }, { displayModeBar: false });

    div.on("plotly_click", e => {
      selectedRegion = e.points[0].customdata;
      selectedLevel = level;
      updateDashboard();
    });
  });
}

// --------------------------------------------------
// LINE CHART (DETAIL VIEW – ONE REGION)
// --------------------------------------------------
function drawLineChart() {
  const container = document.getElementById("lineChart");

  if (!selectedRegion) {
    Plotly.newPlot(container, [], {
      annotations: [{
        text: "Click a region in the bar chart or map to see its trend over time.",
        x: 0.5,
        y: 0.5,
        xref: "paper",
        yref: "paper",
        showarrow: false,
        font: { size: 14 }
      }],
      xaxis: { visible: false },
      yaxis: { visible: false }
    });
    return;
  }

  const regionData = genderData
    .filter(d => d.level === selectedLevel && d.region === selectedRegion)
    .sort((a, b) => a.year - b.year);

Plotly.newPlot(container, [{
  type: "scatter",
  mode: "lines+markers",
  x: regionData.map(d => d.year),
  y: regionData.map(d => d.gender_gap),
  line: { color: REGION_COLORS[selectedRegion], width: 3 },
  marker: { size: 6 }
}], {
  margin: { l: 50, r: 20, t: 70, b: 40 },

  xaxis: { title: "Year" },
  yaxis: { title: "Gender gap", zeroline: true },

  showlegend: false,

  annotations: [
    {
      text: `<b>Region:</b> ${REGION_LABELS[selectedRegion]} &nbsp;&nbsp; <b>Education level:</b> ${LEVEL_LABELS[selectedLevel]}`,
      x: 0.5,
      y: 1.18,
      xref: "paper",
      yref: "paper",
      showarrow: false,
      align: "center",
      font: {
        size: 13,
        color: "#333"
      }
    }
  ]
}, { displayModeBar: false });

}
