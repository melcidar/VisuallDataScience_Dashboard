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



const REGION_LABELS = {
  "East Asia and Pacific (WB)": "EAP",
  "Europe and Central Asia (WB)": "ECA",
  "Latin America and Caribbean (WB)": "LAC",
  "Middle East and North Africa (WB)": "MENA",
  "North America (WB)": "NA",
  "South Asia (WB)": "SA",
  "Sub-Saharan Africa (WB)": "SSA"
};

const REGION_COLORS = {
  "East Asia and Pacific (WB)": "#0082ce", // blue
  "Europe and Central Asia (WB)": "#e59c00", // orange
  "Latin America and Caribbean (WB)": "#004e39", // bluish green
  "Middle East and North Africa (WB)": "#6b505f", // purple
  "North America (WB)": "#D55E00", // vermillion
  "South Asia (WB)": "#56B4E9", // sky blue
  "Sub-Saharan Africa (WB)": "#666226" // yellow
};

const MAP_COLORSCALE = [
  [0, "#67001f"],
  [0.5, "#f7f7f7"],
  [1, "#053061"]
];

const LEVEL_LABELS = {
  "Primary": "Primary education",
  "Lower secondary": "Lower secondary education",
  "Upper secondary": "Upper secondary education",
  "Tertiary": "Tertiary education"
};


const POSITIVE_COLOR = "#d62035"; // crvena (RdBu pozitivna strana)
const NEGATIVE_COLOR = "#2166ac"; // plava (RdBu negativna strana)
const FADED_COLOR = "#7c7c7c";

const MAP_MIN = -10;
const MAP_MAX = 10;

function valueToColor(value) {
  const t = (value - MAP_MIN) / (MAP_MAX - MAP_MIN); // normalize 0–1
  return Plotly.colorscale.getColor("RdBu", t);
}


// --------------------------------------------------
// CONTROLS
// --------------------------------------------------
function initControls() {
  const years = [...new Set(genderData.map(d => d.year))].sort((a, b) => a - b);

  const yearSlider = document.getElementById("yearSlider");
  const yearValue = document.getElementById("yearValue");

  // --- YEAR SLIDER ---
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

const resetBtn = document.getElementById("resetRegionBtn");
resetBtn.onclick = () => {
  selectedRegion = null;
  drawBarCharts();
  drawLineChart();
};


  initLevelButtons();
}

function updateResetButton() {
  const btn = document.getElementById("resetRegionBtn");
  if (!btn) return;

  btn.disabled = !selectedRegion;
  btn.style.opacity = selectedRegion ? 1 : 0.4;
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
  drawBarCharts();
  drawLineChart();
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
        `<b>${d.region}</b><br>Gender gap: ${val}`
      );
    }
  });

  const trace = {
    type: "choropleth",
    locations: countries,
    locationmode: "country names",
    z: values,
    text: hover,
    colorscale: "RdBu",
    zmid: 0,
    zmin: -10,
    zmax: 10,
    colorbar: {
      title: {
        text: "Gender gap",
        side: "top"
      },
      orientation: "h",
      x: 0.5,
      xanchor: "center",
      y: -0.25,
      len: 0.6,
      thickness: 12
    },
    hovertemplate: "%{text}<extra></extra>"
  };


const layout = {
  margin: {
    t: 0,
    b: 0,
    l: 0,
    r: 0
  },
  geo: {
    projection: { type: "equirectangular" }
  }
};

  Plotly.newPlot("map", [trace], layout);

  document.getElementById("map").on("plotly_click", e => {
    const country = e.points[0].location;
    const region = countryRegionMap.find(d => d.country === country)?.region;
    selectedRegion = region;
    drawBarCharts();
    drawLineChart();
  });
}

// --------------------------------------------------
// LINE CHART
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
    const regionLabels = regions.map(r => REGION_LABELS[r] ?? r);
    const values = data.map(d => d.gender_gap);

    // ---------- marker logic ----------
    let marker;

if (selectedRegion) {
  marker = {
    color: regions.map((r, i) => {
      if (r !== selectedRegion) return FADED_COLOR;
      return values[i] >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
    }),
    opacity: regions.map(r => (r === selectedRegion ? 1 : 0.4))
  };
} else {
  marker = {
    color: regions.map(r =>
      REGION_COLORS[r] || "#2f6df6"
    )
  };
}


    const trace = {
      type: "bar",
      x: regionLabels,
      y: values,
      customdata: regions,
      marker: marker,
      hovertemplate:
        "<b>%{customdata}</b><br>Gender gap: %{y}<extra></extra>"
    };

    const layout = {
      title: level,
      margin: { l: 40, r: 20, t: 40, b: 80 },
      xaxis: {
        title: "World Bank regions",
        tickangle: -75
      },
      yaxis: {
        title: "Gender gap",
        range: [-10, 10],
        zeroline: true
      }
    };

    Plotly.newPlot(div, [trace], layout, {
      displayModeBar: false,
      responsive: true
    });

    div.on("plotly_click", e => {
  if (!e.points || !e.points.length) return;

  selectedRegion = e.points[0].customdata;

  // 🔴 KLJUČNO: ovaj bar chart = ovaj education level
  selectedLevel = level;

  // update active level button (UI sync)
  const buttons = document.querySelectorAll("#levelButtons button");
  buttons.forEach(b => {
    b.classList.toggle("active", b.textContent === level);
  });

  // 🔁 refresh EVERYTHING (map + bars + line)
  updateDashboard();
});

  });
}

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
    .filter(d =>
      d.level === selectedLevel &&
      d.region === selectedRegion
    )
    .sort((a, b) => a.year - b.year);

  const trace = {
    type: "scatter",
    mode: "lines+markers",
    x: regionData.map(d => d.year),
    y: regionData.map(d => d.gender_gap),
    line: {
      color: REGION_COLORS[selectedRegion],
      width: 3
    },
    marker: { size: 6 },
    name: REGION_LABELS[selectedRegion]
  };

  const layout = {
    margin: { l: 50, r: 20, t: 40, b: 40 },
    xaxis: {
      title: "Year",
      tickmode: "linear"
    },
    yaxis: {
      title: "Gender gap",
      zeroline: true
    },
    showlegend: false
  };

  Plotly.newPlot(container, [trace], layout, {
    displayModeBar: false,
    responsive: true
  });
}
