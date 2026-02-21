const state = {
  user: null,
  page: "dashboard",
  chart: null,
  publicChart: null,
};

const summaryAnimations = {};

const cropLabel = {
  HORENSO: "Horenso",
  TERONG: "Terong",
  KONYAKU: "Konyaku",
};

const harvestLabel = {
  HORENSO: "Horenso",
  TERONG: "Terong",
  KONTENER_HORENSO: "Kontener Horenso",
};

const harvestTypes = ["HORENSO", "TERONG", "KONTENER_HORENSO"];
const harvestChartStyle = {
  HORENSO: {
    border: "#2f7d32",
    background: "rgba(47, 125, 50, 0.55)",
  },
  TERONG: {
    border: "#e08b18",
    background: "rgba(224, 139, 24, 0.55)",
  },
  KONTENER_HORENSO: {
    border: "#1f6feb",
    background: "rgba(31, 111, 235, 0.55)",
  },
};

const $ = (id) => document.getElementById(id);

const cropFromLabel = Object.fromEntries(
  Object.entries(cropLabel).map(([code, label]) => [label.toLowerCase(), code])
);

const allowedHarvestUnits = new Set(["kardus", "kontainer"]);

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function setLoading(loading) {
  $("loading").classList.toggle("hidden", !loading);
}

function toast(message, isError = false) {
  const t = $("toast");
  t.textContent = message;
  t.classList.remove("hidden", "error");
  if (isError) {
    t.classList.add("error");
  }
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.add("hidden"), 2500);
}

async function api(url, options = {}) {
  setLoading(true);
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.message || "Request gagal.");
    }

    return body;
  } finally {
    setLoading(false);
  }
}

function getSummaryLines(summary) {
  return [
    `Penyemprotan hari ini: ${summary.sprayToday}`,
    `Penanaman hari ini: ${summary.plantingToday}`,
    `Total panen hari ini: ${summary.harvestToday}`,
    `Total panen 7 hari: ${summary.harvestWeek}`,
  ];
}

function stopSummaryAnimation(elementId) {
  const anim = summaryAnimations[elementId];
  if (!anim) return;
  clearInterval(anim.timer);
  clearTimeout(anim.swapTimer);
  anim.timer = null;
  anim.swapTimer = null;
}

function setSummaryFallback(elementId, text) {
  stopSummaryAnimation(elementId);
  const el = $(elementId);
  if (!el) return;
  el.classList.remove("vapor-in", "vapor-out");
  el.textContent = text;
}

function rotateSummaryLine(elementId, isFirst = false) {
  const el = $(elementId);
  const anim = summaryAnimations[elementId];
  if (!el || !anim || !anim.lines.length) return;

  const showLine = () => {
    el.classList.remove("vapor-in");
    void el.offsetWidth;
    el.classList.add("vapor-in");
  };

  if (isFirst || anim.index < 0) {
    anim.index = 0;
    el.classList.remove("vapor-out");
    el.textContent = anim.lines[anim.index];
    showLine();
    return;
  }

  el.classList.remove("vapor-in");
  el.classList.add("vapor-out");
  clearTimeout(anim.swapTimer);
  anim.swapTimer = setTimeout(() => {
    anim.index = (anim.index + 1) % anim.lines.length;
    el.classList.remove("vapor-out");
    el.textContent = anim.lines[anim.index];
    showLine();
  }, 230);
}

function startSummaryAnimation(elementId, lines) {
  const el = $(elementId);
  if (!el) return;

  stopSummaryAnimation(elementId);
  summaryAnimations[elementId] = {
    lines: lines.length ? lines : ["-"],
    index: -1,
    timer: null,
    swapTimer: null,
  };

  rotateSummaryLine(elementId, true);
  if (summaryAnimations[elementId].lines.length > 1) {
    summaryAnimations[elementId].timer = setInterval(() => {
      rotateSummaryLine(elementId);
    }, 2600);
  }
}

