/**
 * MAIN APPLICATION COORDINATOR (APP.JS)
 * Điều phối sự kiện giao diện, Động cơ suy diễn, Quản lý tri thức và Trực quan hóa RPG
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Khởi tạo các module cốt lõi
  const kbManager = new KnowledgeBaseManager();
  const forwardEngine = new ForwardChainingEngine(kbManager.getKB());
  const backwardEngine = new BackwardChainingEngine(kbManager.getKB());
  const rpgVisualizer = new RPGVisualizer("rpgCanvas");

  // Trạng thái ứng dụng
  let currentSelectedSymptoms = {}; // { [symptomId]: number (CF: 0 - 1.0) }
  let lastInferenceResult = null;
  let activeBackwardHypothesis = null;

  // =========================================================================
  // XỬ LÝ GIAO DIỆN SÁNG / TỐI (THEME SWITCHER)
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
      const newTheme = isCurrentlyLight ? "dark" : "light";
      applyTheme(newTheme);
    });
  }

  initTheme();

  // Lắng nghe thay đổi của Cơ sở tri thức (khi thêm/sửa/xóa luật hoặc import)
  kbManager.onUpdate((updatedKB) => {
    forwardEngine.setKnowledgeBase(updatedKB);
    backwardEngine.setKnowledgeBase(updatedKB);
    renderSymptomsList();
    renderKBManagementTables();
    populateDiseaseFilters();
    updateRPGGraph();
  });

  // =========================================================================
  // 2. XỬ LÝ CHUYỂN TAB & SUB-TAB
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

      // Nếu chuyển sang tab RPG, cập nhật kích thước Canvas và vẽ lại đồ thị
      if (targetTabId === "tab-rpg") {
        setTimeout(() => {
          rpgVisualizer.resizeCanvas();
          updateRPGGraph();
        }, 50);
      }
    });
  });

  // Xử lý sub-tab trong Quản lý tri thức
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
  // 3. RENDER DANH MỤC TRIỆU CHỨNG & TƯƠNG TÁC CHỌN (TAB CHẨN ĐOÁN)
  // =========================================================================
  function renderSymptomsList() {
    const container = document.getElementById("symptomGroupsContainer");
    if (!container) return;

    const kb = kbManager.getKB();
    container.innerHTML = "";

    kb.symptomGroups.forEach(group => {
      const groupSymptoms = kb.symptoms.filter(s => s.groupId === group.id);
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
            const currentCF = currentSelectedSymptoms[sym.id] || 0;
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

      // Đóng/mở accordion nhóm triệu chứng
      const header = groupBox.querySelector(".symptom-group-header");
      const content = groupBox.querySelector(".symptom-group-content");
      const toggleIcon = groupBox.querySelector(".toggle-icon");

      header.addEventListener("click", () => {
        const isHidden = content.style.display === "none";
        content.style.display = isHidden ? "flex" : "none";
        toggleIcon.className = isHidden ? "fa-solid fa-chevron-down toggle-icon" : "fa-solid fa-chevron-right toggle-icon";
      });

      container.appendChild(groupBox);
    });

    // Lắng nghe sự kiện thay đổi độ tin cậy của triệu chứng
    container.querySelectorAll(".cf-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const symId = e.target.getAttribute("data-id");
        const val = parseFloat(e.target.value);
        const row = e.target.closest(".symptom-row");

        if (val > 0) {
          currentSelectedSymptoms[symId] = val;
          row.classList.add("selected");
        } else {
          delete currentSelectedSymptoms[symId];
          row.classList.remove("selected");
        }

        updateSelectedSymptomsCount();
      });
    });

    updateSelectedSymptomsCount();
  }

  function updateSelectedSymptomsCount() {
    const count = Object.keys(currentSelectedSymptoms).length;
    const badge = document.getElementById("selectedCountNumber");
    if (badge) badge.textContent = count;
  }

  // Tìm kiếm triệu chứng nhanh
  const symptomSearchInput = document.getElementById("symptomSearchInput");
  if (symptomSearchInput) {
    symptomSearchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll(".symptom-row").forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? "flex" : "none";
      });
    });
  }

  // Nút xóa tất cả lựa chọn
  const btnClearSymptoms = document.getElementById("btnClearSymptoms");
  if (btnClearSymptoms) {
    btnClearSymptoms.addEventListener("click", () => {
      currentSelectedSymptoms = {};
      document.querySelectorAll(".symptom-row").forEach(r => r.classList.remove("selected"));
      document.querySelectorAll(".cf-select").forEach(s => s.value = "0");
      updateSelectedSymptomsCount();
      renderEmptyResults();
      updateRPGGraph();
    });
  }

  // =========================================================================
  // 4. THỰC HIỆN SUY DIỄN TIẾN (FORWARD CHAINING) & RENDER KẾT QUẢ
  // =========================================================================
  const btnRunForwardChaining = document.getElementById("btnRunForwardChaining");
  if (btnRunForwardChaining) {
    btnRunForwardChaining.addEventListener("click", () => {
      if (Object.keys(currentSelectedSymptoms).length === 0) {
        alert("Vui lòng chọn ít nhất 1 triệu chứng lâm sàng để hệ thống thực hiện suy luận!");
        return;
      }

      runForwardInference();
    });
  }

  function runForwardInference() {
    lastInferenceResult = forwardEngine.infer(currentSelectedSymptoms);
    renderDiagnosisResults(lastInferenceResult);
    updateRPGGraph();

    const resultHeaderActions = document.getElementById("resultHeaderActions");
    if (resultHeaderActions) {
      resultHeaderActions.style.display = "flex";
    }
  }

  function renderEmptyResults() {
    const container = document.getElementById("diagnosisResultsContainer");
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-notes-medical"></i>
        <p>Chưa có dữ liệu suy diễn.</p>
        <p style="font-size: 0.8rem; margin-top: 0.4rem; color: var(--text-muted);">
          Vui lòng chọn các triệu chứng ở cột bên trái và nhấn <strong>"Thực hiện Suy diễn tiến"</strong>.
        </p>
      </div>
    `;
    const resultHeaderActions = document.getElementById("resultHeaderActions");
    if (resultHeaderActions) resultHeaderActions.style.display = "none";
  }

  function renderDiagnosisResults(result) {
    const container = document.getElementById("diagnosisResultsContainer");
    if (!container) return;

    if (!result || result.results.length === 0) {
      container.innerHTML = `
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

    container.innerHTML = `
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

              <!-- Thanh độ tin cậy Certainty Factor -->
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
                    <i class="fa-solid fa-magnifying-glass-plus"></i> Hỏi thêm (Suy diễn lùi)
                  </button>
                  <button class="btn-secondary btn-focus-graph" data-disease-id="${dis.id || item.diseaseId}">
                    <i class="fa-solid fa-project-diagram"></i> Xem trên RPG
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    // Gán sự kiện cho các nút trong thẻ kết quả
    container.querySelectorAll(".btn-backward-query").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const disId = e.currentTarget.getAttribute("data-disease-id");
        openBackwardInquiryModal(disId);
      });
    });

    container.querySelectorAll(".btn-focus-graph").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const disId = e.currentTarget.getAttribute("data-disease-id");
        // Chuyển sang tab RPG và lọc theo bệnh đó
        const rpgNavBtn = document.querySelector('[data-tab="tab-rpg"]');
        if (rpgNavBtn) rpgNavBtn.click();
        const filterSelect = document.getElementById("rpgDiseaseFilter");
        if (filterSelect) {
          filterSelect.value = disId;
          updateRPGGraph();
        }
      });
    });
  }

  // =========================================================================
  // 5. SUY DIỄN LÙI (BACKWARD CHAINING MODAL & INTERACTION)
  // =========================================================================
  function openBackwardInquiryModal(targetDiseaseId) {
    activeBackwardHypothesis = targetDiseaseId;
    const evaluation = backwardEngine.evaluateHypothesis(targetDiseaseId, currentSelectedSymptoms);
    const modal = document.getElementById("modalBackward");
    const container = document.getElementById("backwardModalContent");
    if (!modal || !container || !evaluation) return;

    const dis = evaluation.targetDisease;
    const bestQ = evaluation.bestNextQuestion;

    if (!bestQ) {
      container.innerHTML = `
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
      const rule = bestQ.rule;

      container.innerHTML = `
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

      // Gán sự kiện khi người dùng trả lời câu hỏi suy diễn lùi
      container.querySelectorAll(".btn-answer-cf").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const answerCF = parseFloat(e.currentTarget.getAttribute("data-cf"));
          if (answerCF > 0) {
            currentSelectedSymptoms[sym.id] = answerCF;
          } else {
            delete currentSelectedSymptoms[sym.id];
          }

          // Cập nhật lại UI chọn triệu chứng
          renderSymptomsList();
          // Tự động chạy lại suy diễn tiến với dữ kiện mới
          runForwardInference();

          // Hỏi tiếp câu hỏi tiếp theo của bệnh này nếu còn
          openBackwardInquiryModal(targetDiseaseId);
        });
      });
    }

    modal.classList.add("active");
  }

  // =========================================================================
  // 6. PHÂN HỆ GIẢI THÍCH (HOW EXPLANATION MODAL)
  // =========================================================================
  const btnViewExplanation = document.getElementById("btnViewExplanation");
  if (btnViewExplanation) {
    btnViewExplanation.addEventListener("click", () => {
      if (!lastInferenceResult) return;
      openExplanationModal(lastInferenceResult);
    });
  }

  function openExplanationModal(inferenceResult) {
    const modal = document.getElementById("modalExplanation");
    const container = document.getElementById("explanationModalContent");
    if (!modal || !container) return;

    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--color-emerald); margin-bottom: 0.5rem;">
          <i class="fa-solid fa-timeline"></i> Lịch Sử Quá Trình Suy Luận (Execution Trace Logs)
        </h3>
        <p style="font-size: 0.8rem; color: var(--text-secondary);">
          Minh bạch từng bước logic: Triệu chứng ban đầu &rarr; Chu kỳ quét luật &rarr; Kích hoạt luật &rarr; Kết hợp độ tin cậy MYCIN.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${inferenceResult.traceLogs.map(log => {
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
                  ${inferenceResult.results.map(res => `
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

    modal.classList.add("active");
  }

  // =========================================================================
  // 7. ĐỒ THỊ MẠNG LUẬT RPG (TAB RPG)
  // =========================================================================
  function updateRPGGraph() {
    const kb = kbManager.getKB();
    const activeFacts = new Set(Object.keys(currentSelectedSymptoms));
    const firedRules = new Set((lastInferenceResult ? lastInferenceResult.firedRules : []).map(r => r.ruleId));
    const filterSelect = document.getElementById("rpgDiseaseFilter");
    const diseaseFilter = filterSelect ? filterSelect.value : "ALL";

    rpgVisualizer.setData(kb, activeFacts, firedRules, diseaseFilter);
  }

  function populateDiseaseFilters() {
    const filterSelect = document.getElementById("rpgDiseaseFilter");
    if (!filterSelect) return;
    const kb = kbManager.getKB();
    const currentVal = filterSelect.value;

    filterSelect.innerHTML = `<option value="ALL">-- Tất cả mạng luật (${kb.rules.length} luật) --</option>`;
    kb.diseases.forEach(d => {
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
  // 8. QUẢN TRỊ CƠ SỞ TRI THỨC (TAB KB CRUD & IMPORT/EXPORT)
  // =========================================================================
  function renderKBManagementTables() {
    const kb = kbManager.getKB();

    // Cập nhật badges số lượng
    const ruleCount = document.getElementById("ruleCountBadge");
    const symCount = document.getElementById("symptomCountBadge");
    const disCount = document.getElementById("diseaseCountBadge");
    if (ruleCount) ruleCount.textContent = kb.rules.length;
    if (symCount) symCount.textContent = kb.symptoms.length;
    if (disCount) disCount.textContent = kb.diseases.length;

    // 1. Render Bảng Luật
    const rulesTbody = document.getElementById("rulesTableBody");
    if (rulesTbody) {
      rulesTbody.innerHTML = kb.rules.map(rule => {
        const dis = kb.diseases.find(d => d.id === rule.conclusion);
        return `
          <tr>
            <td><strong style="color: var(--color-primary); font-family: 'JetBrains Mono';">${rule.id}</strong></td>
            <td>
              <div style="font-weight: 600;">${rule.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${rule.description || ''}</div>
            </td>
            <td>
              ${rule.premises.map(pId => {
                const sym = kb.symptoms.find(s => s.id === pId);
                return `<span class="tc-symptom-tag" title="${sym ? sym.name : pId}">[${pId}] ${sym ? sym.name.substring(0, 20) + '...' : pId}</span>`;
              }).join(" ")}
            </td>
            <td>
              <strong style="color: #f87171;">[${rule.conclusion}]</strong> ${dis ? dis.name : rule.conclusion}
            </td>
            <td>
              <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; font-family: 'JetBrains Mono';">
                ${rule.cf}
              </span>
            </td>
            <td style="text-align: center;">
              <button class="btn-secondary btn-edit-rule" data-id="${rule.id}" title="Sửa luật">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-danger btn-delete-rule" data-id="${rule.id}" title="Xóa luật">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
      }).join("");

      rulesTbody.querySelectorAll(".btn-edit-rule").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const ruleId = e.currentTarget.getAttribute("data-id");
          openEditRuleModal(ruleId);
        });
      });

      rulesTbody.querySelectorAll(".btn-delete-rule").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const ruleId = e.currentTarget.getAttribute("data-id");
          if (confirm(`Bạn có chắc chắn muốn xóa luật [${ruleId}] khỏi cơ sở tri thức?`)) {
            kbManager.deleteRule(ruleId);
          }
        });
      });
    }

    // 2. Render Bảng Triệu chứng
    const symsTbody = document.getElementById("symptomsTableBody");
    if (symsTbody) {
      symsTbody.innerHTML = kb.symptoms.map(s => {
        const grp = kb.symptomGroups.find(g => g.id === s.groupId);
        return `
          <tr>
            <td><strong style="color: var(--color-cyan); font-family: 'JetBrains Mono';">${s.id}</strong></td>
            <td><strong>${s.name}</strong></td>
            <td><span class="badge badge-low">${grp ? grp.name : s.groupId}</span></td>
            <td style="color: var(--text-secondary); font-size: 0.8rem;">${s.question}</td>
          </tr>
        `;
      }).join("");
    }

    // 3. Render Bảng Bệnh
    const disTbody = document.getElementById("diseasesTableBody");
    if (disTbody) {
      disTbody.innerHTML = kb.diseases.map(d => {
        return `
          <tr>
            <td><strong style="color: #f87171; font-family: 'JetBrains Mono';">${d.id}</strong></td>
            <td><strong style="font-size: 0.95rem;">${d.name}</strong></td>
            <td><span class="badge badge-high">${d.severity}</span></td>
            <td style="color: #fca5a5; font-size: 0.8rem;">${d.warningSigns || 'Chưa cập nhật'}</td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${d.reference || 'Bộ Y Tế'}</td>
          </tr>
        `;
      }).join("");
    }
  }

  // Mở modal Thêm/Sửa luật
  const btnAddNewRule = document.getElementById("btnAddNewRule");
  if (btnAddNewRule) {
    btnAddNewRule.addEventListener("click", () => openAddRuleModal());
  }

  function openAddRuleModal() {
    const modal = document.getElementById("modalRuleForm");
    const title = document.getElementById("ruleFormModalTitle");
    const form = document.getElementById("ruleForm");
    if (!modal || !form) return;

    title.textContent = "Thêm Luật Sinh Mới";
    form.reset();
    document.getElementById("formRuleId").value = "";

    populateRuleFormInputs();
    modal.classList.add("active");
  }

  function openEditRuleModal(ruleId) {
    const rule = kbManager.getRuleById(ruleId);
    if (!rule) return;

    const modal = document.getElementById("modalRuleForm");
    const title = document.getElementById("ruleFormModalTitle");
    if (!modal) return;

    title.textContent = `Chỉnh Sửa Luật [${rule.id}]`;
    document.getElementById("formRuleId").value = rule.id;
    document.getElementById("formRuleName").value = rule.name;
    document.getElementById("formRuleCF").value = rule.cf;
    document.getElementById("formRuleDesc").value = rule.description || "";

    populateRuleFormInputs(rule.premises, rule.conclusion);
    modal.classList.add("active");
  }

  function populateRuleFormInputs(selectedPremises = [], selectedConclusion = "") {
    const kb = kbManager.getKB();

    // Checkbox triệu chứng tiền đề
    const premisesContainer = document.getElementById("formRulePremisesList");
    if (premisesContainer) {
      premisesContainer.innerHTML = kb.symptoms.map(s => {
        const isChecked = selectedPremises.includes(s.id);
        return `
          <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; font-size: 0.8rem; cursor: pointer;">
            <input type="checkbox" name="premiseCheckbox" value="${s.id}" ${isChecked ? 'checked' : ''}>
            <span><strong style="color: var(--color-cyan);">[${s.id}]</strong> ${s.name}</span>
          </label>
        `;
      }).join("");
    }

    // Select bệnh kết luận
    const conclusionSelect = document.getElementById("formRuleConclusion");
    if (conclusionSelect) {
      conclusionSelect.innerHTML = kb.diseases.map(d => {
        const isSelected = d.id === selectedConclusion;
        return `<option value="${d.id}" ${isSelected ? 'selected' : ''}>[${d.id}] ${d.name}</option>`;
      }).join("");
    }
  }

  // Xử lý Submit Form Luật
  const ruleForm = document.getElementById("ruleForm");
  if (ruleForm) {
    ruleForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const ruleId = document.getElementById("formRuleId").value;
      const name = document.getElementById("formRuleName").value;
      const conclusion = document.getElementById("formRuleConclusion").value;
      const cf = parseFloat(document.getElementById("formRuleCF").value);
      const description = document.getElementById("formRuleDesc").value;

      const checkedBoxes = document.querySelectorAll('input[name="premiseCheckbox"]:checked');
      const premises = Array.from(checkedBoxes).map(cb => cb.value);

      if (premises.length === 0) {
        alert("Vui lòng chọn ít nhất 1 triệu chứng tiền đề (IF) cho luật!");
        return;
      }

      const ruleData = { id: ruleId || undefined, name, premises, conclusion, cf, description };

      try {
        if (ruleId) {
          kbManager.updateRule(ruleId, ruleData);
        } else {
          kbManager.addRule(ruleData);
        }
        document.getElementById("modalRuleForm").classList.remove("active");
        alert("Lưu luật thành công!");
      } catch (err) {
        alert(`Lỗi: ${err.message}`);
      }
    });
  }

  // Export JSON
  const btnExportKB = document.getElementById("btnExportKB");
  if (btnExportKB) {
    btnExportKB.addEventListener("click", () => kbManager.exportJSON());
  }

  // Import JSON
  const importJsonInput = document.getElementById("importJsonInput");
  if (importJsonInput) {
    importJsonInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          kbManager.importJSON(event.target.result);
          alert("Import cơ sở tri thức thành công!");
        } catch (err) {
          alert(err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
  }

  // Reset KB
  const btnResetKB = document.getElementById("btnResetKB");
  if (btnResetKB) {
    btnResetKB.addEventListener("click", () => {
      if (confirm("Bạn có chắc chắn muốn khôi phục cơ sở tri thức về trạng thái chuẩn ban đầu của Bộ Y Tế?")) {
        kbManager.resetToDefault();
        alert("Đã khôi phục cơ sở tri thức mặc định!");
      }
    });
  }

  // =========================================================================
  // 9. CÁC CA BỆNH KIỂM THỬ MẪU (BENCHMARK TEST CASES)
  // =========================================================================
  function renderTestCases() {
    const container = document.getElementById("testCasesContainer");
    if (!container) return;
    const kb = kbManager.getKB();
    const cases = kb.testCases || [];

    container.innerHTML = cases.map(tc => {
      const expDis = kb.diseases.find(d => d.id === tc.expectedDisease);
      return `
        <div class="test-case-card">
          <div>
            <div class="tc-header">
              <span class="tc-id">${tc.id}</span>
              <h3 class="tc-title">${tc.name}</h3>
              <div class="tc-patient"><i class="fa-solid fa-user"></i> ${tc.patientInfo}</div>
            </div>

            <div class="tc-symptoms-list">
              <div style="font-weight: 600; margin-bottom: 0.35rem; color: var(--text-secondary);">Triệu chứng ghi nhận:</div>
              ${tc.selectedSymptoms.map(s => {
                const sym = kb.symptoms.find(x => x.id === s.id);
                return `<span class="tc-symptom-tag">[${s.id}] ${sym ? sym.name : s.id} (CF: ${s.cf})</span>`;
              }).join("")}
            </div>

            <div style="font-size: 0.82rem; margin-bottom: 0.75rem;">
              <strong>Bác sĩ chẩn đoán:</strong> 
              <span style="color: #f87171; font-weight: 700;">[${tc.expectedDisease}] ${expDis ? expDis.name : tc.expectedDisease}</span>
            </div>

            <div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic; margin-bottom: 1rem;">
              "${tc.clinicalNote}"
            </div>
          </div>

          <button class="btn-primary btn-load-testcase" data-tc-id="${tc.id}" style="width: 100%; justify-content: center;">
            <i class="fa-solid fa-play"></i> Nạp ca này & Chẩn đoán ngay
          </button>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".btn-load-testcase").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tcId = e.currentTarget.getAttribute("data-tc-id");
        loadAndRunTestCase(tcId);
      });
    });
  }

  function loadAndRunTestCase(tcId) {
    const kb = kbManager.getKB();
    const tc = (kb.testCases || []).find(c => c.id === tcId);
    if (!tc) return;

    // Nạp triệu chứng vào Working Memory
    currentSelectedSymptoms = {};
    tc.selectedSymptoms.forEach(s => {
      currentSelectedSymptoms[s.id] = s.cf;
    });

    // Cập nhật giao diện triệu chứng
    renderSymptomsList();

    // Chuyển sang tab Chẩn đoán
    const diagNavBtn = document.querySelector('[data-tab="tab-diagnosis"]');
    if (diagNavBtn) diagNavBtn.click();

    // Chạy suy diễn
    runForwardInference();
  }

  // =========================================================================
  // 10. ĐÓNG MODAL KHI CLICK NGOÀI HOẶC NÚT CLOSE
  // =========================================================================
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
  // 11. KHỞI CHẠY LẦN ĐẦU (INITIALIZATION)
  // =========================================================================
  renderSymptomsList();
  renderKBManagementTables();
  populateDiseaseFilters();
  renderTestCases();
  updateRPGGraph();
});
