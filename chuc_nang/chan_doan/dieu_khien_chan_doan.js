/**
 * FEATURE MODULE: DIAGNOSIS CONTROLLER
 * Quản lý tương tác chọn triệu chứng, thực hiện suy diễn tiến, modal giải thích HOW, và modal suy diễn lùi WHY
 */

class DiagnosisController {
  constructor({ kbManager, forwardEngine, backwardEngine, onInferenceComplete, onFocusGraph }) {
    this.kbManager = kbManager;
    this.forwardEngine = forwardEngine;
    this.backwardEngine = backwardEngine;
    this.onInferenceComplete = onInferenceComplete;
    this.onFocusGraph = onFocusGraph;

    this.currentSelectedSymptoms = {}; // { [symptomId]: number (CF: 0 - 1.0) }
    this.lastInferenceResult = null;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.container = document.getElementById("symptomGroupsContainer");
    this.resultsContainer = document.getElementById("diagnosisResultsContainer");
    this.selectedCountBadge = document.getElementById("selectedCountNumber");
    this.searchInput = document.getElementById("symptomSearchInput");
    this.btnClear = document.getElementById("btnClearSymptoms");
    this.btnRun = document.getElementById("btnRunForwardChaining");
    this.resultHeaderActions = document.getElementById("resultHeaderActions");
    this.btnViewExplanation = document.getElementById("btnViewExplanation");
    this.modalExplanation = document.getElementById("modalExplanation");
    this.explanationContent = document.getElementById("explanationModalContent");
    this.modalBackward = document.getElementById("modalBackward");
    this.backwardContent = document.getElementById("backwardModalContent");
  }

