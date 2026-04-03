// Powers the dashboard UI, filtering, chart rendering, and live simulation.
const API_BASE_URL = "/api/prices";
const REFRESH_INTERVAL_MS = 12000;

const state = {
  allPrices: [],
  selectedCrop: "",
  selectedLocation: "All",
  chart: null,
};

const elements = {
  cropSelect: document.getElementById("cropSelect"),
  locationSelect: document.getElementById("locationSelect"),
  selectedCropName: document.getElementById("selectedCropName"),
  currentPrice: document.getElementById("currentPrice"),
  priceChange: document.getElementById("priceChange"),
  priceChangeMeta: document.getElementById("priceChangeMeta"),
  priceTableBody: document.getElementById("priceTableBody"),
  mobileCards: document.getElementById("mobileCards"),
  emptyState: document.getElementById("emptyState"),
  priceChart: document.getElementById("priceChart"),
  priceForm: document.getElementById("priceForm"),
  nameInput: document.getElementById("nameInput"),
  priceInput: document.getElementById("priceInput"),
  dateInput: document.getElementById("dateInput"),
  locationInput: document.getElementById("locationInput"),
  formMessage: document.getElementById("formMessage"),
};

const changeCard = document.querySelector(".change-card");
const currencyFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const formatCurrency = (value) => `Rs. ${currencyFormatter.format(value)}`;
const formatDate = (value) => new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const sanitizeText = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const sortByDateAsc = (items) => [...items].sort((first, second) => new Date(first.date) - new Date(second.date));
const sortByDateDesc = (items) => [...items].sort((first, second) => new Date(second.date) - new Date(first.date));
const getUniqueValues = (items, key) => [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const populateCropOptions = () => {
  const crops = getUniqueValues(state.allPrices, "name");
  elements.cropSelect.innerHTML = crops.map((crop) => `<option value="${sanitizeText(crop)}">${sanitizeText(crop)}</option>`).join("");
  if (!state.selectedCrop && crops.length > 0) {
    state.selectedCrop = crops[0];
  }
  elements.cropSelect.value = state.selectedCrop;
};

const populateLocationOptions = () => {
  const filteredByCrop = state.allPrices.filter((item) => item.name === state.selectedCrop);
  const locations = getUniqueValues(filteredByCrop, "location");
  elements.locationSelect.innerHTML = ['<option value="All">All Locations</option>'].concat(locations.map((location) => `<option value="${sanitizeText(location)}">${sanitizeText(location)}</option>`)).join("");
  if (state.selectedLocation !== "All" && !locations.includes(state.selectedLocation)) {
    state.selectedLocation = "All";
  }
  elements.locationSelect.value = state.selectedLocation;
};

const getFilteredPrices = () => state.allPrices.filter((item) => item.name === state.selectedCrop && (state.selectedLocation === "All" || item.location === state.selectedLocation));

const updateSummary = (prices) => {
  elements.selectedCropName.textContent = state.selectedCrop || "-";
  if (prices.length === 0) {
    elements.currentPrice.textContent = "Rs. 0";
    elements.priceChange.textContent = "0%";
    elements.priceChangeMeta.textContent = "No data available";
    changeCard.className = "stat-card change-card neutral";
    return;
  }

  const ordered = sortByDateAsc(prices);
  const latest = ordered[ordered.length - 1];
  const previous = ordered[ordered.length - 2];
  elements.currentPrice.textContent = formatCurrency(latest.price);

  if (!previous) {
    elements.priceChange.textContent = "0%";
    elements.priceChangeMeta.textContent = "First recorded entry";
    changeCard.className = "stat-card change-card neutral";
    return;
  }

  const difference = latest.price - previous.price;
  const percentage = previous.price === 0 ? 0 : (difference / previous.price) * 100;
  const isPositive = difference > 0;
  const isNegative = difference < 0;
  elements.priceChange.textContent = `${isPositive ? "+" : ""}${percentage.toFixed(2)}%`;
  elements.priceChangeMeta.textContent = `${isPositive ? "Up" : isNegative ? "Down" : "Flat"} by ${formatCurrency(Math.abs(difference))} from previous update`;
  changeCard.className = `stat-card change-card ${isPositive ? "positive" : isNegative ? "negative" : "neutral"}`;
};

const renderTable = (prices) => {
  if (prices.length === 0) {
    elements.priceTableBody.innerHTML = "";
    elements.mobileCards.innerHTML = "";
    elements.emptyState.classList.remove("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");
  const ordered = sortByDateDesc(prices);
  elements.priceTableBody.innerHTML = ordered.map((item) => `
    <tr>
      <td>${sanitizeText(item.name)}</td>
      <td><span class="price-pill">${formatCurrency(item.price)}</span></td>
      <td>${formatDate(item.date)}</td>
      <td>${sanitizeText(item.location)}</td>
    </tr>
  `).join("");

  elements.mobileCards.innerHTML = ordered.map((item) => `
    <article class="mobile-card">
      <h3>${sanitizeText(item.name)}</h3>
      <p>${formatCurrency(item.price)}</p>
      <div class="mobile-meta">
        <span>Date: ${formatDate(item.date)}</span>
        <span>Location: ${sanitizeText(item.location)}</span>
      </div>
    </article>
  `).join("");
};

const renderChart = (prices) => {
  const ordered = sortByDateAsc(prices);
  if (state.chart) {
    state.chart.destroy();
  }
  state.chart = new Chart(elements.priceChart, {
    type: "line",
    data: {
      labels: ordered.map((item) => formatDate(item.date)),
      datasets: [{
        label: "Crop price",
        data: ordered.map((item) => item.price),
        borderColor: "#228b4d",
        backgroundColor: "rgba(34, 139, 77, 0.14)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#228b4d",
      }],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label(context) { return ` ${formatCurrency(context.parsed.y)}`; } } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: false, ticks: { callback(value) { return formatCurrency(value); } } },
      },
    },
  });
};