function renderPublicFallback(message) {
  const fallback = message || "Data belum tersedia.";
  setSummaryFallback("public-summary-line", fallback);
  $("public-spray-body").innerHTML = `<tr><td colspan="4">${fallback}</td></tr>`;
  $("public-planting-body").innerHTML = `<tr><td colspan="4">${fallback}</td></tr>`;
  $("public-harvest-body").innerHTML = `<tr><td colspan="6">${fallback}</td></tr>`;
  $("public-chart-note").textContent = fallback;
  applyResponsiveTableLabels();
}

function requireValue(value, name) {
  if (!String(value || "").trim()) {
    throw new Error(`${name} wajib diisi.`);
  }
}

function setModeAuthenticated(loggedIn) {
  $("landing-view").classList.toggle("hidden", loggedIn);
  $("app-view").classList.toggle("hidden", !loggedIn);
  if (loggedIn) {
    stopSummaryAnimation("public-summary-line");
  } else {
    stopSummaryAnimation("summary-line");
  }
  if (loggedIn) {
    $("login-view").classList.add("hidden");
  }
}

function showLoginPanel() {
  $("login-view").classList.remove("hidden");
}

function hideLoginPanel() {
  $("login-view").classList.add("hidden");
}

function closeMenu() {
  $("top-menu").classList.add("hidden");
}

function cropCodeFromCellText(text) {
  return cropFromLabel[String(text || "").trim().toLowerCase()] || "HORENSO";
}

function setPage(page) {
  state.page = page;
  ["dashboard", "spray", "planting", "harvest"].forEach((name) => {
    $(`page-${name}`).classList.toggle("hidden", name !== page);
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  closeMenu();
  loadPageData(page).catch((error) => toast(error.message, true));
}

function actionButtons(id, kind) {
  return `<div class="row-actions">
      <button class="action-btn" data-action="edit" data-id="${id}" data-kind="${kind}">Edit</button>
      <button class="action-btn delete" data-action="delete" data-id="${id}" data-kind="${kind}">Hapus</button>
    </div>`;
}

function serializeQuery(paramsObj) {
  const sp = new URLSearchParams();
  Object.entries(paramsObj).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      sp.set(key, value);
    }
  });
  const q = sp.toString();
  return q ? `?${q}` : "";
}

function applyResponsiveTableLabels() {
  const tables = document.querySelectorAll(".table-wrap table");
  tables.forEach((table) => {
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
    const cells = table.querySelectorAll("tbody td");
    cells.forEach((td, idx) => {
      if (td.hasAttribute("colspan")) {
        td.removeAttribute("data-label");
        return;
      }
      const header = headers[idx % headers.length];
      if (header) {
        td.setAttribute("data-label", header);
      }
    });
  });
}

async function checkSession() {
  try {
    const result = await api("/api/auth/me");
    state.user = result.user;
    $("active-user").textContent = `${result.user.name} (${result.user.role})`;
    setModeAuthenticated(true);
    await loadPageData("dashboard");
  } catch {
    state.user = null;
    setModeAuthenticated(false);
    try {
      await loadPublicLanding();
    } catch (error) {
      renderPublicFallback("Data publik belum aktif. Restart server lalu refresh halaman.");
      toast(error.message, true);
    }
  }
}

async function onLogin(event) {
  event.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  try {
    requireValue(email, "Email");
    requireValue(password, "Password");

    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    state.user = result.user;
    $("active-user").textContent = `${result.user.name} (${result.user.role})`;
    setModeAuthenticated(true);
    $("login-form").reset();
    toast("Login berhasil.");
    await loadPageData("dashboard");
  } catch (error) {
    toast(error.message, true);
  }
}

