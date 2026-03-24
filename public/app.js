const state = {
  user: null,
  page: "dashboard",
  chart: null,
  publicChart: null,
  language: getInitialLanguage(),
};

const DEFAULT_LANGUAGE = "ja";
const LANGUAGE_STORAGE_KEY = "kebun-language";
const SUPPORTED_LANGUAGES = new Set(["ja", "id"]);
const summaryAnimations = {};

const messages = {
  ja: {
    requestFailed: "リクエストに失敗しました。",
    summaryLoading: "集計を読み込み中...",
    noData: "データはまだありません。",
    publicUnavailable: "公開データはまだ有効ではありません。サーバーを再起動してから再読み込みしてください。",
    loginSuccess: "ログインしました。",
    logoutSuccess: "ログアウトしました。",
    sprayCreated: "散布を追加しました。",
    sprayUpdated: "散布を更新しました。",
    sprayDeleted: "散布を削除しました。",
    plantingCreated: "植え付けを追加しました。",
    plantingUpdated: "植え付けを更新しました。",
    plantingDeleted: "植え付けを削除しました。",
    harvestCreated: "収穫データを追加しました。",
    harvestUpdated: "収穫データを更新しました。",
    harvestDeleted: "収穫データを削除しました。",
    confirmDeleteSpray: "この散布データを削除しますか？",
    confirmDeletePlanting: "この植え付けデータを削除しますか？",
    confirmDeleteHarvest: "この収穫データを削除しますか？",
    emailRequired: "メールを入力してください。",
    passwordRequired: "パスワードを入力してください。",
    emptySpray: "散布データはまだありません。",
    emptyPlanting: "植え付けデータはまだありません。",
    emptyHarvest: "収穫データはまだありません。",
    emptyRecent: "アクティビティはまだありません。",
    emptyChart: "この条件では収穫データがありません。",
    chartNoData: "表示できる収穫データがまだありません。",
    chartEmptyLabel: "データなし",
    chartNote: "日別の収穫量を収穫種類ごとに1つのグラフで表示しています。",
    total: "合計",
    date: "日付",
    quantity: "数量",
    edit: "編集",
    delete: "削除",
    saveSpray: "散布を保存",
    updateSpray: "散布を更新",
    savePlanting: "植え付けを保存",
    updatePlanting: "植え付けを更新",
    saveHarvest: "収穫を保存",
    updateHarvest: "収穫を更新",
    summarySpray: "本日の散布: {value}",
    summaryPlanting: "本日の植え付け: {value}",
    summaryHarvestToday: "本日の収穫合計: {value}",
    summaryHarvestWeek: "直近7日間の収穫合計: {value}",
    quantityLabel: "{label}の数量",
  },
  id: {
    requestFailed: "Request gagal.",
    summaryLoading: "Memuat ringkasan...",
    noData: "Data belum tersedia.",
    publicUnavailable: "Data publik belum aktif. Restart server lalu refresh halaman.",
    loginSuccess: "Login berhasil.",
    logoutSuccess: "Logout berhasil.",
    sprayCreated: "Penyemprotan ditambahkan.",
    sprayUpdated: "Penyemprotan diperbarui.",
    sprayDeleted: "Penyemprotan dihapus.",
    plantingCreated: "Penanaman ditambahkan.",
    plantingUpdated: "Penanaman diperbarui.",
    plantingDeleted: "Penanaman dihapus.",
    harvestCreated: "Data panen ditambahkan.",
    harvestUpdated: "Data panen diperbarui.",
    harvestDeleted: "Data panen dihapus.",
    confirmDeleteSpray: "Hapus data penyemprotan ini?",
    confirmDeletePlanting: "Hapus data penanaman ini?",
    confirmDeleteHarvest: "Hapus data panen ini?",
    emailRequired: "Email wajib diisi.",
    passwordRequired: "Password wajib diisi.",
    emptySpray: "Belum ada data penyemprotan.",
    emptyPlanting: "Belum ada data penanaman.",
    emptyHarvest: "Belum ada data panen.",
    emptyRecent: "Belum ada aktivitas.",
    emptyChart: "Belum ada data panen pada filter ini.",
    chartNoData: "Belum ada data panen untuk ditampilkan.",
    chartEmptyLabel: "Belum ada data",
    chartNote: "Panen harian ditampilkan terpisah per jenis panen dalam satu grafik.",
    total: "Total",
    date: "Tanggal",
    quantity: "Jumlah",
    edit: "Edit",
    delete: "Hapus",
    saveSpray: "Simpan Penyemprotan",
    updateSpray: "Update Penyemprotan",
    savePlanting: "Simpan Penanaman",
    updatePlanting: "Update Penanaman",
    saveHarvest: "Simpan Panen",
    updateHarvest: "Update Panen",
    summarySpray: "Penyemprotan hari ini: {value}",
    summaryPlanting: "Penanaman hari ini: {value}",
    summaryHarvestToday: "Total panen hari ini: {value}",
    summaryHarvestWeek: "Total panen 7 hari: {value}",
    quantityLabel: "Jumlah {label}",
  },
};

