/**
 * ============================================================================
 * ĐIỀU KHIỂN LỊCH SỬ CHẨN ĐOÁN & SUY DIỄN (MED-EXPERT)
 * ============================================================================
 * Quản lý danh sách phiên, lọc/tìm kiếm, xem chi tiết vết suy luận,
 * xuất PDF phiếu chẩn đoán y tế, xóa phiên và chẩn đoán lại.
 */

class HistoryController {
  constructor({ dbEngine, kbManager }) {
    this.dbEngine = dbEngine;
    this.kbManager = kbManager;

    this.allSessions = [];
    this.filteredSessions = [];
    this.currentSelectedSession = null;

    // Phân trang danh sách phiên chẩn đoán
    this.pagination = {
      page: 1,
      pageSize: 10
    };

    this.initElements();
    this.bindEvents();
    this.initData();
  }

  initElements() {
    // Stats
    this.statTotal = document.getElementById("statTotal");
    this.statIdentified = document.getElementById("statIdentified");
    this.statUnknown = document.getElementById("statUnknown");
    this.statAvgCF = document.getElementById("statAvgCF");

    // Filters
    this.filterSearch = document.getElementById("filterSearch");
    this.filterDisease = document.getElementById("filterDisease");
    this.filterCFRange = document.getElementById("filterCFRange");
    this.groupCFCustom = document.getElementById("groupCFCustom");
    this.filterCFMin = document.getElementById("filterCFMin");
    this.filterCFMax = document.getElementById("filterCFMax");
    this.filterDateFrom = document.getElementById("filterDateFrom");
    this.filterDateTo = document.getElementById("filterDateTo");
    this.btnResetFilter = document.getElementById("btnResetFilter");

    // Actions
    this.btnRefresh = document.getElementById("btnRefreshHistory");
    this.btnClearAll = document.getElementById("btnClearAllHistory");

    // Table & Pagination
    this.tableBody = document.getElementById("historyTableBody");
    this.emptyState = document.getElementById("historyEmptyState");
    this.paginationContainer = document.getElementById("paginationHistory");

    // Detail Modal
    this.modalDetail = document.getElementById("modalSessionDetail");
    this.modalSessionId = document.getElementById("modalSessionId");
    this.modalSessionTime = document.getElementById("modalSessionTime");
    this.modalBtnExportPDF = document.getElementById("modalBtnExportPDF");
    this.modalBtnReDiagnose = document.getElementById("modalBtnReDiagnose");
    this.modalBtnClose = document.getElementById("modalBtnClose");

    // Detail Panes
    this.paneSymptoms = document.getElementById("paneSymptoms");
    this.paneResults = document.getElementById("paneResults");
    this.paneRules = document.getElementById("paneRules");
    this.paneTrace = document.getElementById("paneTrace");
    this.paneRPG = document.getElementById("paneRPG");
    this.paneFPG = document.getElementById("paneFPG");

    // Modal Action Buttons
    this.modalBtnOpenRPG = document.getElementById("modalBtnOpenRPG");
    this.modalBtnOpenFPG = document.getElementById("modalBtnOpenFPG");
    this.btnOpenFullRPG = document.getElementById("btnOpenFullRPG");
    this.btnOpenFullFPG = document.getElementById("btnOpenFullFPG");

    // Modal Canvas Zoom / Fit Buttons
    this.btnZoomInRPG = document.getElementById("btnZoomInRPG");
    this.btnZoomOutRPG = document.getElementById("btnZoomOutRPG");
    this.btnResetRPG = document.getElementById("btnResetRPG");

    this.btnZoomInFPG = document.getElementById("btnZoomInFPG");
    this.btnZoomOutFPG = document.getElementById("btnZoomOutFPG");
    this.btnResetFPG = document.getElementById("btnResetFPG");

    // Visualizers
    this.rpgVisualizer = null;
    this.fpgVisualizer = null;

    // Tab buttons
    this.tabButtons = document.querySelectorAll(".history-detail-tab-btn");
  }