  bindEvents() {
    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => this.filterSymptoms(e.target.value));
    }

    if (this.btnClear) {
      this.btnClear.addEventListener("click", () => this.clearAll());
    }

    if (this.btnRun) {
      this.btnRun.addEventListener("click", () => {
        if (Object.keys(this.currentSelectedSymptoms).length === 0) {
          alert("Vui lòng chọn ít nhất 1 triệu chứng lâm sàng để hệ thống thực hiện suy luận!");
          return;
        }
        this.runInference();
      });
    }

    if (this.btnViewExplanation) {
      this.btnViewExplanation.addEventListener("click", () => this.openExplanationModal());
    }
  }

  renderSymptomsList() {
    if (!this.container) return;
    const kb = this.kbManager.getKB();
    this.container.innerHTML = "";

    (kb.symptomGroups || []).forEach(group => {
      const groupSymptoms = (kb.symptoms || []).filter(s => s.groupId === group.id);
      if (groupSymptoms.length === 0) return;

      const groupBox = document.createElement("div");
      groupBox.className = "symptom-group-box";

      groupBox.innerHTML = `
        <div class="symptom-group-header">
          <div><i class="${group.icon}"></i> ${group.name} (${groupSymptoms.length})</div>
          <i class="fa-solid fa-chevron-down toggle-icon"></i>
        </div>
        <div class="symptom-group-content">
          ${groupSymptoms.map(sym => {
            const currentCF = this.currentSelectedSymptoms[sym.id] || 0;
            const isSelected = currentCF > 0;
            return `
              <div class="symptom-row ${isSelected ? 'selected' : ''}" data-symptom-id="${sym.id}">
                <div class="symptom-info">
                  <span class="symptom-id-badge">${sym.id}</span>
                  <span class="symptom-name">${sym.name}</span>
                </div>
                <div class="symptom-control">
                  <select class="cf-select" data-id="${sym.id}">
                    <option value="0" ${currentCF === 0 ? 'selected' : ''}>Không có (0%)</option>
                    <option value="0.4" ${currentCF === 0.4 ? 'selected' : ''}>Nghi ngờ / Nhẹ (40%)</option>
                    <option value="0.7" ${currentCF === 0.7 ? 'selected' : ''}>Có khả năng / Vừa (70%)</option>
                    <option value="1.0" ${currentCF === 1.0 ? 'selected' : ''}>Chắc chắn có / Rõ rệt (100%)</option>
                  </select>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;

      const header = groupBox.querySelector(".symptom-group-header");
      const content = groupBox.querySelector(".symptom-group-content");
      const toggleIcon = groupBox.querySelector(".toggle-icon");

      header.addEventListener("click", () => {
        const isHidden = content.style.display === "none";
        content.style.display = isHidden ? "flex" : "none";
        toggleIcon.className = isHidden ? "fa-solid fa-chevron-down toggle-icon" : "fa-solid fa-chevron-right toggle-icon";
      });

      this.container.appendChild(groupBox);
    });

    this.container.querySelectorAll(".cf-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const symId = e.target.getAttribute("data-id");
        const val = parseFloat(e.target.value);
        const row = e.target.closest(".symptom-row");

        if (val > 0) {
          this.currentSelectedSymptoms[symId] = val;
          row.classList.add("selected");
        } else {
          delete this.currentSelectedSymptoms[symId];
          row.classList.remove("selected");
        }

        this.updateSelectedCount();
      });
    });

    this.updateSelectedCount();
  }

  updateSelectedCount() {
    const count = Object.keys(this.currentSelectedSymptoms).length;
    if (this.selectedCountBadge) this.selectedCountBadge.textContent = count;
  }

  filterSymptoms(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll(".symptom-row").forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? "flex" : "none";
    });
  }

  clearAll() {
    this.currentSelectedSymptoms = {};
    document.querySelectorAll(".symptom-row").forEach(r => r.classList.remove("selected"));
    document.querySelectorAll(".cf-select").forEach(s => s.value = "0");
    this.updateSelectedCount();
    this.renderEmptyResults();
    if (this.onInferenceComplete) {
      this.onInferenceComplete(null, this.currentSelectedSymptoms);
    }
  }

  setSymptoms(symptomsMap) {
    this.currentSelectedSymptoms = { ...symptomsMap };
    this.renderSymptomsList();
    this.runInference();
  }

  runInference() {
    this.lastInferenceResult = this.forwardEngine.infer(this.currentSelectedSymptoms);
    this.renderResults(this.lastInferenceResult);

    if (this.resultHeaderActions) {
      this.resultHeaderActions.style.display = "flex";
    }

    if (this.onInferenceComplete) {
      this.onInferenceComplete(this.lastInferenceResult, this.currentSelectedSymptoms);
    }
  }

  renderEmptyResults() {
    if (!this.resultsContainer) return;
    this.resultsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-notes-medical"></i>
        <p>Chưa có dữ liệu suy diễn.</p>
        <p style="font-size: 0.8rem; margin-top: 0.4rem; color: var(--text-muted);">
          Vui lòng chọn các triệu chứng ở cột bên trái và nhấn <strong>"Thực hiện Suy diễn tiến"</strong>.
        </p>
      </div>
    `;
    if (this.resultHeaderActions) this.resultHeaderActions.style.display = "none";
  }

  renderResults(result) {
    if (!this.resultsContainer) return;

    if (!result || (result.results || []).length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-amber);"></i>
          <p style="color: var(--text-primary); font-weight: 600;">Không có bệnh nào thỏa mãn tập luật hiện tại.</p>
          <p style="font-size: 0.8rem; margin-top: 0.4rem; color: var(--text-muted);">
            Các triệu chứng đã chọn chưa đủ để kích hoạt bất kỳ luật nào trong cơ sở tri thức, hoặc triệu chứng thuộc về các bệnh khác chưa được định nghĩa.
          </p>
        </div>
      `;
      return;
    }

    this.resultsContainer.innerHTML = `
      <div class="result-card-list">
        ${result.results.map((item, index) => {
          const isTop = index === 0;
          const dis = item.disease || {};
          const interp = item.interpretation;
          const cfPercent = interp.percentage;

          return `
            <div class="disease-result-card ${isTop ? 'top-match' : ''}">
              <div class="disease-card-header">
                <div class="disease-title-block">
                  <span class="symptom-id-badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">
                    ${dis.id || item.diseaseId}
                  </span>
                  <h3>${dis.name || item.diseaseId}</h3>
                  ${isTop ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981;">Nghi ngờ cao nhất</span>` : ''}
                </div>
                <span class="badge ${interp.badgeClass}">${interp.label}</span>
              </div>

              <div class="cf-progress-wrapper">
                <div class="cf-progress-labels">
                  <span style="color: var(--text-secondary);">Độ tin cậy toán học (MYCIN CF):</span>
                  <strong style="color: ${dis.color || 'var(--color-primary)'}; font-family: 'JetBrains Mono';">${cfPercent}% (${item.finalCF})</strong>
                </div>
                <div class="cf-progress-bar-bg">
                  <div class="cf-progress-fill" style="width: ${cfPercent}%; background: ${dis.color || 'var(--color-primary)'};"></div>
                </div>
              </div>

              <div class="disease-desc-box">
                <p><strong>Mô tả lâm sàng:</strong> ${dis.description || 'Chưa có mô tả chi tiết.'}</p>
              </div>

              ${dis.warningSigns ? `
                <div class="disease-warning-box">
                  <strong>⚠️ Dấu hiệu cảnh báo nguy hiểm:</strong> ${dis.warningSigns}
                </div>
              ` : ''}

              ${dis.recommendation ? `
                <div class="disease-recommendation-box">
                  <strong>💡 Khuyến nghị xử lý ban đầu:</strong> ${dis.recommendation}
                </div>
              ` : ''}

              <div class="disease-card-footer">
                <div style="font-size: 0.78rem; color: var(--text-muted);">
                  <i class="fa-solid fa-file-lines"></i> ${dis.reference || 'Văn bản Bộ Y Tế'}
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn-secondary btn-backward-query" data-disease-id="${dis.id || item.diseaseId}">
                    <i class="fa-solid fa-magnifying-glass-plus"></i> Hỏi thêm (Suy diễn lùi - WHY)
                  </button>
                  <button class="btn-secondary btn-focus-graph" data-disease-id="${dis.id || item.diseaseId}">
                    <i class="fa-solid fa-project-diagram"></i> Xem trên Đồ thị RPG
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    this.resultsContainer.querySelectorAll(".btn-backward-query").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const disId = e.currentTarget.getAttribute("data-disease-id");
        this.openBackwardInquiryModal(disId);
      });
    });

    this.resultsContainer.querySelectorAll(".btn-focus-graph").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const disId = e.currentTarget.getAttribute("data-disease-id");
        if (this.onFocusGraph) this.onFocusGraph(disId);
      });
    });
  }

  openBackwardInquiryModal(targetDiseaseId) {
    const evaluation = this.backwardEngine.evaluateHypothesis(targetDiseaseId, this.currentSelectedSymptoms);
    if (!this.modalBackward || !this.backwardContent || !evaluation) return;

    const dis = evaluation.targetDisease;
    const bestQ = evaluation.bestNextQuestion;

    if (!bestQ) {
      this.backwardContent.innerHTML = `
        <div style="text-align: center; padding: 1.5rem;">
          <i class="fa-solid fa-circle-check" style="font-size: 2.5rem; color: var(--color-emerald); margin-bottom: 1rem;"></i>
          <h3 style="font-size: 1.1rem; font-weight: 700;">Đã đủ dữ kiện cho bệnh "${dis.name}"!</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">
            Tất cả các triệu chứng trong các luật của bệnh này đã được người dùng khai báo hoặc không còn luật nào khác cần kiểm chứng.
          </p>
          <div style="margin-top: 1.25rem;">
            <button class="btn-primary" data-close="modalBackward">Đóng</button>
          </div>
        </div>
      `;
    } else {
      const sym = bestQ.symptom;
      this.backwardContent.innerHTML = `
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa;">Mục tiêu chứng minh</span>
            <strong style="color: var(--text-primary); font-size: 1rem;">${dis.name} [${dis.id}]</strong>
          </div>
          <div style="background: rgba(15, 23, 42, 0.6); padding: 0.85rem; border-radius: 8px; border-left: 3px solid var(--color-amber); margin-bottom: 1rem;">
            <div style="font-size: 0.8rem; color: var(--color-amber); font-weight: 700; margin-bottom: 0.25rem;">
              <i class="fa-solid fa-lightbulb"></i> GIẢI THÍCH (WHY) - VÌ SAO HỆ THỐNG HỎI CÂU NÀY?
            </div>
            <div style="font-size: 0.82rem; color: var(--text-secondary);">
              ${bestQ.whyReason}
            </div>
          </div>

          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.25rem; text-align: center;">
            <span class="symptom-id-badge" style="margin-bottom: 0.5rem; display: inline-block;">${sym.id}</span>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
              ${sym.question || `Bạn có bị triệu chứng: ${sym.name} không?`}
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.25rem;">
              (Tên chuyên môn: ${sym.name})
            </p>

            <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
              <button class="btn-success btn-answer-cf" data-cf="1.0">
                <i class="fa-solid fa-check"></i> Chắc chắn có (100%)
              </button>
              <button class="btn-primary btn-answer-cf" data-cf="0.7">
                <i class="fa-solid fa-circle-dot"></i> Có khả năng (70%)
              </button>
              <button class="btn-secondary btn-answer-cf" data-cf="0.4">
                <i class="fa-solid fa-question"></i> Nghi ngờ nhẹ (40%)
              </button>
              <button class="btn-danger btn-answer-cf" data-cf="0">
                <i class="fa-solid fa-xmark"></i> Hoàn toàn không có (0%)
              </button>
            </div>
          </div>
        </div>
      `;

      this.backwardContent.querySelectorAll(".btn-answer-cf").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const answerCF = parseFloat(e.currentTarget.getAttribute("data-cf"));
          if (answerCF > 0) {
            this.currentSelectedSymptoms[sym.id] = answerCF;
          } else {
            delete this.currentSelectedSymptoms[sym.id];
          }

          this.renderSymptomsList();
          this.runInference();
          this.openBackwardInquiryModal(targetDiseaseId);
        });
      });
    }

    this.modalBackward.classList.add("active");
  }

  openExplanationModal() {
    if (!this.lastInferenceResult || !this.modalExplanation || !this.explanationContent) return;

    this.explanationContent.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--color-emerald); margin-bottom: 0.5rem;">
          <i class="fa-solid fa-timeline"></i> Lịch Sử Quá Trình Suy Luận (Execution Trace Logs)
        </h3>
        <p style="font-size: 0.8rem; color: var(--text-secondary);">
          Minh bạch từng bước logic: Triệu chứng ban đầu &rarr; Chu kỳ quét luật &rarr; Kích hoạt luật &rarr; Kết hợp độ tin cậy MYCIN.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${this.lastInferenceResult.traceLogs.map(log => {
          if (log.type === "START") {
            return `
              <div class="trace-step-item">
                <div class="trace-step-title">Bước ${log.step}: ${log.message}</div>
                <div class="trace-step-body">
                  ${log.data.map(d => `• [${d.id}] ${d.name} (Độ tin cậy người dùng: ${d.cf * 100}%)`).join("<br>")}
                </div>
              </div>
            `;
          } else if (log.type === "RULE_FIRED") {
            const dt = log.details;
            return `
              <div class="trace-step-item" style="border-left-color: var(--color-emerald);">
                <div class="trace-step-title" style="color: #34d399;">Bước ${log.step}: ${log.message}</div>
                <div class="trace-step-body">
                  <strong>• Luật:</strong> ${dt.ruleDescription}<br>
                  <strong>• Các tiền đề:</strong> ${dt.premiseDetails.map(p => `[${p.id}] ${p.name} (CF=${p.userCF})`).join(" AND ")}<br>
                  <strong>• Công thức tính CF luật:</strong> <code>${dt.formulaStr}</code><br>
                  <strong>• Kết luận sinh ra:</strong> [${dt.conclusion}] ${dt.diseaseName} với CF = ${dt.outputCF}
                </div>
              </div>
            `;
          } else if (log.type === "FINISH") {
            return `
              <div class="trace-step-item" style="border-left-color: var(--color-primary);">
                <div class="trace-step-title" style="color: var(--color-primary);">Bước ${log.step}: ${log.message}</div>
                <div class="trace-step-body">
                  ${this.lastInferenceResult.results.map(res => `
                    <strong>• Bệnh [${res.diseaseId}] ${res.diseaseName}:</strong> Tổng CF kết hợp = <strong>${Math.round(res.finalCF * 100)}% (${res.finalCF})</strong> - ${res.interpretation.label}<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;<em>Chi tiết kết hợp MYCIN:</em><br>
                    ${res.combinationSteps.map(cs => `&nbsp;&nbsp;&nbsp;&nbsp;&rarr; ${cs.desc}`).join("<br>")}
                  `).join("<br><br>")}
                </div>
              </div>
            `;
          }
          return "";
        }).join("")}
      </div>
    `;

    this.modalExplanation.classList.add("active");
  }
}

if (typeof window !== "undefined") {
  window.DiagnosisController = DiagnosisController;
}