const cropLabelMap = {
  ja: {
    HORENSO: "ほうれん草",
    TERONG: "ナス",
    KONYAKU: "こんにゃく",
  },
  id: {
    HORENSO: "Horenso",
    TERONG: "Terong",
    KONYAKU: "Konyaku",
  },
};

const harvestLabelMap = {
  ja: {
    HORENSO: "ほうれん草",
    TERONG: "ナス",
    KONYAKU: "こんにゃく",
    KONTENER_HORENSO: "ほうれん草コンテナ",
  },
  id: {
    HORENSO: "Horenso",
    TERONG: "Terong",
    KONYAKU: "Konyaku",
    KONTENER_HORENSO: "Kontener Horenso",
  },
};

const unitLabelMap = {
  ja: {
    kardus: "箱",
    kontainer: "コンテナ",
  },
  id: {
    kardus: "kardus",
    kontainer: "kontainer",
  },
};

const harvestTypes = ["HORENSO", "TERONG", "KONYAKU", "KONTENER_HORENSO"];
const harvestChartStyle = {
  HORENSO: {
    border: "#2f7d32",
    background: "rgba(47, 125, 50, 0.55)",
  },
  TERONG: {
    border: "#e08b18",
    background: "rgba(224, 139, 24, 0.55)",
  },
  KONYAKU: {
    border: "#6b5bcd",
    background: "rgba(107, 91, 205, 0.55)",
  },
  KONTENER_HORENSO: {
    border: "#1f6feb",
    background: "rgba(31, 111, 235, 0.55)",
  },
};

const $ = (id) => document.getElementById(id);

const cropFromLabel = createLookup(cropLabelMap);
const harvestFromLabel = createLookup(harvestLabelMap);
const unitFromLabel = {
  kardus: "kardus",
  kontainer: "kontainer",
  box: "kardus",
  container: "kontainer",
  "箱": "kardus",
  "コンテナ": "kontainer",
};

const allowedHarvestUnits = new Set(["kardus", "kontainer"]);
const SUMMARY_SWAP_DELAY_MS = 420;
const SUMMARY_ROTATE_INTERVAL_MS = 4600;

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (SUPPORTED_LANGUAGES.has(saved)) {
      return saved;
    }
  } catch {}
  return DEFAULT_LANGUAGE;
}

function createLookup(labelSets) {
  const lookup = {};
  Object.values(labelSets).forEach((set) => {
    Object.entries(set).forEach(([code, label]) => {
      lookup[String(label).toLowerCase()] = code;
    });
  });
  Object.keys(labelSets[DEFAULT_LANGUAGE] || {}).forEach((code) => {
    lookup[code.toLowerCase()] = code;
  });
  return lookup;
}

function m(key, params = {}) {
  let text = messages[state.language]?.[key] || messages[DEFAULT_LANGUAGE]?.[key] || key;
  Object.entries(params).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, String(value));
  });
  return text;
}

