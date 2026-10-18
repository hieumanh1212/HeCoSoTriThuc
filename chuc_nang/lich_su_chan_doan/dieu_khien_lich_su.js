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
    this.filterDateFrom = document.getElementById("filterDateFrom");
    this.filterDateTo = document.getElementById("filterDateTo");
    this.btnResetFilter = document.getElementById("btnResetFilter");

    // Actions
    this.btnRefresh = document.getElementById("btnRefreshHistory");
    this.btnClearAll = document.getElementById("btnClearAllHistory");

    // Table
    this.tableBody = document.getElementById("historyTableBody");
    this.emptyState = document.getElementById("historyEmptyState");

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

      // 3. Lọc theo khoảng ngày
      if (fromTime || toTime) {
        const sessionTime = new Date(session.timestamp || 0).getTime();
        if (fromTime && sessionTime < fromTime) return false;
        if (toTime && sessionTime > toTime) return false;
      }

      return true;
    });

    this.renderStats();
    this.renderTable();
  }

  resetFilters() {
    if (this.filterSearch) this.filterSearch.value = "";
    if (this.filterDisease) this.filterDisease.value = "";
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

    if (this.filteredSessions.length === 0) {
      this.tableBody.innerHTML = "";
      if (this.emptyState) this.emptyState.style.display = "block";
      return;
    }

    if (this.emptyState) this.emptyState.style.display = "none";

    const kb = this.kbManager.getKB();
    const symptomsKB = kb.symptoms || [];

    const rowsHtml = this.filteredSessions.map((session, index) => {
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
                <i class="fa-regular fa-eye"></i> Xem
              </button>
              <button class="btn-row-action pdf-btn" data-action="pdf" data-id="${session.id}" title="Xuất phiếu kết quả PDF chuẩn y tế">
                <i class="fa-solid fa-file-pdf"></i> PDF
              </button>
              <button class="btn-row-action rerun-btn" data-action="rerun" data-id="${session.id}" title="Nạp triệu chứng và chẩn đoán lại">
                <i class="fa-solid fa-rotate-right"></i> Chẩn đoán lại
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
      btn.addEventListener("click", (e) => {
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
    if (!confirm(`Bạn có chắc chắn muốn xóa phiên chẩn đoán [${sessionId}] không?`)) return;
    try {
      await this.dbEngine.deleteInferenceSession(sessionId);
      if (typeof ThongBao !== "undefined" && ThongBao.thanhCong) {
        ThongBao.thanhCong(`Đã xóa thành công phiên ${sessionId}`);
      }
      await this.loadSessions();
    } catch (e) {
      alert("Lỗi khi xóa phiên: " + e.message);
    }
  }

  async handleClearAll() {
    if (this.allSessions.length === 0) {
      alert("Lịch sử chẩn đoán hiện đang trống.");
      return;
    }
    if (!confirm("CẢNH BÁO: Toàn bộ dữ liệu lịch sử chẩn đoán sẽ bị xóa vĩnh viễn!\nBạn có chắc chắn muốn thực hiện không?")) return;

    try {
      await this.dbEngine.clearAllInferenceSessions();
      if (typeof ThongBao !== "undefined" && ThongBao.thanhCong) {
        ThongBao.thanhCong("Đã xóa toàn bộ lịch sử chẩn đoán.");
      }
      await this.loadSessions();
    } catch (e) {
      alert("Lỗi khi xóa toàn bộ lịch sử: " + e.message);
    }
  }
}

if (typeof window !== "undefined") {
  window.HistoryController = HistoryController;
}