async function onLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
    state.user = null;
    setModeAuthenticated(false);
    $("login-form").reset();
    await loadPublicLanding();
    toast("Logout berhasil.");
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadPublicLanding() {
  const [summary, sprays, plantings, harvests, chartData] = await Promise.all([
    api("/api/public/summary"),
    api("/api/public/sprays"),
    api("/api/public/plantings"),
    api("/api/public/harvests"),
    api(`/api/public/charts/harvest-daily?startDate=${daysAgoISO(13)}&endDate=${todayISO()}`),
  ]);

  startSummaryAnimation("public-summary-line", getSummaryLines(summary.summary));

  const sprayHtml = sprays.items
    .map(
      (item) => `<tr>
      <td>${item.date}</td>
      <td>${cropLabel[item.crop] || item.crop}</td>
      <td>${item.location || "-"}</td>
      <td>${item.note || "-"}</td>
    </tr>`
    )
    .join("");
  $("public-spray-body").innerHTML = sprayHtml || `<tr><td colspan="4">Belum ada data penyemprotan.</td></tr>`;

  const plantingHtml = plantings.items
    .map(
      (item) => `<tr>
      <td>${item.date}</td>
      <td>${cropLabel[item.crop] || item.crop}</td>
      <td>${item.location || "-"}</td>
      <td>${item.note || "-"}</td>
    </tr>`
    )
    .join("");
  $("public-planting-body").innerHTML = plantingHtml || `<tr><td colspan="4">Belum ada data penanaman.</td></tr>`;

  const harvestHtml = harvests.items
    .map(
      (item) => `<tr>
      <td>${item.date}</td>
      <td>${harvestLabel[item.harvest_type] || item.harvest_type}</td>
      <td>${item.qty}</td>
      <td>${item.unit}</td>
      <td>${item.location || "-"}</td>
      <td>${item.note || "-"}</td>
    </tr>`
    )
    .join("");
  $("public-harvest-body").innerHTML = harvestHtml || `<tr><td colspan="6">Belum ada data panen.</td></tr>`;

  const chartItems = chartData.items || [];
  const labels = chartItems.map((item) => item.date);
  const values = chartItems.map((item) => Number(item.total_qty));
  renderPublicChart(labels.length ? labels : ["Belum ada data"], values.length ? values : [0]);
  $("public-chart-note").textContent = chartItems.length
    ? "Akumulasi jumlah panen per hari."
    : "Belum ada data panen untuk ditampilkan.";
  applyResponsiveTableLabels();
}