function cropLabel(code) {
  return cropLabelMap[state.language]?.[code] || cropLabelMap[DEFAULT_LANGUAGE]?.[code] || code;
}

function harvestLabel(code) {
  return harvestLabelMap[state.language]?.[code] || harvestLabelMap[DEFAULT_LANGUAGE]?.[code] || code;
}

function unitLabel(unit) {
  return unitLabelMap[state.language]?.[unit] || unitLabelMap[DEFAULT_LANGUAGE]?.[unit] || unit;
}

function roleLabel(role) {
  const labels = {
    ADMIN: { ja: "管理者", id: "Admin" },
    STAFF: { ja: "スタッフ", id: "Staff" },
  };
  return labels[role]?.[state.language] || role;
}

function activityLabel(type) {
  const labels = {
    PANEN: { ja: "収穫", id: "Panen" },
    HARVEST: { ja: "収穫", id: "Panen" },
    PENYEMPROTAN: { ja: "散布", id: "Penyemprotan" },
    SPRAY: { ja: "散布", id: "Penyemprotan" },
    PENANAMAN: { ja: "植え付け", id: "Penanaman" },
    PLANTING: { ja: "植え付け", id: "Penanaman" },
  };
  return labels[type]?.[state.language] || type;
}

function translateServerMessage(message) {
  const map = {
    "Belum login.": { ja: "ログインしていません。", id: "Belum login." },
    "Sesi tidak valid. Silakan login lagi.": { ja: "セッションが無効です。もう一度ログインしてください。", id: "Sesi tidak valid. Silakan login lagi." },
    "Format startDate tidak valid.": { ja: "startDate の形式が正しくありません。", id: "Format startDate tidak valid." },
    "Format endDate tidak valid.": { ja: "endDate の形式が正しくありません。", id: "Format endDate tidak valid." },
    "Jenis panen tidak valid.": { ja: "収穫種類が正しくありません。", id: "Jenis panen tidak valid." },
    "Format email tidak valid.": { ja: "メール形式が正しくありません。", id: "Format email tidak valid." },
    "Password wajib diisi.": { ja: "パスワードを入力してください。", id: "Password wajib diisi." },
    "Email atau password salah.": { ja: "メールまたはパスワードが間違っています。", id: "Email atau password salah." },
    "Nilai crop tidak valid.": { ja: "作物の値が正しくありません。", id: "Nilai crop tidak valid." },
    "Catatan wajib diisi.": { ja: "メモを入力してください。", id: "Catatan wajib diisi." },
    "Tanaman wajib Horenso, Terong, atau Konyaku.": { ja: "作物は Horenso、Terong、Konyaku のいずれかである必要があります。", id: "Tanaman wajib Horenso, Terong, atau Konyaku." },
    "Tanggal wajib diisi dengan format YYYY-MM-DD.": { ja: "日付は YYYY-MM-DD 形式で入力してください。", id: "Tanggal wajib diisi dengan format YYYY-MM-DD." },
    "Tempat wajib diisi.": { ja: "場所を入力してください。", id: "Tempat wajib diisi." },
    "ID tidak valid.": { ja: "ID が正しくありません。", id: "ID tidak valid." },
    "Field spray tidak lengkap atau tidak valid.": { ja: "散布データが不足しているか正しくありません。", id: "Field spray tidak lengkap atau tidak valid." },
    "Data tidak ditemukan.": { ja: "データが見つかりません。", id: "Data tidak ditemukan." },
    "Tanggal wajib valid.": { ja: "有効な日付を入力してください。", id: "Tanggal wajib valid." },
    "Field penanaman tidak lengkap atau tidak valid.": { ja: "植え付けデータが不足しているか正しくありません。", id: "Field penanaman tidak lengkap atau tidak valid." },
    "Jumlah wajib angka >= 0.": { ja: "数量は 0 以上の数値である必要があります。", id: "Jumlah wajib angka >= 0." },
    "Satuan panen harus kardus atau kontainer.": { ja: "収穫単位は kardus または kontainer である必要があります。", id: "Satuan panen harus kardus atau kontainer." },
    "Field panen tidak lengkap atau tidak valid.": { ja: "収穫データが不足しているか正しくありません。", id: "Field panen tidak lengkap atau tidak valid." },
    "Terjadi kesalahan server.": { ja: "サーバーエラーが発生しました。", id: "Terjadi kesalahan server." },
  };
  return map[message]?.[state.language] || message || m("requestFailed");
}