const renderDashboard = () => {
  const filtered = getFilteredPrices();
  updateSummary(filtered);
  renderTable(filtered);
  renderChart(filtered);
};

const applyLiveSimulation = async () => {
  const filtered = getFilteredPrices();
  if (filtered.length === 0) {
    return;
  }

  const latest = sortByDateAsc(filtered).at(-1);
  const variance = 1 + (Math.random() * 0.04 - 0.02);
  const nextPrice = Number((latest.price * variance).toFixed(2));
  const payload = { name: latest.name, price: nextPrice, date: new Date().toISOString(), location: latest.location };

  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || "Failed to simulate latest price");
    }
    await fetchPrices();
  } catch (error) {
    console.error(error.message);
  }
};

const fetchPrices = async () => {
  try {
    const response = await fetch(API_BASE_URL);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to load crop prices");
    }
    state.allPrices = result;
    populateCropOptions();
    populateLocationOptions();
    renderDashboard();
  } catch (error) {
    elements.emptyState.textContent = error.message;
    elements.emptyState.classList.remove("hidden");
  }
};

const handleFormSubmit = async (event) => {
  event.preventDefault();
  const payload = {
    name: elements.nameInput.value.trim(),
    price: Number(elements.priceInput.value),
    date: elements.dateInput.value,
    location: elements.locationInput.value.trim(),
  };

  if (!payload.name || !payload.location || Number.isNaN(payload.price)) {
    elements.formMessage.textContent = "Please enter valid crop, price, and location values.";
    return;
  }

  try {
    elements.formMessage.style.color = "var(--green-600)";
    elements.formMessage.textContent = "Saving price entry...";
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.errors?.join(", ") || result.message || "Request failed");
    }
    elements.priceForm.reset();
    elements.formMessage.textContent = "Price entry added successfully.";
    state.selectedCrop = result.name;
    state.selectedLocation = "All";
    await fetchPrices();
  } catch (error) {
    elements.formMessage.style.color = "var(--red-500)";
    elements.formMessage.textContent = error.message;
  }
};

elements.cropSelect.addEventListener("change", (event) => {
  state.selectedCrop = event.target.value;
  state.selectedLocation = "All";
  populateLocationOptions();
  renderDashboard();
});

elements.locationSelect.addEventListener("change", (event) => {
  state.selectedLocation = event.target.value;
  renderDashboard();
});

elements.priceForm.addEventListener("submit", handleFormSubmit);
fetchPrices();
setInterval(applyLiveSimulation, REFRESH_INTERVAL_MS);