function renderPublicChart(labels, values) {
  const ctx = $("public-harvest-chart").getContext("2d");
  if (state.publicChart) {
    state.publicChart.destroy();
  }

  state.publicChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Panen Harian",
          data: values,
          borderColor: "#1f6feb",
          backgroundColor: "rgba(31, 111, 235, 0.2)",
          fill: true,
          tension: 0.32,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

async function loadDashboard() {
  const [summary, recent] = await Promise.all([
    api("/api/dashboard/summary"),
    api("/api/dashboard/recent"),
  ]);

  startSummaryAnimation("summary-line", getSummaryLines(summary.summary));

  const html = recent.items
    .map((item) => {
      const detail = item.activity_type === "PANEN" ? harvestLabel[item.detail] || item.detail : cropLabel[item.detail] || item.detail;
      const note = item.qty !== null && item.qty !== undefined ? `${item.qty} ${item.unit} | ${item.note || "-"}` : item.note || "-";
      return `<tr>
        <td>${item.date}</td>
        <td>${item.activity_type}</td>
        <td>${detail}</td>
        <td>${item.location || "-"}</td>
        <td>${note}</td>
        <td>${item.created_by_name}</td>
      </tr>`;
    })
    .join("");

  $("recent-body").innerHTML = html || `<tr><td colspan="6">Belum ada aktivitas.</td></tr>`;
  applyResponsiveTableLabels();
}

async function refreshChartWhenDashboardVisible() {
  if (state.page === "dashboard") {
    await loadChart();
  }
}

function resetSprayForm() {
  $("spray-id").value = "";
  $("spray-form").reset();
  $("spray-date").value = todayISO();
  $("spray-submit").textContent = "Simpan Penyemprotan";
  $("spray-cancel").classList.add("hidden");
}

async function loadSprays() {
  const query = serializeQuery({
    startDate: $("spray-start").value,
    endDate: $("spray-end").value,
    crop: $("spray-filter-crop").value,
    location: $("spray-filter-location").value,
  });
  const result = await api(`/api/sprays${query}`);
  const html = result.items
    .map(
      (item) => `<tr>
      <td>${item.date}</td>
      <td>${cropLabel[item.crop] || item.crop}</td>
      <td>${item.location}</td>
      <td>${item.note}</td>
      <td>${item.created_by_name}</td>
      <td>${actionButtons(item.id, "spray")}</td>
    </tr>`
    )
    .join("");
  $("spray-body").innerHTML = html || `<tr><td colspan="6">Belum ada data penyemprotan.</td></tr>`;
  applyResponsiveTableLabels();
}

async function submitSpray(event) {
  event.preventDefault();
  const id = $("spray-id").value;
  const payload = {
    note: $("spray-note").value,
    crop: $("spray-crop").value,
    date: $("spray-date").value,
    location: $("spray-location").value,
  };

  try {
    if (id) {
      await api(`/api/sprays/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      toast("Penyemprotan diperbarui.");
    } else {
      await api("/api/sprays", { method: "POST", body: JSON.stringify(payload) });
      toast("Penyemprotan ditambahkan.");
    }
    resetSprayForm();
    await Promise.all([loadSprays(), loadDashboard()]);
  } catch (error) {
    toast(error.message, true);
  }
}

async function onSprayAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const id = button.dataset.id;
  if (button.dataset.action === "delete") {
    if (!confirm("Hapus data penyemprotan ini?")) {
      return;
    }
    try {
      await api(`/api/sprays/${id}`, { method: "DELETE" });
      toast("Penyemprotan dihapus.");
      await Promise.all([loadSprays(), loadDashboard()]);
    } catch (error) {
      toast(error.message, true);
    }
    return;
  }

  const row = button.closest("tr");
  $("spray-id").value = id;
  $("spray-date").value = row.children[0].textContent;
  $("spray-crop").value = cropCodeFromCellText(row.children[1].textContent);
  $("spray-location").value = row.children[2].textContent;
  $("spray-note").value = row.children[3].textContent;
  $("spray-submit").textContent = "Update Penyemprotan";
  $("spray-cancel").classList.remove("hidden");
}

function resetPlantingForm() {
  $("planting-id").value = "";
  $("planting-form").reset();
  $("planting-date").value = todayISO();
  $("planting-submit").textContent = "Simpan Penanaman";
  $("planting-cancel").classList.add("hidden");
}

async function loadPlantings() {
  const query = serializeQuery({
    startDate: $("planting-start").value,
    endDate: $("planting-end").value,
    crop: $("planting-filter-crop").value,
    location: $("planting-filter-location").value,
  });
  const result = await api(`/api/plantings${query}`);
  const html = result.items
    .map(
      (item) => `<tr>
      <td>${item.date}</td>
      <td>${cropLabel[item.crop] || item.crop}</td>
      <td>${item.location}</td>
      <td>${item.note}</td>
      <td>${item.created_by_name}</td>
      <td>${actionButtons(item.id, "planting")}</td>
    </tr>`
    )
    .join("");
  $("planting-body").innerHTML = html || `<tr><td colspan="6">Belum ada data penanaman.</td></tr>`;
  applyResponsiveTableLabels();
}

async function submitPlanting(event) {
  event.preventDefault();
  const id = $("planting-id").value;
  const payload = {
    crop: $("planting-crop").value,
    note: $("planting-note").value,
    location: $("planting-location").value,
    date: $("planting-date").value || todayISO(),
  };

  try {
    if (id) {
      await api(`/api/plantings/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      toast("Penanaman diperbarui.");
    } else {
      await api("/api/plantings", { method: "POST", body: JSON.stringify(payload) });
      toast("Penanaman ditambahkan.");
    }
    resetPlantingForm();
    await Promise.all([loadPlantings(), loadDashboard()]);
  } catch (error) {
    toast(error.message, true);
  }
}

async function onPlantingAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const id = button.dataset.id;
  if (button.dataset.action === "delete") {
    if (!confirm("Hapus data penanaman ini?")) {
      return;
    }
    try {
      await api(`/api/plantings/${id}`, { method: "DELETE" });
      toast("Penanaman dihapus.");
      await Promise.all([loadPlantings(), loadDashboard()]);
    } catch (error) {
      toast(error.message, true);
    }
    return;
  }

  const row = button.closest("tr");
  $("planting-id").value = id;
  $("planting-date").value = row.children[0].textContent;
  $("planting-crop").value = cropCodeFromCellText(row.children[1].textContent);
  $("planting-location").value = row.children[2].textContent;
  $("planting-note").value = row.children[3].textContent;
  $("planting-submit").textContent = "Update Penanaman";
  $("planting-cancel").classList.remove("hidden");
}

function syncHarvestUnitByType() {
  const type = $("harvest-type").value;
  const unit = $("harvest-unit");
  if (type === "KONTENER_HORENSO") {
    unit.value = "kontainer";
    unit.disabled = true;
  } else {
    unit.disabled = false;
    if (!allowedHarvestUnits.has(unit.value)) {
      unit.value = "kardus";
    }
  }
}

function resetHarvestForm() {
  $("harvest-id").value = "";
  $("harvest-form").reset();
  $("harvest-date").value = todayISO();
  $("harvest-unit").value = "kardus";
  $("harvest-submit").textContent = "Simpan Panen";
  $("harvest-cancel").classList.add("hidden");
  syncHarvestUnitByType();
}

async function loadHarvests() {
  const query = serializeQuery({
    startDate: $("harvest-start").value,
    endDate: $("harvest-end").value,
    harvestType: $("harvest-filter-type").value,
    location: $("harvest-filter-location").value,
  });
  const result = await api(`/api/harvests${query}`);
  const html = result.items
    .map(
      (item) => `<tr>
      <td>${item.date}</td>
      <td>${harvestLabel[item.harvest_type] || item.harvest_type}</td>
      <td>${item.qty}</td>
      <td>${item.unit}</td>
      <td>${item.location || "-"}</td>
      <td>${item.note || "-"}</td>
      <td>${item.created_by_name}</td>
      <td>${actionButtons(item.id, "harvest")}</td>
    </tr>`
    )
    .join("");
  $("harvest-body").innerHTML = html || `<tr><td colspan="8">Belum ada data panen.</td></tr>`;
  applyResponsiveTableLabels();
}

async function submitHarvest(event) {
  event.preventDefault();
  const id = $("harvest-id").value;
  const payload = {
    harvestType: $("harvest-type").value,
    date: $("harvest-date").value,
    qty: $("harvest-qty").value,
    unit: $("harvest-unit").value,
    location: $("harvest-location").value,
    note: $("harvest-note").value,
  };

  try {
    if (id) {
      await api(`/api/harvests/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      toast("Data panen diperbarui.");
    } else {
      await api("/api/harvests", { method: "POST", body: JSON.stringify(payload) });
      toast("Data panen ditambahkan.");
    }
    resetHarvestForm();
    await Promise.all([loadHarvests(), loadDashboard(), refreshChartWhenDashboardVisible()]);
  } catch (error) {
    toast(error.message, true);
  }
}

async function onHarvestAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const id = button.dataset.id;
  if (button.dataset.action === "delete") {
    if (!confirm("Hapus data panen ini?")) {
      return;
    }
    try {
      await api(`/api/harvests/${id}`, { method: "DELETE" });
      toast("Data panen dihapus.");
      await Promise.all([loadHarvests(), loadDashboard(), refreshChartWhenDashboardVisible()]);
    } catch (error) {
      toast(error.message, true);
    }
    return;
  }

  const row = button.closest("tr");
  const typeText = row.children[1].textContent.trim();
  const type = Object.entries(harvestLabel).find(([, label]) => label === typeText)?.[0] || "HORENSO";

  $("harvest-id").value = id;
  $("harvest-date").value = row.children[0].textContent;
  $("harvest-type").value = type;
  $("harvest-qty").value = row.children[2].textContent;
  $("harvest-unit").value = String(row.children[3].textContent || "").trim().toLowerCase();
  $("harvest-location").value = row.children[4].textContent === "-" ? "" : row.children[4].textContent;
  $("harvest-note").value = row.children[5].textContent === "-" ? "" : row.children[5].textContent;
  $("harvest-submit").textContent = "Update Panen";
  $("harvest-cancel").classList.remove("hidden");
  syncHarvestUnitByType();
}

function renderChart(labels, datasets) {
  const ctx = $("harvest-chart").getContext("2d");

  if (state.chart) {
    state.chart.destroy();
  }

  state.chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function setChartTableHeader(columns) {
  $("chart-head").innerHTML = `<tr>${columns.map((title) => `<th>${title}</th>`).join("")}</tr>`;
}

async function loadSeparatedHarvestSeries(basePath, startDate, endDate) {
  const responses = await Promise.all(
    harvestTypes.map(async (harvestType) => {
      const query = serializeQuery({ startDate, endDate, harvestType });
      const result = await api(`${basePath}${query}`);
      return { harvestType, items: result.items || [] };
    })
  );

  const labelSet = new Set();
  const dateMaps = {};

  responses.forEach(({ harvestType, items }) => {
    const byDate = new Map();
    items.forEach((item) => {
      labelSet.add(item.date);
      byDate.set(item.date, Number(item.total_qty) || 0);
    });
    dateMaps[harvestType] = byDate;
  });

  const labels = Array.from(labelSet).sort();
  const datasets = harvestTypes.map((harvestType) => {
    const style = harvestChartStyle[harvestType];
    const byDate = dateMaps[harvestType] || new Map();
    return {
      label: harvestLabel[harvestType] || harvestType,
      data: labels.map((date) => byDate.get(date) || 0),
      borderColor: style.border,
      backgroundColor: style.background,
      borderWidth: 1,
    };
  });

  return { labels, datasets, dateMaps };
}

function renderCombinedChartTable(labels, dateMaps) {
  setChartTableHeader(["Tanggal", "Horenso", "Terong", "Kontener Horenso", "Total"]);
  if (!labels.length) {
    $("chart-body").innerHTML = `<tr><td colspan="5">Belum ada data panen pada filter ini.</td></tr>`;
    return;
  }

  const html = labels
    .map((date) => {
      const horenso = dateMaps.HORENSO?.get(date) || 0;
      const terong = dateMaps.TERONG?.get(date) || 0;
      const kontener = dateMaps.KONTENER_HORENSO?.get(date) || 0;
      const total = horenso + terong + kontener;
      return `<tr>
        <td>${date}</td>
        <td>${horenso}</td>
        <td>${terong}</td>
        <td>${kontener}</td>
        <td>${total}</td>
      </tr>`;
    })
    .join("");

  $("chart-body").innerHTML = html;
}

function renderSingleChartTable(items, harvestType) {
  const label = harvestLabel[harvestType] || harvestType;
  setChartTableHeader(["Tanggal", `Jumlah ${label}`]);

  const html = items.map((item) => `<tr><td>${item.date}</td><td>${Number(item.total_qty) || 0}</td></tr>`).join("");
  $("chart-body").innerHTML = html || `<tr><td colspan="2">Belum ada data panen pada filter ini.</td></tr>`;
}

async function loadChart() {
  const startDate = $("chart-start").value;
  const endDate = $("chart-end").value;
  const harvestType = $("chart-type").value;

  if (harvestType === "ALL") {
    const { labels, datasets, dateMaps } = await loadSeparatedHarvestSeries("/api/charts/harvest-daily", startDate, endDate);
    const chartLabels = labels.length ? labels : ["Belum ada data"];
    const chartDatasets = labels.length ? datasets : datasets.map((dataset) => ({ ...dataset, data: [0] }));
    renderChart(chartLabels, chartDatasets);
    renderCombinedChartTable(labels, dateMaps);
    applyResponsiveTableLabels();
    return;
  }

  const query = serializeQuery({
    startDate,
    endDate,
    harvestType,
  });
  const result = await api(`/api/charts/harvest-daily${query}`);
  const items = result.items || [];
  const labels = items.map((item) => item.date);
  const values = items.map((item) => Number(item.total_qty) || 0);
  const style = harvestChartStyle[harvestType] || harvestChartStyle.HORENSO;

  renderChart(
    labels.length ? labels : ["Belum ada data"],
    [
      {
        label: `Jumlah ${harvestLabel[harvestType] || harvestType}`,
        data: values.length ? values : [0],
        borderColor: style.border,
        backgroundColor: style.background,
        borderWidth: 1,
      },
    ]
  );

  renderSingleChartTable(items, harvestType);
  applyResponsiveTableLabels();
}

async function loadPageData(page) {
  if (page === "dashboard") {
    await Promise.all([loadDashboard(), loadChart()]);
  }
  if (page === "spray") {
    await loadSprays();
  }
  if (page === "planting") {
    await loadPlantings();
  }
  if (page === "harvest") {
    await loadHarvests();
  }
}

function installEvents() {
  $("login-form").addEventListener("submit", onLogin);
  $("show-login-btn").addEventListener("click", showLoginPanel);
  $("hide-login-btn").addEventListener("click", hideLoginPanel);
  $("logout-btn").addEventListener("click", onLogout);

  $("menu-toggle").addEventListener("click", () => {
    $("top-menu").classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    const menu = $("top-menu");
    if (!menu.contains(event.target) && event.target !== $("menu-toggle")) {
      closeMenu();
    }
  });

  document.querySelectorAll("[data-page]").forEach((node) => {
    node.addEventListener("click", () => setPage(node.dataset.page));
  });

  $("spray-form").addEventListener("submit", submitSpray);
  $("spray-filter").addEventListener("submit", (event) => {
    event.preventDefault();
    loadSprays().catch((error) => toast(error.message, true));
  });
  $("spray-cancel").addEventListener("click", resetSprayForm);
  $("spray-body").addEventListener("click", onSprayAction);

  $("planting-form").addEventListener("submit", submitPlanting);
  $("planting-filter").addEventListener("submit", (event) => {
    event.preventDefault();
    loadPlantings().catch((error) => toast(error.message, true));
  });
  $("planting-cancel").addEventListener("click", resetPlantingForm);
  $("planting-body").addEventListener("click", onPlantingAction);

  $("harvest-form").addEventListener("submit", submitHarvest);
  $("harvest-filter").addEventListener("submit", (event) => {
    event.preventDefault();
    loadHarvests().catch((error) => toast(error.message, true));
  });
  $("harvest-cancel").addEventListener("click", resetHarvestForm);
  $("harvest-body").addEventListener("click", onHarvestAction);
  $("harvest-type").addEventListener("change", syncHarvestUnitByType);

  $("chart-filter").addEventListener("submit", (event) => {
    event.preventDefault();
    loadChart().catch((error) => toast(error.message, true));
  });
}

function setInitialValues() {
  const today = todayISO();

  $("spray-date").value = today;
  $("planting-date").value = today;
  $("harvest-date").value = today;
  $("chart-start").value = daysAgoISO(13);
  $("chart-end").value = today;

  syncHarvestUnitByType();
}

async function bootstrap() {
  installEvents();
  setInitialValues();
  applyResponsiveTableLabels();
  await checkSession();
}

bootstrap();