function formatActiveUser(user) {
  return `${user.name} (${roleLabel(user.role)})`;
}

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
      throw new Error(translateServerMessage(body.message));
    }

    return body;
  } finally {
    setLoading(false);
  }
}

function getSummaryLines(summary) {
  return [
    m("summarySpray", { value: summary.sprayToday }),
    m("summaryPlanting", { value: summary.plantingToday }),
    m("summaryHarvestToday", { value: summary.harvestToday }),
    m("summaryHarvestWeek", { value: summary.harvestWeek }),
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
  }, SUMMARY_SWAP_DELAY_MS);
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
    }, SUMMARY_ROTATE_INTERVAL_MS);
  }
}

function renderPublicFallback(message) {
  const fallback = message || m("noData");
  setSummaryFallback("public-summary-line", fallback);
  $("public-spray-body").innerHTML = `<tr><td colspan="4">${fallback}</td></tr>`;
  $("public-planting-body").innerHTML = `<tr><td colspan="4">${fallback}</td></tr>`;
  $("public-harvest-body").innerHTML = `<tr><td colspan="6">${fallback}</td></tr>`;
  $("public-chart-note").textContent = fallback;
  applyResponsiveTableLabels();
}

function requireValue(value, name) {
  if (!String(value || "").trim()) {
    throw new Error(name);
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

function harvestCodeFromCellText(text) {
  return harvestFromLabel[String(text || "").trim().toLowerCase()] || "HORENSO";
}

function unitCodeFromCellText(text) {
  return unitFromLabel[String(text || "").trim().toLowerCase()] || "kardus";
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
      <button class="action-btn" data-action="edit" data-id="${id}" data-kind="${kind}">${m("edit")}</button>
      <button class="action-btn delete" data-action="delete" data-id="${id}" data-kind="${kind}">${m("delete")}</button>
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

function applyTranslations() {
  document.documentElement.lang = state.language;
  document.title = "Kebun Log Dashboard";

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    const table = {
      "language.label": { ja: "言語", id: "Bahasa" },
      "language.ja": { ja: "日本語", id: "Bahasa Jepang" },
      "language.id": { ja: "インドネシア語", id: "Bahasa Indonesia" },
      "brand.title": { ja: "Kebun Log Dashboard", id: "Kebun Log Dashboard" },
      "landing.description": { ja: "収穫結果、散布記録、植え付けをリアルタイムで公開表示します。", id: "Monitoring publik hasil panen, pencatatan penyemprotan, dan penanaman secara real-time." },
      "landing.login": { ja: "管理者ログイン", id: "Login Admin" },
      "loading.summary": { ja: "集計を読み込み中...", id: "Memuat ringkasan..." },
      "landing.chartTitle": { ja: "収穫グラフ（直近14日）", id: "Grafik Panen (14 Hari Terakhir)" },
      "loading.publicChart": { ja: "収穫グラフを読み込み中...", id: "Memuat grafik panen..." },
      "landing.latestHarvest": { ja: "最新の収穫結果", id: "Hasil Panen Terbaru" },
      "landing.sprayLog": { ja: "散布記録", id: "Pencatatan Penyemprotan" },
      "landing.plantingLog": { ja: "植え付け記録", id: "Pencatatan Penanaman" },
      "table.date": { ja: "日付", id: "Tanggal" },
      "table.harvestType": { ja: "収穫種類", id: "Jenis Panen" },
      "table.quantity": { ja: "数量", id: "Jumlah" },
      "table.unit": { ja: "単位", id: "Satuan" },
      "table.location": { ja: "場所", id: "Tempat" },
      "table.note": { ja: "メモ", id: "Catatan" },
      "table.crop": { ja: "作物", id: "Tanaman" },
      "login.title": { ja: "管理者ログイン", id: "Login Admin" },
      "login.description": { ja: "畑のデータを管理するにはログインしてください。", id: "Masuk untuk mengelola data kebun." },
      "field.email": { ja: "メール", id: "Email" },
      "field.password": { ja: "パスワード", id: "Password" },
      "login.submit": { ja: "ログイン", id: "Login" },
      "action.close": { ja: "閉じる", id: "Tutup" },
      "menu.button": { ja: "☰ メニュー", id: "☰ Menu" },
      "page.dashboard": { ja: "ダッシュボード", id: "Dashboard" },
      "page.spray": { ja: "散布", id: "Penyemprotan" },
      "page.planting": { ja: "植え付け", id: "Penanaman" },
      "page.harvest": { ja: "収穫", id: "Panen" },
      "auth.logout": { ja: "ログアウト", id: "Logout" },
      "dashboard.chartTitle": { ja: "日別収穫グラフ", id: "Grafik Panen per Hari" },
      "filter.from": { ja: "開始", id: "Dari" },
      "filter.to": { ja: "終了", id: "Sampai" },
      "field.harvestType": { ja: "収穫種類", id: "Jenis Panen" },
      "option.all": { ja: "すべて", id: "Semua" },
      "crop.HORENSO": { ja: "ほうれん草", id: "Horenso" },
      "crop.TERONG": { ja: "ナス", id: "Terong" },
      "crop.KONYAKU": { ja: "こんにゃく", id: "Konyaku" },
      "harvest.KONTENER_HORENSO": { ja: "ほうれん草コンテナ", id: "Kontener Horenso" },
      "action.show": { ja: "表示", id: "Tampilkan" },
      "table.totalQuantity": { ja: "合計数量", id: "Total Jumlah" },
      "dashboard.recent": { ja: "最新アクティビティ", id: "Aktivitas Terbaru" },
      "table.type": { ja: "種類", id: "Jenis" },
      "table.detail": { ja: "詳細", id: "Detail" },
      "table.createdBy": { ja: "作成者", id: "Dibuat Oleh" },
      "field.crop": { ja: "作物", id: "Tanaman" },
      "field.note": { ja: "メモ", id: "Catatan" },
      "field.date": { ja: "日付", id: "Tanggal" },
      "field.location": { ja: "場所", id: "Tempat" },
      "action.cancelEdit": { ja: "編集をキャンセル", id: "Batal Edit" },
      "action.filter": { ja: "絞り込む", id: "Filter" },
      "table.action": { ja: "操作", id: "Aksi" },
      "field.quantity": { ja: "数量", id: "Jumlah" },
      "field.unit": { ja: "単位", id: "Satuan" },
      "unit.kardus": { ja: "箱", id: "kardus" },
      "unit.kontainer": { ja: "コンテナ", id: "kontainer" },
      "field.type": { ja: "種類", id: "Jenis" },
      "loading.general": { ja: "読み込み中...", id: "Memuat..." },
      "loading.harvestData": { ja: "収穫データを読み込み中...", id: "Memuat data panen..." },
      "loading.sprayData": { ja: "散布データを読み込み中...", id: "Memuat data penyemprotan..." },
      "loading.plantingData": { ja: "植え付けデータを読み込み中...", id: "Memuat data penanaman..." },
      "harvest.HORENSO": { ja: "ほうれん草", id: "Horenso" },
      "harvest.TERONG": { ja: "ナス", id: "Terong" },
      "harvest.KONYAKU": { ja: "こんにゃく", id: "Konyaku" },
    };
    if (table[key]) {
      node.textContent = table[key][state.language];
    }
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    if (node.dataset.i18nAriaLabel === "menu.aria") {
      node.setAttribute("aria-label", state.language === "ja" ? "メニューを開く" : "Buka menu");
    }
  });

  document.querySelectorAll("[data-i18n-alt]").forEach((node) => {
    node.setAttribute("alt", state.language === "ja" ? "Kebunロゴ" : "Logo Kebun");
  });

  $("language-select").value = state.language;
  $("spray-submit").textContent = $("spray-id").value ? m("updateSpray") : m("saveSpray");
  $("planting-submit").textContent = $("planting-id").value ? m("updatePlanting") : m("savePlanting");
  $("harvest-submit").textContent = $("harvest-id").value ? m("updateHarvest") : m("saveHarvest");

  if (state.user) {
    $("active-user").textContent = formatActiveUser(state.user);
  }

  applyResponsiveTableLabels();
}

async function setLanguage(language) {
  state.language = SUPPORTED_LANGUAGES.has(language) ? language : DEFAULT_LANGUAGE;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language);
  } catch {}
  applyTranslations();
  if (state.user) {
    await loadPageData(state.page);
  } else {
    await loadPublicLanding();
  }
}

