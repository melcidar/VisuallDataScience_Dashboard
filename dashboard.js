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
// CONTROLS
// --------------------------------------------------
function initControls() {
  const years = [...new Set(genderData.map(d => d.year))].sort((a, b) => a - b);

  const yearSlider = document.getElementById("yearSlider");
  const yearValue = document.getElementById("yearValue");

  // --- YEAR SLIDER ---
  yearSlider.min = years[0];
  yearSlider.max = years[years.length - 1];

  selectedYear = years.includes(2022) ? 2022 : years[years.length - 1];
  yearSlider.value = selectedYear;
  yearValue.textContent = selectedYear;

  yearSlider.oninput = e => {
    selectedYear = +e.target.value;
    yearValue.textContent = selectedYear;
    updateDashboard();
  };

  function initRegionButtons() {
  const regions = [...new Set(genderData.map(d => d.region))];
  const container = document.getElementById("regionButtons");
  container.innerHTML = "";

  regions.forEach(r => {
    const btn = document.createElement("button");
    btn.textContent = r;
    btn.onclick = () => {
      selectedRegion = r;
      updateActiveButtons(container, btn);
      drawBarCharts();
    };
    container.appendChild(btn);
  });
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

  initRegionButtons();
  initLevelButtons();
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
      y: -0.15,
      len: 0.6,
      thickness: 12
    },
    hovertemplate: "%{text}<extra></extra>"
  };


const layout = {
  geo: {
    projection: { type: "natural earth" }
  },
  annotations: [
    {
      x: 1.05,
      y: 0.75,
      xref: "paper",
      yref: "paper",
      text: "🔴 Female advantage<br>(positive values)",
      showarrow: false,
      align: "left",
      font: { size: 12 }
    },
    {
      x: 1.05,
      y: 0.25,
      xref: "paper",
      yref: "paper",
      text: "🔵 Male advantage<br>(negative values)",
      showarrow: false,
      align: "left",
      font: { size: 12 }
    }
  ]
};


  Plotly.newPlot("map", [trace], layout);

  document.getElementById("map").on("plotly_click", e => {
    const country = e.points[0].location;
    const region = countryRegionMap.find(d => d.country === country)?.region;
    selectedRegion = region;
    drawBarCharts();
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
    div.style.height = "300px";
    container.appendChild(div);

    const data = genderData.filter(d =>
      d.year === selectedYear &&
      d.level === level
    );

    const regions = data.map(d => d.region);
    const values = data.map(d => d.gender_gap);

    const colors = regions.map(r => {
      if (!selectedRegion) return "#2f6df6";
      if (r === selectedRegion) return "#d62728"; // highlight
      return "#d3d3d3"; // greyed out
    });

    const trace = {
      type: "bar",
      x: values,
      y: regions,
      orientation: "h",
      marker: { color: colors }
    };

    const layout = {
      title: level,
      margin: { l: 160, r: 20, t: 40, b: 40 },
      xaxis: {
        title: "Gender gap",
        range: [-10, 10]
      }
    };

    Plotly.newPlot(div, [trace], layout, { displayModeBar: false });
  });
}

