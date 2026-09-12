/**
 * APPLICATION BOOTSTRAP (APP.JS)
 * Điểm khởi chạy chính - Kết nối các Module Controller theo kiến trúc Module hóa
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Khởi tạo CSDL Quan hệ nhúng (IndexedDB)
  const dbEngine = new DatabaseEngine();
  try {
    await dbEngine.init();
    console.log("MedExpertDB Relational Engine initialized successfully.");
  } catch (e) {
    console.error("Không thể khởi tạo Database Engine:", e);
  }

  // 2. Khởi tạo Core Model & Inference Engines
  const kbManager = new KnowledgeBaseManager(dbEngine);
  const forwardEngine = new ForwardChainingEngine(kbManager.getKB());
  const backwardEngine = new BackwardChainingEngine(kbManager.getKB());
  const rpgVisualizer = new RPGVisualizer("rpgCanvas");

  // =========================================================================
  // 3. KHỞI TẠO CÁC FEATURE CONTROLLERS
  // =========================================================================

  // Feature: Quản trị CSDL & SQL Console
  const dbController = new DatabaseController({
    dbEngine,
    kbManager,
    onResetComplete: () => {
      diagnosisController.renderSymptomsList();
      kbController.renderTables();
      populateDiseaseFilters();
      updateRPGGraph();
    }
  });

  // Feature: Chẩn đoán & Suy diễn
  const diagnosisController = new DiagnosisController({
    kbManager,
    forwardEngine,
    backwardEngine,
    onInferenceComplete: (inferenceResult, selectedSymptoms) => {
      // Cập nhật đường đi trên đồ thị RPG
      const activeFacts = new Set(Object.keys(selectedSymptoms || {}));
      const firedRules = new Set((inferenceResult ? inferenceResult.firedRules : []).map(r => r.ruleId));
      const filterSelect = document.getElementById("rpgDiseaseFilter");
      const diseaseFilter = filterSelect ? filterSelect.value : "ALL";
      rpgVisualizer.setData(kbManager.getKB(), activeFacts, firedRules, diseaseFilter);

      // Tự động lưu phiên chẩn đoán vào CSDL
      if (dbEngine && dbEngine.isReady && inferenceResult && (inferenceResult.results || []).length > 0) {
        dbEngine.saveInferenceSession(selectedSymptoms, inferenceResult.results, inferenceResult.traceLogs)
          .then(() => dbController.updateStats())
          .catch(err => console.warn("Lỗi lưu phiên chẩn đoán:", err));
      }
    },
    onFocusGraph: (diseaseId) => {
      sessionStorage.setItem("RPG_ACTIVE_SYMPTOMS", JSON.stringify(diagnosisController.currentSelectedSymptoms || {}));
      if (diagnosisController.lastInferenceResult) {
        sessionStorage.setItem("RPG_FIRED_RULES", JSON.stringify(diagnosisController.lastInferenceResult.firedRules || []));
      }
      window.location.href = `chuc_nang/do_thi_rpg/do_thi_rpg.html?focus=${diseaseId}`;
    }
  });

  // Feature: Quản trị Cơ sở tri thức (Rules, Symptoms, Diseases CRUD)
  const kbController = new KBController({
    kbManager
  });

  // Feature: Ca bệnh kiểm thử mẫu
  const testcasesController = new TestCasesController({
    kbManager,
    onLoadTestCase: (symptomsMap) => {
      const diagNavBtn = document.querySelector('[data-tab="tab-diagnosis"]');
      if (diagNavBtn) diagNavBtn.click();
      diagnosisController.setSymptoms(symptomsMap);
    }
  });

  // =========================================================================
  // 4. XỬ LÝ THEME SÁNG / TỐI (THEME SWITCHER)
  // =========================================================================
  const btnThemeToggle = document.getElementById("btnThemeToggle");
  const themeToggleIcon = document.getElementById("themeToggleIcon");

  function initTheme() {
    const savedTheme = localStorage.getItem("MED_EXPERT_THEME") || "dark";
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      if (themeToggleIcon) {
        themeToggleIcon.className = "fa-solid fa-sun";
        themeToggleIcon.style.color = "#f59e0b";
      }
    } else {
      document.documentElement.removeAttribute("data-theme");
      if (themeToggleIcon) {
        themeToggleIcon.className = "fa-solid fa-moon";
        themeToggleIcon.style.color = "";
      }
    }
    localStorage.setItem("MED_EXPERT_THEME", theme);
    if (rpgVisualizer) {
      rpgVisualizer.render();
    }
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", () => {
      const isCurrentlyLight = document.documentElement.getAttribute("data-theme") === "light";
      applyTheme(isCurrentlyLight ? "dark" : "light");
    });
  }

  initTheme();

  // =========================================================================
  // 5. ĐIỀU PHỐI ĐỒ THỊ RPG
  // =========================================================================
  function updateRPGGraph() {
    const kb = kbManager.getKB();
    const activeFacts = new Set(Object.keys(diagnosisController.currentSelectedSymptoms || {}));
    const firedRules = new Set((diagnosisController.lastInferenceResult ? diagnosisController.lastInferenceResult.firedRules : []).map(r => r.ruleId));
    const filterSelect = document.getElementById("rpgDiseaseFilter");
    const diseaseFilter = filterSelect ? filterSelect.value : "ALL";

    rpgVisualizer.setData(kb, activeFacts, firedRules, diseaseFilter);
  }

  function populateDiseaseFilters() {
    const filterSelect = document.getElementById("rpgDiseaseFilter");
    if (!filterSelect) return;
    const kb = kbManager.getKB();
    const currentVal = filterSelect.value;

    filterSelect.innerHTML = `<option value="ALL">-- Tất cả mạng luật (${(kb.rules || []).length} luật) --</option>`;
    (kb.diseases || []).forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `[${d.id}] ${d.name}`;
      filterSelect.appendChild(opt);
    });

    if (currentVal) filterSelect.value = currentVal;
  }

  const rpgDiseaseFilter = document.getElementById("rpgDiseaseFilter");
  if (rpgDiseaseFilter) {
    rpgDiseaseFilter.addEventListener("change", () => updateRPGGraph());
  }

  const btnZoomIn = document.getElementById("btnZoomIn");
  if (btnZoomIn) btnZoomIn.addEventListener("click", () => rpgVisualizer.zoomIn());

  const btnZoomOut = document.getElementById("btnZoomOut");
  if (btnZoomOut) btnZoomOut.addEventListener("click", () => rpgVisualizer.zoomOut());

  const btnResetGraph = document.getElementById("btnResetGraph");
  if (btnResetGraph) btnResetGraph.addEventListener("click", () => rpgVisualizer.resetView());

  // =========================================================================
  // 6. XỬ LÝ CHUYỂN TAB & SUB-TAB
  // =========================================================================
  const navButtons = document.querySelectorAll(".nav-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTabId = btn.getAttribute("data-tab");

      navButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(tc => tc.classList.remove("active"));

      btn.classList.add("active");
      const targetContent = document.getElementById(targetTabId);
      if (targetContent) {
        targetContent.classList.add("active");
      }

      if (targetTabId === "tab-rpg") {
        setTimeout(() => {
          rpgVisualizer.resizeCanvas();
          updateRPGGraph();
        }, 50);
      }

      if (targetTabId === "tab-db") {
        dbController.updateStats();
        const selector = document.getElementById("dbTableSelector");
        if (selector) dbController.renderTableExplorer(selector.value);
      }
    });
  });

  const kbSubtabBtns = document.querySelectorAll(".kb-subtab-btn");
  kbSubtabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      kbSubtabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const subtab = btn.getAttribute("data-subtab");

      document.getElementById("subtab-rules").style.display = subtab === "rules-table" ? "block" : "none";
      document.getElementById("subtab-symptoms").style.display = subtab === "symptoms-table" ? "block" : "none";
      document.getElementById("subtab-diseases").style.display = subtab === "diseases-table" ? "block" : "none";
    });
  });

  // =========================================================================
  // 7. LẮNG NGHE THAY ĐỔI CƠ SỞ TRI THỨC
  // =========================================================================
  kbManager.onUpdate((updatedKB) => {
    forwardEngine.setKnowledgeBase(updatedKB);
    backwardEngine.setKnowledgeBase(updatedKB);
    diagnosisController.renderSymptomsList();
    kbController.renderTables();
    populateDiseaseFilters();
    updateRPGGraph();
    dbController.updateStats();
  });

  // Đóng modal
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const modalId = e.currentTarget.getAttribute("data-close");
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove("active");
    });
  });

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove("active");
      }
    });
  });

  // =========================================================================
  // 8. KHỞI TẠO DỮ LIỆU BAN ĐẦU
  // =========================================================================
  diagnosisController.renderSymptomsList();
  kbController.renderTables();
  populateDiseaseFilters();
  testcasesController.renderTestCases();
  updateRPGGraph();
  dbController.updateStats();
  const initialTable = document.getElementById("dbTableSelector");
  if (initialTable) dbController.renderTableExplorer(initialTable.value);
});