async function checkSession() {
  try {
    const result = await api("/api/auth/me");
    state.user = result.user;
    $("active-user").textContent = formatActiveUser(result.user);
    setModeAuthenticated(true);
    await loadPageData("dashboard");
  } catch {
    state.user = null;
    setModeAuthenticated(false);
    try {
      await loadPublicLanding();
    } catch (error) {
      renderPublicFallback(m("publicUnavailable"));
      toast(error.message, true);
    }
  }
}

async function onLogin(event) {
  event.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  try {
    requireValue(email, m("emailRequired"));
    requireValue(password, m("passwordRequired"));

    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    state.user = result.user;
    $("active-user").textContent = formatActiveUser(result.user);
    setModeAuthenticated(true);
    $("login-form").reset();
    toast(m("loginSuccess"));
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
    toast(m("logoutSuccess"));
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadPublicLanding() {
  const startDate = daysAgoISO(13);
  const endDate = todayISO();
  const [summary, sprays, plantings, harvests, chartSeries] = await Promise.all([
    api("/api/public/summary"),
    api("/api/public/sprays"),
    api("/api/public/plantings"),
    api("/api/public/harvests"),
    loadSeparatedHarvestSeries("/api/public/charts/harvest-daily", startDate, endDate),
  ]);

  startSummaryAnimation("public-summary-line", getSummaryLines(summary.summary));

  const sprayHtml = sprays.items
    .map(
      (item) => `<tr>
      <td>${item.date}</td>
      <td>${cropLabel(item.crop)}</td>
      <td>${item.location || "-"}</td>
      <td>${item.note || "-"}</td>
    </tr>`
    )
    .join("");
  $("public-spray-body").innerHTML = sprayHtml || `<tr><td colspan="4">${m("emptySpray")}</td></tr>`;

  const plantingHtml = plantings.items
    .map(
      (item) => `<tr>
      <td>${item.date}</td>
      <td>${cropLabel(item.crop)}</td>
      <td>${item.location || "-"}</td>
      <td>${item.note || "-"}</td>
    </tr>`
    )
    .join("");
  $("public-planting-body").innerHTML = plantingHtml || `<tr><td colspan="4">${m("emptyPlanting")}</td></tr>`;

  const harvestHtml = harvests.items
    .map(
      (item) => `<tr>
      <td>${item.date}</td>
      <td>${harvestLabel(item.harvest_type)}</td>
      <td>${item.qty}</td>
      <td>${unitLabel(item.unit)}</td>
      <td>${item.location || "-"}</td>
      <td>${item.note || "-"}</td>
    </tr>`
    )
    .join("");
  $("public-harvest-body").innerHTML = harvestHtml || `<tr><td colspan="6">${m("emptyHarvest")}</td></tr>`;

  const labels = chartSeries.labels || [];
  const lineDatasets = harvestTypes.map((harvestType) => {
    const style = harvestChartStyle[harvestType];
    const byDate = chartSeries.dateMaps?.[harvestType] || new Map();
    return {
      label: harvestLabel(harvestType),
      data: labels.map((date) => byDate.get(date) || 0),
      borderColor: style.border,
      backgroundColor: style.background,
      fill: false,
      tension: 0.32,
      pointRadius: 2.5,
    };
  });

  const chartLabels = labels.length ? labels : [m("chartEmptyLabel")];
  const chartDatasets = labels.length ? lineDatasets : lineDatasets.map((dataset) => ({ ...dataset, data: [0] }));
  renderPublicChart(chartLabels, chartDatasets);
  $("public-chart-note").textContent = labels.length ? m("chartNote") : m("chartNoData");
  applyResponsiveTableLabels();
}

function renderPublicChart(labels, datasets) {
  const ctx = $("public-harvest-chart").getContext("2d");
  if (state.publicChart) {
    state.publicChart.destroy();
  }

  state.publicChart = new Chart(ctx, {
    type: "line",
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

async function loadDashboard() {
  const [summary, recent] = await Promise.all([
    api("/api/dashboard/summary"),
    api("/api/dashboard/recent"),
  ]);

  startSummaryAnimation("summary-line", getSummaryLines(summary.summary));

  const html = recent.items
    .map((item) => {
      const isHarvest = item.activity_type === "PANEN" || item.activity_type === "HARVEST";
      const detail = isHarvest ? harvestLabel(item.detail) : cropLabel(item.detail);
      const note = item.qty !== null && item.qty !== undefined ? `${item.qty} ${unitLabel(item.unit)} | ${item.note || "-"}` : item.note || "-";
      return `<tr>
        <td>${item.date}</td>
        <td>${activityLabel(item.activity_type)}</td>
        <td>${detail}</td>
        <td>${item.location || "-"}</td>
        <td>${note}</td>
        <td>${item.created_by_name}</td>
      </tr>`;
    })
    .join("");

  $("recent-body").innerHTML = html || `<tr><td colspan="6">${m("emptyRecent")}</td></tr>`;
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
  $("spray-submit").textContent = m("saveSpray");
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
      <td>${cropLabel(item.crop)}</td>
      <td>${item.location}</td>
      <td>${item.note}</td>
      <td>${item.created_by_name}</td>
      <td>${actionButtons(item.id, "spray")}</td>
    </tr>`
    )
    .join("");
  $("spray-body").innerHTML = html || `<tr><td colspan="6">${m("emptySpray")}</td></tr>`;
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
      toast(m("sprayUpdated"));
    } else {
      await api("/api/sprays", { method: "POST", body: JSON.stringify(payload) });
      toast(m("sprayCreated"));
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
    if (!confirm(m("confirmDeleteSpray"))) {
      return;
    }
    try {
      await api(`/api/sprays/${id}`, { method: "DELETE" });
      toast(m("sprayDeleted"));
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
  $("spray-submit").textContent = m("updateSpray");
  $("spray-cancel").classList.remove("hidden");
}

function resetPlantingForm() {
  $("planting-id").value = "";
  $("planting-form").reset();
  $("planting-date").value = todayISO();
  $("planting-submit").textContent = m("savePlanting");
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
      <td>${cropLabel(item.crop)}</td>
      <td>${item.location}</td>
      <td>${item.note}</td>
      <td>${item.created_by_name}</td>
      <td>${actionButtons(item.id, "planting")}</td>
    </tr>`
    )
    .join("");
  $("planting-body").innerHTML = html || `<tr><td colspan="6">${m("emptyPlanting")}</td></tr>`;
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
      toast(m("plantingUpdated"));
    } else {
      await api("/api/plantings", { method: "POST", body: JSON.stringify(payload) });
      toast(m("plantingCreated"));
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
    if (!confirm(m("confirmDeletePlanting"))) {
      return;
    }
    try {
      await api(`/api/plantings/${id}`, { method: "DELETE" });
      toast(m("plantingDeleted"));
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
  $("planting-submit").textContent = m("updatePlanting");
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
  $("harvest-submit").textContent = m("saveHarvest");
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
      <td>${harvestLabel(item.harvest_type)}</td>
      <td>${item.qty}</td>
      <td>${unitLabel(item.unit)}</td>
      <td>${item.location || "-"}</td>
      <td>${item.note || "-"}</td>
      <td>${item.created_by_name}</td>
      <td>${actionButtons(item.id, "harvest")}</td>
    </tr>`
    )
    .join("");
  $("harvest-body").innerHTML = html || `<tr><td colspan="8">${m("emptyHarvest")}</td></tr>`;
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
      toast(m("harvestUpdated"));
    } else {
      await api("/api/harvests", { method: "POST", body: JSON.stringify(payload) });
      toast(m("harvestCreated"));
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
    if (!confirm(m("confirmDeleteHarvest"))) {
      return;
    }
    try {
      await api(`/api/harvests/${id}`, { method: "DELETE" });
      toast(m("harvestDeleted"));
      await Promise.all([loadHarvests(), loadDashboard(), refreshChartWhenDashboardVisible()]);
    } catch (error) {
      toast(error.message, true);
    }
    return;
  }

  const row = button.closest("tr");

  $("harvest-id").value = id;
  $("harvest-date").value = row.children[0].textContent;
  $("harvest-type").value = harvestCodeFromCellText(row.children[1].textContent);
  $("harvest-qty").value = row.children[2].textContent;
  $("harvest-unit").value = unitCodeFromCellText(row.children[3].textContent);
  $("harvest-location").value = row.children[4].textContent === "-" ? "" : row.children[4].textContent;
  $("harvest-note").value = row.children[5].textContent === "-" ? "" : row.children[5].textContent;
  $("harvest-submit").textContent = m("updateHarvest");
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
      label: harvestLabel(harvestType),
      data: labels.map((date) => byDate.get(date) || 0),
      borderColor: style.border,
      backgroundColor: style.background,
      borderWidth: 1,
    };
  });

  return { labels, datasets, dateMaps };
}

function renderCombinedChartTable(labels, dateMaps) {
  const headers = [m("date"), ...harvestTypes.map((type) => harvestLabel(type)), m("total")];
  setChartTableHeader(headers);

  if (!labels.length) {
    $("chart-body").innerHTML = `<tr><td colspan="${headers.length}">${m("emptyChart")}</td></tr>`;
    return;
  }

  const html = labels
    .map((date) => {
      const values = harvestTypes.map((type) => dateMaps[type]?.get(date) || 0);
      const total = values.reduce((sum, value) => sum + value, 0);
      return `<tr>
        <td>${date}</td>
        ${values.map((value) => `<td>${value}</td>`).join("")}
        <td>${total}</td>
      </tr>`;
    })
    .join("");

  $("chart-body").innerHTML = html;
}

function renderSingleChartTable(items, harvestType) {
  const label = harvestLabel(harvestType);
  setChartTableHeader([m("date"), m("quantityLabel", { label })]);

  const html = items.map((item) => `<tr><td>${item.date}</td><td>${Number(item.total_qty) || 0}</td></tr>`).join("");
  $("chart-body").innerHTML = html || `<tr><td colspan="2">${m("emptyChart")}</td></tr>`;
}

async function loadChart() {
  const startDate = $("chart-start").value;
  const endDate = $("chart-end").value;
  const harvestType = $("chart-type").value;

  if (harvestType === "ALL") {
    const { labels, datasets, dateMaps } = await loadSeparatedHarvestSeries("/api/charts/harvest-daily", startDate, endDate);
    const chartLabels = labels.length ? labels : [m("chartEmptyLabel")];
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
    labels.length ? labels : [m("chartEmptyLabel")],
    [
      {
        label: m("quantityLabel", { label: harvestLabel(harvestType) }),
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
  $("language-select").addEventListener("change", (event) => {
    setLanguage(event.target.value).catch((error) => {
      if (!state.user) {
        renderPublicFallback(m("publicUnavailable"));
      }
      toast(error.message, true);
    });
  });

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
  applyTranslations();
  installEvents();
  setInitialValues();
  applyResponsiveTableLabels();
  await checkSession();
}

bootstrap();