  bindEvents() {
    if (this.filterSearch) {
      this.filterSearch.addEventListener("input", () => this.applyFilters());
    }
    if (this.filterDisease) {
      this.filterDisease.addEventListener("change", () => this.applyFilters());
    }
    if (this.filterCFRange) {
      this.filterCFRange.addEventListener("change", () => {
        if (this.groupCFCustom) {
          this.groupCFCustom.style.display = this.filterCFRange.value === "custom" ? "flex" : "none";
        }
        this.applyFilters();
      });
    }
    if (this.filterCFMin) {
      this.filterCFMin.addEventListener("input", () => this.applyFilters());
    }
    if (this.filterCFMax) {
      this.filterCFMax.addEventListener("input", () => this.applyFilters());
    }
    if (this.filterDateFrom) {
      this.filterDateFrom.addEventListener("change", () => this.applyFilters());
    }
    if (this.filterDateTo) {
      this.filterDateTo.addEventListener("change", () => this.applyFilters());
    }
    if (this.btnResetFilter) {
      this.btnResetFilter.addEventListener("click", () => this.resetFilters());
    }

    if (this.btnRefresh) {
      this.btnRefresh.addEventListener("click", () => this.loadSessions());
    }

    if (this.btnClearAll) {
      this.btnClearAll.addEventListener("click", () => this.handleClearAll());
    }

    // Modal tabs
    this.tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        this.switchDetailTab(tab);
      });
    });

    if (this.modalBtnClose) {
      this.modalBtnClose.addEventListener("click", () => this.closeDetailModal());
    }

    if (this.modalDetail) {
      this.modalDetail.addEventListener("click", (e) => {
        if (e.target === this.modalDetail) this.closeDetailModal();
      });
    }

    if (this.modalBtnExportPDF) {
      this.modalBtnExportPDF.addEventListener("click", () => {
        if (this.currentSelectedSession && window.MauBaoCaoYTe) {
          window.MauBaoCaoYTe.xuatBaoCaoPDF(this.currentSelectedSession, this.kbManager.getKB());
        }
      });
    }

    if (this.modalBtnReDiagnose) {
      this.modalBtnReDiagnose.addEventListener("click", () => {
        if (this.currentSelectedSession) {
          this.reDiagnose(this.currentSelectedSession);
        }
      });
    }

    // RPG / FPG Actions
    if (this.modalBtnOpenRPG) {
      this.modalBtnOpenRPG.addEventListener("click", () => this.openDedicatedGraphPage("rpg", this.currentSelectedSession));
    }
    if (this.modalBtnOpenFPG) {
      this.modalBtnOpenFPG.addEventListener("click", () => this.openDedicatedGraphPage("fpg", this.currentSelectedSession));
    }
    if (this.btnOpenFullRPG) {
      this.btnOpenFullRPG.addEventListener("click", () => this.openDedicatedGraphPage("rpg", this.currentSelectedSession));
    }
    if (this.btnOpenFullFPG) {
      this.btnOpenFullFPG.addEventListener("click", () => this.openDedicatedGraphPage("fpg", this.currentSelectedSession));
    }

    // RPG Zoom / Fit
    if (this.btnZoomInRPG) {
      this.btnZoomInRPG.addEventListener("click", () => this.rpgVisualizer && this.rpgVisualizer.zoomIn());
    }
    if (this.btnZoomOutRPG) {
      this.btnZoomOutRPG.addEventListener("click", () => this.rpgVisualizer && this.rpgVisualizer.zoomOut());
    }
    if (this.btnResetRPG) {
      this.btnResetRPG.addEventListener("click", () => this.rpgVisualizer && this.rpgVisualizer.resetView());
    }

    // FPG Zoom / Fit
    if (this.btnZoomInFPG) {
      this.btnZoomInFPG.addEventListener("click", () => this.fpgVisualizer && this.fpgVisualizer.zoomIn());
    }
    if (this.btnZoomOutFPG) {
      this.btnZoomOutFPG.addEventListener("click", () => this.fpgVisualizer && this.fpgVisualizer.zoomOut());
    }
    if (this.btnResetFPG) {
      this.btnResetFPG.addEventListener("click", () => this.fpgVisualizer && this.fpgVisualizer.resetView());
    }
  }

  async initData() {
    this.populateDiseaseFilter();
    await this.loadSessions();
  }

  populateDiseaseFilter() {
    if (!this.filterDisease) return;
    const kb = this.kbManager.getKB();
    const diseases = kb.diseases || [];

    let html = '<option value="">-- Tất cả các bệnh --</option>';
    diseases.forEach(d => {
      html += `<option value="${d.name}">${d.name} (${d.id})</option>`;
    });
    this.filterDisease.innerHTML = html;
  }

  async loadSessions() {
    try {
      this.allSessions = await this.dbEngine.getInferenceSessions();
      this.applyFilters();
    } catch (e) {
      console.error("Lỗi nạp danh sách phiên chẩn đoán:", e);
    }
  }

  applyFilters() {
    const q = (this.filterSearch ? this.filterSearch.value : "").trim().toLowerCase();
    const diseaseFilter = (this.filterDisease ? this.filterDisease.value : "").trim();
    const cfRange = this.filterCFRange ? this.filterCFRange.value : "all";
    const cfMinVal = (this.filterCFMin && this.filterCFMin.value !== "") ? parseFloat(this.filterCFMin.value) : null;
    const cfMaxVal = (this.filterCFMax && this.filterCFMax.value !== "") ? parseFloat(this.filterCFMax.value) : null;
    const fromDateStr = this.filterDateFrom ? this.filterDateFrom.value : "";
    const toDateStr = this.filterDateTo ? this.filterDateTo.value : "";

    const fromTime = fromDateStr ? new Date(fromDateStr + "T00:00:00").getTime() : null;
    const toTime = toDateStr ? new Date(toDateStr + "T23:59:59").getTime() : null;

    this.filteredSessions = this.allSessions.filter(session => {
      // 1. Lọc từ khóa mã phiên hoặc bệnh
      if (q) {
        const idMatch = (session.id || "").toLowerCase().includes(q);
        const disMatch = (session.topDiseaseName || "").toLowerCase().includes(q);
        if (!idMatch && !disMatch) return false;
      }

      // 2. Lọc theo bệnh
      if (diseaseFilter) {
        const disName = session.topDiseaseName || "";
        if (disName !== diseaseFilter && session.topDiseaseId !== diseaseFilter) return false;
      }

      // 3. Lọc theo khoảng độ tin cậy CF
      const cf = Number(session.topCF || 0);
      const cfPercent = Math.round(cf * 100);

      if (cfRange === "very_high") {
        if (cfPercent < 80) return false;
      } else if (cfRange === "high") {
        if (cfPercent < 60 || cfPercent >= 80) return false;
      } else if (cfRange === "medium") {
        if (cfPercent < 40 || cfPercent >= 60) return false;
      } else if (cfRange === "low") {
        if (cfPercent >= 40) return false;
      } else if (cfRange === "custom") {
        if (cfMinVal !== null && !isNaN(cfMinVal) && cfPercent < cfMinVal) return false;
        if (cfMaxVal !== null && !isNaN(cfMaxVal) && cfPercent > cfMaxVal) return false;
      }

      // 4. Lọc theo khoảng ngày
      if (fromTime || toTime) {
        const sessionTime = new Date(session.timestamp || 0).getTime();
        if (fromTime && sessionTime < fromTime) return false;
        if (toTime && sessionTime > toTime) return false;
      }

      return true;
    });

    this.pagination.page = 1;
    this.renderStats();
    this.renderTable();
  }

  resetFilters() {
    if (this.filterSearch) this.filterSearch.value = "";
    if (this.filterDisease) this.filterDisease.value = "";
    if (this.filterCFRange) this.filterCFRange.value = "all";
    if (this.groupCFCustom) this.groupCFCustom.style.display = "none";
    if (this.filterCFMin) this.filterCFMin.value = "";
    if (this.filterCFMax) this.filterCFMax.value = "";
    if (this.filterDateFrom) this.filterDateFrom.value = "";
    if (this.filterDateTo) this.filterDateTo.value = "";
    this.applyFilters();
  }

  renderStats() {
    const total = this.filteredSessions.length;
    let identified = 0;
    let unknown = 0;
    let sumCF = 0;
    let validCFCount = 0;

    this.filteredSessions.forEach(s => {
      const cf = Number(s.topCF || 0);
      const isIdentified = cf >= 0.4 && s.topDiseaseName && s.topDiseaseName !== "Không xác định";

      if (isIdentified) {
        identified++;
        sumCF += cf;
        validCFCount++;
      } else {
        unknown++;
      }
    });

    const avgCF = validCFCount > 0 ? Math.round((sumCF / validCFCount) * 100) : 0;

    if (this.statTotal) this.statTotal.textContent = total;
    if (this.statIdentified) this.statIdentified.textContent = identified;
    if (this.statUnknown) this.statUnknown.textContent = unknown;
    if (this.statAvgCF) this.statAvgCF.textContent = avgCF + "%";
  }

  renderTable() {
    if (!this.tableBody) return;

    const totalItems = this.filteredSessions.length;
    if (totalItems === 0) {
      this.tableBody.innerHTML = "";
      if (this.emptyState) this.emptyState.style.display = "block";
      if (this.paginationContainer) this.paginationContainer.innerHTML = "";
      return;
    }

    if (this.emptyState) this.emptyState.style.display = "none";

    const { page, pageSize } = this.pagination;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const validPage = Math.min(Math.max(1, page), totalPages);
    this.pagination.page = validPage;

    const startIdx = (validPage - 1) * pageSize;
    const pageSessions = this.filteredSessions.slice(startIdx, startIdx + pageSize);

    const kb = this.kbManager.getKB();
    const symptomsKB = kb.symptoms || [];

    const rowsHtml = pageSessions.map((session) => {
      const timeStr = window.MauBaoCaoYTe ? window.MauBaoCaoYTe.dinhDangNgayGio(session.timestamp) : (session.timestamp || "");
      const cf = Number(session.topCF || 0);
      const cfPercent = Math.round(cf * 100);
      const disName = session.topDiseaseName || "Không xác định";

      // Phân tích trạng thái
      let statusBadge = '';
      if (cf >= 0.4 && disName !== "Không xác định") {
        statusBadge = `<span class="session-status-badge status-ok"><i class="fa-solid fa-circle-check"></i> Đã xác định (${cfPercent}%)</span>`;
      } else if (cf > 0) {
        statusBadge = `<span class="session-status-badge status-low"><i class="fa-solid fa-circle-exclamation"></i> Độ tin cậy thấp (${cfPercent}%)</span>`;
      } else {
        statusBadge = `<span class="session-status-badge status-unknown"><i class="fa-solid fa-circle-question"></i> Không xác định</span>`;
      }

      // Tóm tắt triệu chứng
      const symKeys = Object.keys(session.inputSymptoms || {});
      const symCount = symKeys.length;
      const symNamesPreview = symKeys.slice(0, 3).map(id => {
        const s = symptomsKB.find(x => x.id === id);
        return s ? s.name : id;
      }).join(", ");

      const symSummaryHtml = symCount > 0
        ? `<strong>${symCount}</strong> TC <span style="color: var(--text-muted); font-size: 0.78rem;">(${symNamesPreview}${symCount > 3 ? '...' : ''})</span>`
        : `<span style="color: var(--text-muted);">0 triệu chứng</span>`;

      return `
        <tr>
          <td style="color: var(--text-secondary); font-size: 0.8rem; white-space: nowrap;">
            <i class="fa-regular fa-clock" style="margin-right: 4px; color: var(--text-muted);"></i>${timeStr}
          </td>
          <td>
            <span class="session-code-pill">${session.id}</span>
          </td>
          <td style="max-width: 250px;">
            ${symSummaryHtml}
          </td>
          <td>
            <strong style="color: ${cf >= 0.4 ? 'var(--color-primary)' : 'var(--text-primary)'};">${disName}</strong>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 800; min-width: 35px;">${cfPercent}%</span>
              <div style="flex: 1; height: 6px; background: rgba(148, 163, 184, 0.2); border-radius: 999px; overflow: hidden; min-width: 60px;">
                <div style="height: 100%; width: ${cfPercent}%; background: ${cf >= 0.7 ? '#10b981' : (cf >= 0.4 ? '#3b82f6' : '#f59e0b')};"></div>
              </div>
            </div>
          </td>
          <td>
            ${statusBadge}
          </td>
          <td>
            <div class="row-action-btns">
              <button class="btn-row-action view-btn" data-action="view" data-id="${session.id}" title="Xem chi tiết phiên & Vết suy luận">
                <i class="fa-regular fa-eye"></i>
              </button>
              <button class="btn-row-action pdf-btn" data-action="pdf" data-id="${session.id}" title="Xuất phiếu kết quả PDF chuẩn y tế">
                <i class="fa-solid fa-file-pdf"></i>
              </button>
              <button class="btn-row-action rerun-btn" data-action="rerun" data-id="${session.id}" title="Nạp triệu chứng và chẩn đoán lại">
                <i class="fa-solid fa-rotate-right"></i>
              </button>
              <button class="btn-row-action del-btn" data-action="delete" data-id="${session.id}" title="Xóa phiên này">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.tableBody.innerHTML = rowsHtml;

    // Gắn sự kiện các nút trên từng dòng
    this.tableBody.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        const sessionId = btn.getAttribute("data-id");
        const session = this.allSessions.find(s => s.id === sessionId);
        if (!session) return;

        if (action === "view") this.openDetailModal(session);
        else if (action === "pdf") {
          if (window.MauBaoCaoYTe) window.MauBaoCaoYTe.xuatBaoCaoPDF(session, this.kbManager.getKB());
        } else if (action === "rerun") this.reDiagnose(session);
        else if (action === "delete") this.handleDeleteSession(sessionId);
      });
    });

    this.renderPaginationFooter(totalItems);
  }

  _buildPageNumbersHtml(page, totalPages) {
    if (totalPages <= 7) {
      let html = "";
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-page-step ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      return html;
    }

    if (page <= 4) {
      let html = "";
      for (let i = 1; i <= 5; i++) {
        html += `<button class="btn-page-step ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      return html + `<span class="pagination-ellipsis">...</span><button class="btn-page-step" data-page="${totalPages}">${totalPages}</button>`;
    }

    if (page >= totalPages - 3) {
      let html = `<button class="btn-page-step" data-page="1">1</button><span class="pagination-ellipsis">...</span>`;
      for (let i = totalPages - 4; i <= totalPages; i++) {
        html += `<button class="btn-page-step ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      return html;
    }

    let midHtml = "";
    for (let i = page - 1; i <= page + 1; i++) {
      midHtml += `<button class="btn-page-step ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    return `<button class="btn-page-step" data-page="1">1</button><span class="pagination-ellipsis">...</span>${midHtml}<span class="pagination-ellipsis">...</span><button class="btn-page-step" data-page="${totalPages}">${totalPages}</button>`;
  }

  renderPaginationFooter(totalItems) {
    if (!this.paginationContainer) return;

    if (totalItems === 0) {
      this.paginationContainer.innerHTML = "";
      return;
    }

    const { page, pageSize } = this.pagination;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalItems);

    const pageNumbersHtml = this._buildPageNumbersHtml(page, totalPages);

    this.paginationContainer.innerHTML = `
      <div class="pagination-left">
        <div class="pagination-info-text">
          Hiển thị <strong>${startItem} - ${endItem}</strong> trên tổng số <strong>${totalItems}</strong> phiên chẩn đoán
        </div>
        <div class="page-size-selector-wrap">
          <label>Hiển thị:</label>
          <select class="select-page-size" id="selectHistoryPageSize">
            <option value="10" ${pageSize === 10 ? 'selected' : ''}>10 dòng / trang</option>
            <option value="20" ${pageSize === 20 ? 'selected' : ''}>20 dòng / trang</option>
            <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 dòng / trang</option>
            <option value="100" ${pageSize === 100 ? 'selected' : ''}>100 dòng / trang</option>
          </select>
        </div>
      </div>
      <div class="pagination-nav-group">
        <button class="btn-page-step" data-page="1" title="Trang đầu" ${page === 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-angles-left"></i>
        </button>
        <button class="btn-page-step" data-page="${page - 1}" title="Trang trước" ${page === 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        ${pageNumbersHtml}
        <button class="btn-page-step" data-page="${page + 1}" title="Trang sau" ${page === totalPages ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
        <button class="btn-page-step" data-page="${totalPages}" title="Trang cuối" ${page === totalPages ? 'disabled' : ''}>
          <i class="fa-solid fa-angles-right"></i>
        </button>
      </div>
    `;

    // Click chuyển trang
    this.paginationContainer.querySelectorAll(".btn-page-step[data-page]").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetPage = parseInt(btn.getAttribute("data-page"), 10);
        if (targetPage && targetPage !== page && targetPage >= 1 && targetPage <= totalPages) {
          this.pagination.page = targetPage;
          this.renderTable();
        }
      });
    });

    // Thay đổi số dòng / trang
    const selectEl = this.paginationContainer.querySelector("#selectHistoryPageSize");
    if (selectEl) {
      selectEl.addEventListener("change", (e) => {
        const newPageSize = parseInt(e.target.value, 10);
        if (newPageSize) {
          this.pagination.pageSize = newPageSize;
          this.pagination.page = 1;
          this.renderTable();
        }
      });
    }
  }

  openDetailModal(session) {
    this.currentSelectedSession = session;
    const kb = this.kbManager.getKB();
    const symptomsKB = kb.symptoms || [];

    if (this.modalSessionId) this.modalSessionId.textContent = session.id;
    if (this.modalSessionTime) {
      this.modalSessionTime.textContent = window.MauBaoCaoYTe ? window.MauBaoCaoYTe.dinhDangNgayGio(session.timestamp) : (session.timestamp || "");
    }

    // 1. Pane Triệu chứng
    const inputSymptoms = session.inputSymptoms || {};
    const symEntries = Object.entries(inputSymptoms);
    if (this.paneSymptoms) {
      if (symEntries.length === 0) {
        this.paneSymptoms.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Phiên này không có triệu chứng nào được ghi nhận.</p>`;
      } else {
        this.paneSymptoms.innerHTML = `
          <div style="font-weight: 700; margin-bottom: 0.75rem; color: var(--text-primary);">
            Tổng cộng ${symEntries.length} triệu chứng đã được chọn:
          </div>
          <table class="history-table" style="min-width: 100%;">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên triệu chứng lâm sàng</th>
                <th style="text-align: center;">Mức CF người dùng</th>
              </tr>
            </thead>
            <tbody>
              ${symEntries.map(([sId, cf]) => {
                const sym = symptomsKB.find(s => s.id === sId);
                const sName = sym ? sym.name : sId;
                return `
                  <tr>
                    <td><span class="session-code-pill">${sId}</span></td>
                    <td><strong>${sName}</strong></td>
                    <td style="text-align: center;">
                      <span class="session-code-pill" style="background: rgba(16, 185, 129, 0.15); color: var(--color-emerald);">CF = ${cf}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // 2. Pane Kết quả suy luận
    const results = session.results || session.resultsSummary || [];
    if (this.paneResults) {
      if (results.length === 0) {
        this.paneResults.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
            <i class="fa-solid fa-circle-question" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
            <p>Không có bệnh nào thỏa mãn tập luật trong phiên này (Không xác định).</p>
          </div>
        `;
      } else {
        this.paneResults.innerHTML = `
          <table class="history-table" style="min-width: 100%;">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Bệnh nghi vấn</th>
                <th style="text-align: center;">Độ tin cậy CF</th>
                <th>Phân loại & Diễn giải</th>
              </tr>
            </thead>
            <tbody>
              ${results.map((r, idx) => {
                const cfVal = r.cf !== undefined ? r.cf : (r.finalCF || 0);
                const pct = Math.round(cfVal * 100);
                const dName = r.name || r.diseaseName || r.diseaseId || 'Chưa rõ';
                return `
                  <tr>
                    <td style="font-weight: 800; text-align: center; color: var(--color-primary);">${idx + 1}</td>
                    <td><strong>${dName}</strong></td>
                    <td style="text-align: center; font-weight: 800; color: ${pct >= 70 ? 'var(--color-emerald)' : 'var(--color-primary)'};">${pct}%</td>
                    <td>${pct >= 70 ? 'Rất chắc chắn (Khả năng cao nhất)' : (pct >= 40 ? 'Khả năng cao' : 'Nghi ngờ mức độ thấp')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // 3. Pane Quy tắc kích hoạt
    const firedRules = (results.length > 0 && results[0].firedRules) || [];
    if (this.paneRules) {
      if (firedRules.length === 0) {
        this.paneRules.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Không có thông tin chi tiết về luật kích hoạt cho phiên này.</p>`;
      } else {
        this.paneRules.innerHTML = `
          <table class="history-table" style="min-width: 100%;">
            <thead>
              <tr>
                <th>Mã Luật</th>
                <th>Tên Luật</th>
                <th>Tiền đề (Premises)</th>
                <th>CF Luật</th>
                <th>Công thức MYCIN</th>
              </tr>
            </thead>
            <tbody>
              ${firedRules.map(r => `
                <tr>
                  <td><span class="session-code-pill">${r.ruleId || r.id}</span></td>
                  <td><strong>${r.ruleName || r.name || ''}</strong></td>
                  <td>${(r.premises || []).join(' ∧ ')}</td>
                  <td style="text-align: center; font-weight: 800;">${r.ruleBaseCF !== undefined ? r.ruleBaseCF : r.cf}</td>
                  <td style="font-family: monospace; font-size: 0.8rem; color: var(--color-primary);">${r.formulaStr || 'min(CF) × CF_rule'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // 4. Pane Toàn bộ vết suy luận Trace Logs
    const traceLogs = session.traceLogs || [];
    if (this.paneTrace) {
      if (traceLogs.length === 0) {
        this.paneTrace.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Không có vết suy luận chi tiết được lưu trong phiên này.</p>`;
      } else {
        this.paneTrace.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${traceLogs.map(t => {
              let bg = 'var(--bg-input)';
              let border = 'var(--border-color)';
              if (t.type === 'RULE_FIRED') {
                bg = 'rgba(16, 185, 129, 0.1)';
                border = 'var(--color-emerald)';
              } else if (t.type === 'START' || t.type === 'FINISH') {
                bg = 'rgba(59, 130, 246, 0.1)';
                border = 'var(--color-primary)';
              }
              return `
                <div style="border-left: 3px solid ${border}; background: ${bg}; padding: 8px 12px; border-radius: 4px; font-size: 0.84rem;">
                  <span style="font-weight: 800; color: var(--text-muted); margin-right: 6px;">[Bước ${t.step || '#'}]</span>
                  <strong>${t.message || ''}</strong>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }

    // Mặc định chọn tab đầu tiên
    this.switchDetailTab("symptoms");

    if (this.modalDetail) this.modalDetail.classList.add("active");
  }

  closeDetailModal() {
    if (this.modalDetail) this.modalDetail.classList.remove("active");
    this.currentSelectedSession = null;
  }

  switchDetailTab(tabName) {
    this.tabButtons.forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });

    if (this.paneSymptoms) this.paneSymptoms.classList.toggle("active", tabName === "symptoms");
    if (this.paneResults) this.paneResults.classList.toggle("active", tabName === "results");
    if (this.paneRules) this.paneRules.classList.toggle("active", tabName === "rules");
    if (this.paneTrace) this.paneTrace.classList.toggle("active", tabName === "trace");
    if (this.paneRPG) this.paneRPG.classList.toggle("active", tabName === "rpg");
    if (this.paneFPG) this.paneFPG.classList.toggle("active", tabName === "fpg");

    if (tabName === "rpg" && this.currentSelectedSession) {
      this.renderModalRPG(this.currentSelectedSession);
    } else if (tabName === "fpg" && this.currentSelectedSession) {
      this.renderModalFPG(this.currentSelectedSession);
    }
  }

  _buildCaseFromSession(session) {
    if (!session) return null;
    const timeStr = window.MauBaoCaoYTe ? window.MauBaoCaoYTe.dinhDangNgayGio(session.timestamp) : (session.timestamp || "");
    const targetDisId = session.topDiseaseId || "D01";
    const firedIds = (session.firedRules || []).map(r => (typeof r === "string" ? r : (r.id || r.ruleId || ""))).filter(Boolean);

    return {
      id: "LIVE_DIAGNOSIS",
      sessionId: session.id,
      name: `Phiên khám [${session.id}]: ${session.topDiseaseName || targetDisId}`,
      description: `Phiên khám bệnh ghi nhận lúc ${timeStr}`,
      gt: Object.keys(session.inputSymptoms || {}),
      kl: [targetDisId],
      targetDiseaseName: `${session.topDiseaseName || targetDisId} (${targetDisId})`,
      targetDiseaseId: targetDisId,
      firedRuleIds: firedIds,
      firedRules: session.firedRules || []
    };
  }

  renderModalRPG(session) {
    if (!session || typeof window.RPGVisualizer === "undefined") return;
    const clinicalCase = this._buildCaseFromSession(session);
    if (!clinicalCase) return;

    if (!this.rpgVisualizer) {
      this.rpgVisualizer = new window.RPGVisualizer("modalCanvasRPG");
    }

    setTimeout(() => {
      if (!this.rpgVisualizer) return;
      this.rpgVisualizer.resizeCanvas();
      this.rpgVisualizer.setCase(clinicalCase);
      this.rpgVisualizer.setFilterRelatedOnly(true);
      if (clinicalCase.firedRuleIds && clinicalCase.firedRuleIds.length > 0) {
        this.rpgVisualizer.setSimulationState(new Set(clinicalCase.firedRuleIds));
      }
      this.rpgVisualizer.autoFit();
    }, 60);
  }

  renderModalFPG(session) {
    if (!session || typeof window.FPGVisualizer === "undefined") return;
    const clinicalCase = this._buildCaseFromSession(session);
    if (!clinicalCase) return;

    if (!this.fpgVisualizer) {
      this.fpgVisualizer = new window.FPGVisualizer("modalCanvasFPG");
    }

    setTimeout(() => {
      if (!this.fpgVisualizer) return;
      this.fpgVisualizer.resizeCanvas();
      this.fpgVisualizer.setCase(clinicalCase);
      this.fpgVisualizer.setFilterRelatedOnly(true);
      if (clinicalCase.firedRuleIds && clinicalCase.firedRuleIds.length > 0) {
        this.fpgVisualizer.setSimulationState(
          new Set(clinicalCase.gt || []),
          null,
          new Set(),
          new Set(clinicalCase.firedRuleIds)
        );
      }
      this.fpgVisualizer.autoFit();
    }, 60);
  }

  openDedicatedGraphPage(type, session) {
    if (!session) return;
    const clinicalCase = this._buildCaseFromSession(session);
    if (!clinicalCase) return;

    sessionStorage.setItem("LATEST_DIAGNOSIS_CASE", JSON.stringify(clinicalCase));
    sessionStorage.setItem("RPG_ACTIVE_SYMPTOMS", JSON.stringify(session.inputSymptoms || {}));
    if (session.firedRules) {
      sessionStorage.setItem("RPG_FIRED_RULES", JSON.stringify(session.firedRules));
    }

    const disId = session.topDiseaseId || "D01";
    if (type === "rpg") {
      window.location.href = `../do_thi_rpg/do_thi_rpg.html?focus=LIVE_DIAGNOSIS&disease=${disId}`;
    } else {
      window.location.href = `../do_thi_fpg/do_thi_fpg.html?focus=LIVE_DIAGNOSIS&disease=${disId}`;
    }
  }

  reDiagnose(session) {
    if (!session || !session.inputSymptoms) return;
    try {
      sessionStorage.setItem("RELOAD_DIAGNOSIS_SYMPTOMS", JSON.stringify(session.inputSymptoms));
      window.location.href = "../chan_doan/chan_doan.html";
    } catch (e) {
      console.error("Lỗi chuyển tiếp chẩn đoán lại:", e);
    }
  }

  async handleDeleteSession(sessionId) {
    let isConfirmed = false;
    if (window.XacNhan && typeof window.XacNhan.xoa === "function") {
      isConfirmed = await window.XacNhan.xoa(
        `Phiên chẩn đoán [${sessionId}]`,
        "Dữ liệu của phiên khám bệnh và toàn bộ vết suy diễn này sẽ bị xóa khỏi lịch sử và không thể hoàn tác."
      );
    } else {
      isConfirmed = confirm(`Bạn có chắc chắn muốn xóa phiên chẩn đoán [${sessionId}] không?`);
    }

    if (!isConfirmed) return;

    try {
      await this.dbEngine.deleteInferenceSession(sessionId);
      if (window.ThongBao?.thanhCong) {
        window.ThongBao.thanhCong(`Đã xóa thành công phiên [${sessionId}]`);
      }
      await this.loadSessions();
    } catch (e) {
      if (window.ThongBao?.thatBai) {
        window.ThongBao.thatBai("Lỗi khi xóa phiên: " + e.message);
      } else {
        alert("Lỗi khi xóa phiên: " + e.message);
      }
    }
  }

  async handleClearAll() {
    if (this.allSessions.length === 0) {
      if (window.ThongBao?.canhBao) {
        window.ThongBao.canhBao("Lịch sử chẩn đoán hiện đang trống.");
      } else {
        alert("Lịch sử chẩn đoán hiện đang trống.");
      }
      return;
    }

    let isConfirmed = false;
    if (window.XacNhan && typeof window.XacNhan.hienThi === "function") {
      isConfirmed = await window.XacNhan.hienThi({
        title: "Xóa toàn bộ lịch sử",
        message: "Bạn có chắc chắn muốn xóa toàn bộ lịch sử các phiên chẩn đoán?",
        detail: "CẢNH BÁO: Toàn bộ dữ liệu phiên khám và vết suy luận đã ghi nhận sẽ bị xóa vĩnh viễn khỏi hệ thống!",
        type: "danger",
        confirmText: "Xóa toàn bộ",
        cancelText: "Hủy bỏ",
        icon: "fa-trash-can"
      });
    } else {
      isConfirmed = confirm("CẢNH BÁO: Toàn bộ dữ liệu lịch sử chẩn đoán sẽ bị xóa vĩnh viễn!\nBạn có chắc chắn muốn thực hiện không?");
    }

    if (!isConfirmed) return;

    try {
      await this.dbEngine.clearAllInferenceSessions();
      if (window.ThongBao?.thanhCong) {
        window.ThongBao.thanhCong("Đã xóa toàn bộ lịch sử chẩn đoán.");
      }
      await this.loadSessions();
    } catch (e) {
      if (window.ThongBao?.thatBai) {
        window.ThongBao.thatBai("Lỗi khi xóa toàn bộ lịch sử: " + e.message);
      } else {
        alert("Lỗi khi xóa toàn bộ lịch sử: " + e.message);
      }
    }
  }
}

if (typeof window !== "undefined") {
  window.HistoryController = HistoryController;
}
