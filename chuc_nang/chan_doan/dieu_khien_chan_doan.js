/**
 * FEATURE MODULE: CLINICAL DIAGNOSIS CONTROLLER (BALANCED LIST & CUSTOM DROPDOWN)
 * Hiển thị toàn bộ danh mục triệu chứng với bộ lọc cao cấp & Cột kết quả chuẩn Y khoa
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
    this.activeCategoryFilter = "all"; // 'all' | 'selected' | groupId
    this.currentSearchQuery = "";
    this.allExpanded = true;

    this.initElements();
    this.bindEvents();
    this.renderAll();
  }

  initElements() {
    this.container = document.getElementById("symptomGroupsContainer");
    
    // Custom Dropdown Elements
    this.dropdownContainer = document.getElementById("categoryDropdownContainer");
    this.btnDropdownTrigger = document.getElementById("btnCategoryDropdownTrigger");
    this.dropdownCurrentIcon = document.getElementById("dropdownCurrentIcon");
    this.dropdownCurrentLabel = document.getElementById("dropdownCurrentLabel");
    this.dropdownCurrentBadge = document.getElementById("dropdownCurrentBadge");
    this.dropdownMenu = document.getElementById("categoryDropdownMenu");

    this.totalSymptomsCount = document.getElementById("totalSymptomsCount");
    this.selectedSymptomsCount = document.getElementById("selectedSymptomsCount");
    this.searchInput = document.getElementById("symptomSearchInput");
    this.btnClearSearch = document.getElementById("btnClearSymptomSearch");
    
    this.btnExpandAll = document.getElementById("btnExpandAll");
    this.btnCollapseAll = document.getElementById("btnCollapseAll");
    this.btnClear = document.getElementById("btnClearSymptoms");

    // Right column & Results
    this.resultsContainer = document.getElementById("diagnosisResultsContainer");
    this.selectedCountNumber = document.getElementById("selectedCountNumber");
    this.btnRun = document.getElementById("btnRunForwardChaining");
    this.btnViewExplanation = document.getElementById("btnViewExplanation");
    this.modalExplanation = document.getElementById("modalExplanation");
    this.explanationContent = document.getElementById("explanationModalContent");
    this.modalBackward = document.getElementById("modalBackward");
    this.backwardContent = document.getElementById("backwardModalContent");
  }

  bindEvents() {
    // 1. Custom Dropdown Toggle
    if (this.btnDropdownTrigger && this.dropdownContainer) {
      this.btnDropdownTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        this.dropdownContainer.classList.toggle("open");
      });

      document.addEventListener("click", (e) => {
        if (!e.target.closest("#categoryDropdownContainer")) {
          this.dropdownContainer.classList.remove("open");
        }
      });
    }

    // 2. Quick Tags (Tất cả / Đã chọn)
    document.querySelectorAll(".filter-quick-tag").forEach(tag => {
      tag.addEventListener("click", (e) => {
        const cat = e.currentTarget.getAttribute("data-cat");
        this.selectCategory(cat);
      });
    });

    // 3. Ô tìm kiếm
    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.currentSearchQuery = e.target.value;
        if (this.btnClearSearch) {
          this.btnClearSearch.style.display = this.currentSearchQuery.length > 0 ? "block" : "none";
        }
        this.applyFilter();
      });
    }

    if (this.btnClearSearch) {
      this.btnClearSearch.addEventListener("click", () => {
        if (this.searchInput) {
          this.searchInput.value = "";
          this.currentSearchQuery = "";
          this.btnClearSearch.style.display = "none";
          this.applyFilter();
          this.searchInput.focus();
        }
      });
    }

    // 4. Nút Mở rộng / Thu gọn riêng biệt
    if (this.btnExpandAll) {
      this.btnExpandAll.addEventListener("click", () => this.setExpandAllState(true));
    }
    if (this.btnCollapseAll) {
      this.btnCollapseAll.addEventListener("click", () => this.setExpandAllState(false));
    }

    // 5. Nút Xóa tất cả
    if (this.btnClear) {
      this.btnClear.addEventListener("click", () => this.clearAll());
    }

    // 6. Nút Thực hiện Suy diễn tiến
    if (this.btnRun) {
      this.btnRun.addEventListener("click", () => {
        if (Object.keys(this.currentSelectedSymptoms).length === 0) {
          if (typeof ThongBao !== "undefined" && ThongBao.canhBao) {
            ThongBao.canhBao("Vui lòng chọn ít nhất 1 triệu chứng lâm sàng để thực hiện suy luận!");
          } else {
            alert("Vui lòng chọn ít nhất 1 triệu chứng lâm sàng để thực hiện suy luận!");
          }
          return;
        }
        this.runInference();
      });
    }

    // 7. Nút Xem Vết Suy Luận HOW
    if (this.btnViewExplanation) {
      this.btnViewExplanation.addEventListener("click", () => this.openExplanationModal());
    }
  }

  _stripVN(str) {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  }

  selectCategory(catId) {
    this.activeCategoryFilter = catId;
    if (this.dropdownContainer) this.dropdownContainer.classList.remove("open");
    this.renderCategoryDropdown();
    this.updateQuickTagsState();
    this.applyFilter();
  }

  updateQuickTagsState() {
    document.querySelectorAll(".filter-quick-tag").forEach(tag => {
      const cat = tag.getAttribute("data-cat");
      tag.classList.toggle("active", cat === this.activeCategoryFilter);
    });
  }

  renderAll() {
    this.renderCategoryDropdown();
    this.renderSymptomsList();
    this.updateBadges();
  }

  /* --- 1. RENDER CUSTOM DROPDOWN MENU --- */
  renderCategoryDropdown() {
    if (!this.dropdownMenu) return;
    const kb = this.kbManager.getKB();
    const groups = kb.symptomGroups || [];
    const allSymptoms = kb.symptoms || [];
    const totalSelected = Object.keys(this.currentSelectedSymptoms).length;

    // Cập nhật nhãn và icon trên nút trigger dropdown
    if (this.activeCategoryFilter === "all") {
      if (this.dropdownCurrentIcon) this.dropdownCurrentIcon.className = "fa-solid fa-layer-group dropdown-icon";
      if (this.dropdownCurrentLabel) this.dropdownCurrentLabel.textContent = "Tất cả danh mục";
      if (this.dropdownCurrentBadge) this.dropdownCurrentBadge.textContent = allSymptoms.length;
    } else if (this.activeCategoryFilter === "selected") {
      if (this.dropdownCurrentIcon) this.dropdownCurrentIcon.className = "fa-solid fa-check-double dropdown-icon";
      if (this.dropdownCurrentLabel) this.dropdownCurrentLabel.textContent = "Triệu chứng đã chọn";
      if (this.dropdownCurrentBadge) this.dropdownCurrentBadge.textContent = totalSelected;
    } else {
      const g = groups.find(item => item.id === this.activeCategoryFilter);
      if (g) {
        if (this.dropdownCurrentIcon) this.dropdownCurrentIcon.className = `${g.icon || 'fa-solid fa-folder'} dropdown-icon`;
        if (this.dropdownCurrentLabel) this.dropdownCurrentLabel.textContent = g.name;
        const gSymptoms = allSymptoms.filter(s => s.groupId === g.id);
        const selCount = gSymptoms.filter(s => (this.currentSelectedSymptoms[s.id] || 0) > 0).length;
        if (this.dropdownCurrentBadge) this.dropdownCurrentBadge.textContent = selCount > 0 ? `${selCount}/${gSymptoms.length}` : gSymptoms.length;
      }
    }

    // Render danh sách các item trong menu sổ xuống
    let html = `
      <div class="dropdown-menu-item ${this.activeCategoryFilter === 'all' ? 'active' : ''}" data-cat-id="all">
        <div class="dropdown-item-left">
          <i class="fa-solid fa-layer-group" style="color: var(--color-primary); width: 16px; text-align: center;"></i>
          <span>Tất cả danh mục</span>
        </div>
        <span class="dropdown-item-badge">${allSymptoms.length}</span>
      </div>

      <div class="dropdown-menu-item ${this.activeCategoryFilter === 'selected' ? 'active' : ''}" data-cat-id="selected">
        <div class="dropdown-item-left">
          <i class="fa-solid fa-check-double" style="color: var(--color-emerald); width: 16px; text-align: center;"></i>
          <span>Triệu chứng đã chọn</span>
        </div>
        <span class="dropdown-item-badge ${totalSelected > 0 ? 'has-selected' : ''}">${totalSelected}</span>
      </div>
      <div style="height: 1px; background: var(--border-color); margin: 3px 0;"></div>
    `;

    groups.forEach(g => {
      const gSymptoms = allSymptoms.filter(s => s.groupId === g.id);
      const selCount = gSymptoms.filter(s => (this.currentSelectedSymptoms[s.id] || 0) > 0).length;
      const isSelected = this.activeCategoryFilter === g.id;

      html += `
        <div class="dropdown-menu-item ${isSelected ? 'active' : ''}" data-cat-id="${g.id}">
          <div class="dropdown-item-left">
            <i class="${g.icon || 'fa-solid fa-folder'}" style="color: var(--color-primary); width: 16px; text-align: center;"></i>
            <span>${g.name}</span>
          </div>
          <span class="dropdown-item-badge ${selCount > 0 ? 'has-selected' : ''}">
            ${selCount > 0 ? `Đã chọn ${selCount}/${gSymptoms.length}` : `${gSymptoms.length}`}
          </span>
        </div>
      `;
    });

    this.dropdownMenu.innerHTML = html;

    this.dropdownMenu.querySelectorAll(".dropdown-menu-item").forEach(item => {
      item.addEventListener("click", (e) => {
        const catId = e.currentTarget.getAttribute("data-cat-id");
        this.selectCategory(catId);
      });
    });
  }

  /* --- 2. RENDER TOÀN BỘ DANH SÁCH CÁC NHÓM TRIỆU CHỨNG --- */
  renderSymptomsList() {
    if (!this.container) return;
    const kb = this.kbManager.getKB();
    const groups = kb.symptomGroups || [];
    const symptoms = kb.symptoms || [];

    this.container.innerHTML = groups.map(group => {
      const groupSymptoms = symptoms.filter(s => s.groupId === group.id);
      if (groupSymptoms.length === 0) return "";

      const groupSelectedCount = groupSymptoms.filter(s => (this.currentSelectedSymptoms[s.id] || 0) > 0).length;

      return `
        <div class="symptom-group-box" data-group-id="${group.id}">
          <div class="symptom-group-header ${this.allExpanded ? 'open' : ''}">
            <div class="group-title-left">
              <i class="${group.icon || 'fa-solid fa-folder'}"></i>
              <span>${group.name}</span>
              <span class="group-stats-badge ${groupSelectedCount > 0 ? 'has-selected' : ''}">
                ${groupSelectedCount > 0 ? `Đã chọn ${groupSelectedCount}/${groupSymptoms.length}` : `${groupSymptoms.length} triệu chứng`}
              </span>
            </div>
            <i class="fa-solid fa-chevron-down toggle-icon ${this.allExpanded ? 'rotated' : ''}"></i>
          </div>
          <div class="symptom-group-content" style="display: ${this.allExpanded ? 'flex' : 'none'};">
            ${groupSymptoms.map(sym => {
              const currentCF = this.currentSelectedSymptoms[sym.id] || 0;
              const isSelected = currentCF > 0;
              return `
                <div class="symptom-row ${isSelected ? 'selected' : ''}" data-symptom-id="${sym.id}" data-group-id="${group.id}">
                  <div class="symptom-info">
                    <span class="symptom-id-badge">${sym.id}</span>
                    <span class="symptom-name">${sym.name}</span>
                  </div>
                  <div class="symptom-control">
                    <select class="cf-select" data-id="${sym.id}">
                      <option value="0" ${currentCF === 0 ? 'selected' : ''}>Không có (0%)</option>
                      <option value="0.4" ${currentCF === 0.4 ? 'selected' : ''}>Nghi ngờ / Nhẹ (40%)</option>
                      <option value="0.7" ${currentCF === 0.7 ? 'selected' : ''}>Có khả năng / Vừa (70%)</option>
                      <option value="1.0" ${currentCF === 1.0 ? 'selected' : ''}>Chắc chắn có (100%)</option>
                    </select>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }).join("");

    // Accordion Toggle
    this.container.querySelectorAll(".symptom-group-header").forEach(header => {
      header.addEventListener("click", () => {
        const box = header.closest(".symptom-group-box");
        const content = box.querySelector(".symptom-group-content");
        const toggleIcon = header.querySelector(".toggle-icon");
        const isHidden = content.style.display === "none";
        content.style.display = isHidden ? "flex" : "none";
        header.classList.toggle("open", isHidden);
        toggleIcon.classList.toggle("rotated", isHidden);
      });
    });

    // Event Thay đổi CF
    this.container.querySelectorAll(".cf-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const symId = e.target.getAttribute("data-id");
        const val = parseFloat(e.target.value);
        const row = e.target.closest(".symptom-row");

        if (val > 0) {
          this.currentSelectedSymptoms[symId] = val;
          if (row) row.classList.add("selected");
        } else {
          delete this.currentSelectedSymptoms[symId];
          if (row) row.classList.remove("selected");
        }

        this.updateBadges();
        this.renderCategoryDropdown();
      });
    });

    this.applyFilter();
  }

  /* --- 3. ÁP DỤNG BỘ LỌC (TÌM KIẾM + CUSTOM DROPDOWN) --- */
  applyFilter() {
    if (!this.container) return;
    const q = this._stripVN(this.currentSearchQuery.trim());
    const cat = this.activeCategoryFilter;

    this.container.querySelectorAll(".symptom-group-box").forEach(box => {
      const groupId = box.getAttribute("data-group-id");
      let visibleCount = 0;

      const rows = box.querySelectorAll(".symptom-row");
      rows.forEach(row => {
        const symId = row.getAttribute("data-symptom-id") || "";
        const symName = row.querySelector(".symptom-name") ? row.querySelector(".symptom-name").textContent : "";
        const text = this._stripVN(symId + " " + symName);

        const matchSearch = q === "" || text.includes(q);
        let matchCat = true;

        if (cat === "selected") {
          matchCat = (this.currentSelectedSymptoms[symId] || 0) > 0;
        } else if (cat !== "all") {
          matchCat = groupId === cat;
        }

        if (matchSearch && matchCat) {
          row.style.display = "flex";
          visibleCount++;
        } else {
          row.style.display = "none";
        }
      });

      if (visibleCount > 0) {
        box.style.display = "block";
        // Tự động mở nhóm nếu đang tìm kiếm hoặc đang ở tab "Đã chọn"
        if (q !== "" || cat === "selected") {
          const content = box.querySelector(".symptom-group-content");
          const header = box.querySelector(".symptom-group-header");
          const toggleIcon = box.querySelector(".toggle-icon");
          if (content) content.style.display = "flex";
          if (header) header.classList.add("open");
          if (toggleIcon) toggleIcon.classList.add("rotated");
        }
      } else {
        box.style.display = "none";
      }
    });
  }

  /* --- 4. THAO TÁC MỞ RỘNG / THU GỌN TẤT CẢ --- */
  setExpandAllState(expanded) {
    this.allExpanded = expanded;
    if (!this.container) return;

    this.container.querySelectorAll(".symptom-group-box").forEach(box => {
      const content = box.querySelector(".symptom-group-content");
      const header = box.querySelector(".symptom-group-header");
      const toggleIcon = box.querySelector(".toggle-icon");

      if (content) content.style.display = expanded ? "flex" : "none";
      if (header) header.classList.toggle("open", expanded);
      if (toggleIcon) toggleIcon.classList.toggle("rotated", expanded);
    });
  }

  /* --- 5. CẬP NHẬT BADGES & STATS --- */
  updateBadges() {
    const kb = this.kbManager.getKB();
    const symptoms = kb.symptoms || [];
    const totalSelected = Object.keys(this.currentSelectedSymptoms).length;

    if (this.totalSymptomsCount) this.totalSymptomsCount.textContent = symptoms.length;
    if (this.selectedSymptomsCount) this.selectedSymptomsCount.textContent = totalSelected;
    if (this.selectedCountNumber) this.selectedCountNumber.textContent = totalSelected;

    // Cập nhật thống kê trên từng nhóm
    if (this.container) {
      this.container.querySelectorAll(".symptom-group-box").forEach(box => {
        const groupId = box.getAttribute("data-group-id");
        const groupSymptoms = symptoms.filter(s => s.groupId === groupId);
        const groupSelectedCount = groupSymptoms.filter(s => (this.currentSelectedSymptoms[s.id] || 0) > 0).length;

        const badge = box.querySelector(".group-stats-badge");
        if (badge) {
          if (groupSelectedCount > 0) {
            badge.className = "group-stats-badge has-selected";
            badge.textContent = `Đã chọn ${groupSelectedCount}/${groupSymptoms.length}`;
          } else {
            badge.className = "group-stats-badge";
            badge.textContent = `${groupSymptoms.length} triệu chứng`;
          }
        }
      });
    }
  }

  clearAll() {
    this.currentSelectedSymptoms = {};
    if (this.container) {
      this.container.querySelectorAll(".symptom-row").forEach(r => r.classList.remove("selected"));
      this.container.querySelectorAll(".cf-select").forEach(s => s.value = "0");
    }
    if (this.searchInput) {
      this.searchInput.value = "";
      this.currentSearchQuery = "";
      if (this.btnClearSearch) this.btnClearSearch.style.display = "none";
    }
    this.activeCategoryFilter = "all";
    this.updateQuickTagsState();
    this.renderCategoryDropdown();
    this.updateBadges();
    this.applyFilter();
    this.renderEmptyResults();
    if (this.onInferenceComplete) {
      this.onInferenceComplete(null, this.currentSelectedSymptoms);
    }
  }

  setSymptoms(symptomsMap) {
    this.currentSelectedSymptoms = { ...symptomsMap };
    this.renderAll();
    this.runInference();
  }

  runInference() {
    this.lastInferenceResult = this.forwardEngine.infer(this.currentSelectedSymptoms);
    this.renderResults(this.lastInferenceResult);

    if (this.btnViewExplanation) {
      this.btnViewExplanation.style.display = "inline-flex";
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
        <p style="font-weight: 600; font-size: 1rem; color: var(--text-primary);">Chưa có dữ liệu suy diễn lâm sàng.</p>
        <p style="font-size: 0.85rem; margin-top: 0.4rem; color: var(--text-muted); line-height: 1.5;">
          Vui lòng chọn các triệu chứng ở cột bên trái và nhấn nút <strong>"Thực hiện Suy diễn tiến"</strong> ở trên.
        </p>
      </div>
    `;
    if (this.btnViewExplanation) {
      this.btnViewExplanation.style.display = "none";
    }
  }

  /* --- 6. RENDER KẾT QUẢ CHẨN ĐOÁN CAO CẤP (CLINICAL SHOWCASE) --- */
  renderResults(result) {
    if (!this.resultsContainer) return;

    if (!result || (result.results || []).length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-amber);"></i>
          <p style="color: var(--text-primary); font-weight: 600; font-size: 1rem;">Không có bệnh nào thỏa mãn tập luật hiện tại.</p>
          <p style="font-size: 0.85rem; margin-top: 0.4rem; color: var(--text-muted); line-height: 1.5;">
            Các triệu chứng đã chọn chưa đủ để kích hoạt bất kỳ luật nào trong cơ sở tri thức, hoặc triệu chứng thuộc về các bệnh khác chưa được định nghĩa.
          </p>
        </div>
      `;
      return;
    }

    const kb = this.kbManager.getKB();

    this.resultsContainer.innerHTML = `
      <div class="result-card-list">
        ${result.results.map((item, index) => {
          const isTop = index === 0;
          const dis = item.disease || {};
          const interp = item.interpretation;
          const cfPercent = interp.percentage;
          const diseaseColor = dis.color || '#3b82f6';

          // 1. Phân tích ma trận chứng cứ lâm sàng (Triệu chứng đã khớp vs còn thiếu)
          const diseaseRules = (kb.rules || []).filter(r => r.conclusion === (dis.id || item.diseaseId));
          const allRelatedPremiseIds = new Set();
          diseaseRules.forEach(r => (r.premises || []).forEach(p => allRelatedPremiseIds.add(p)));

          const matchedPremises = [];
          const missingPremises = [];

          allRelatedPremiseIds.forEach(pId => {
            const sym = (kb.symptoms || []).find(s => s.id === pId) || { id: pId, name: pId };
            const userCF = this.currentSelectedSymptoms[pId];
            if (userCF !== undefined && userCF > 0) {
              matchedPremises.push({ ...sym, userCF });
            } else {
              missingPremises.push(sym);
            }
          });

          // 2. Định dạng danh sách cảnh báo nguy hiểm thành tags
          let warningTagsHtml = '';
          if (dis.warningSigns) {
            const signs = dis.warningSigns.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
            warningTagsHtml = `
              <div class="warning-tags-grid">
                ${signs.map(sign => `
                  <div class="warning-tag-pill">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>${sign}</span>
                  </div>
                `).join('')}
              </div>
            `;
          }

          // 3. Định dạng khuyến nghị xử lý thành danh sách các bước có icon
          let recommendationStepsHtml = '';
          if (dis.recommendation) {
            const steps = dis.recommendation.split(/(?<=\.)\s+|;\s*/).map(p => p.trim()).filter(Boolean);
            recommendationStepsHtml = `
              <div class="recommendation-steps-list">
                ${steps.map(step => {
                  let icon = 'fa-solid fa-circle-check';
                  let iconColor = '#10b981';
                  const lower = step.toLowerCase();
                  if (lower.includes('aspirin') || lower.includes('không dùng') || lower.includes('tránh') || lower.includes('tuyệt đối')) {
                    icon = 'fa-solid fa-ban';
                    iconColor = '#ef4444';
                  } else if (lower.includes('nước') || lower.includes('oresol') || lower.includes('bù nước')) {
                    icon = 'fa-solid fa-droplet';
                    iconColor = '#06b6d4';
                  } else if (lower.includes('xét nghiệm') || lower.includes('y tế') || lower.includes('bệnh viện') || lower.includes('khám') || lower.includes('chỉ định')) {
                    icon = 'fa-solid fa-hospital-user';
                    iconColor = '#8b5cf6';
                  } else if (lower.includes('cách ly') || lower.includes('khẩu trang') || lower.includes('vitamin')) {
                    icon = 'fa-solid fa-shield-virus';
                    iconColor = '#f59e0b';
                  }
                  return `
                    <div class="recommendation-step-item">
                      <div class="step-icon-box" style="color: ${iconColor};">
                        <i class="${icon}"></i>
                      </div>
                      <div class="step-text">${step}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }

          return `
            <div class="disease-result-card ${isTop ? 'top-match' : ''}">
              
              <!-- 1. Header Card: Mã + Tên bệnh + Badge Nghi ngờ cao nhất -->
              <div class="disease-card-header">
                <div class="disease-title-block">
                  <span class="disease-code-pill">${dis.id || item.diseaseId}</span>
                  <h3 class="disease-name-title">${dis.name || item.diseaseId}</h3>
                  ${isTop ? `
                    <span class="top-match-crown-badge">
                      <i class="fa-solid fa-crown"></i> NGHI NGỜ CAO NHẤT
                    </span>
                  ` : ''}
                </div>
                <span class="badge ${interp.badgeClass}">${interp.label}</span>
              </div>

              <!-- 2. Thước Đo Độ Tin Cậy Lâm Sàng TRỰC QUAN (Clinical Confidence Meter) -->
              <div class="cf-meter-showcase ${isTop ? 'highlight' : ''}">
                <div class="cf-hero-grid">
                  
                  <!-- Khối Điểm Số % Lớn -->
                  <div class="cf-score-dial" style="--gauge-color: ${diseaseColor};">
                    <div class="cf-percentage-large" style="color: ${diseaseColor};">
                      ${cfPercent}<span class="cf-percent-sign">%</span>
                    </div>
                    <div class="cf-score-label">MYCIN CF: <strong>${item.finalCF}</strong></div>
                  </div>

                  <!-- Khối Thanh Thước Đo & Vạch Định Mức -->
                  <div class="cf-scale-panel">
                    <div class="cf-scale-header">
                      <span class="cf-scale-status-badge ${interp.badgeClass}">
                        <i class="fa-solid fa-chart-line"></i> ${interp.label}
                      </span>
                      <span class="cf-fired-rules-tag">
                        <i class="fa-solid fa-bolt-lightning"></i> ${item.firedRules.length} luật kích hoạt
                      </span>
                    </div>

                    <!-- Thanh Đo Tiến Trình Gradient -->
                    <div class="cf-segmented-bar-track">
                      <div class="cf-bar-fill" style="width: ${cfPercent}%; background: linear-gradient(90deg, ${diseaseColor}99 0%, ${diseaseColor} 100%);"></div>
                    </div>

                    <!-- Vạch Định Mức 3 Phân Vùng Rõ Rệt -->
                    <div class="cf-benchmark-zones">
                      <span class="zone ${cfPercent < 40 ? 'active' : ''}">
                        <i class="fa-solid fa-circle" style="font-size: 5px;"></i> &lt; 40%: Nghi ngờ
                      </span>
                      <span class="zone ${cfPercent >= 40 && cfPercent < 70 ? 'active' : ''}">
                        <i class="fa-solid fa-circle" style="font-size: 5px;"></i> 40 - 70%: Khả năng cao
                      </span>
                      <span class="zone ${cfPercent >= 70 ? 'active' : ''}">
                        <i class="fa-solid fa-circle" style="font-size: 5px;"></i> &gt; 70%: Rất chắc chắn
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              <!-- 3. Ma Trận Chứng Cớ Lâm Sàng Đã Ghi Nhận (CỰC KỲ TRỰC QUAN) -->
              <div class="clinical-evidence-box">
                <div class="evidence-box-header">
                  <span class="evidence-title">
                    <i class="fa-solid fa-notes-medical" style="color: var(--color-emerald);"></i> Bằng chứng lâm sàng đã ghi nhận:
                  </span>
                  <span class="evidence-count-badge">${matchedPremises.length} triệu chứng khớp</span>
                </div>

                <div class="evidence-chips-wrap">
                  ${matchedPremises.map(s => `
                    <span class="evidence-chip matched" title="Độ chắc chắn đã chọn: ${Math.round(s.userCF * 100)}%">
                      <i class="fa-solid fa-circle-check"></i>
                      <strong class="chip-code">${s.id}:</strong> ${s.name}
                      <span class="chip-cf-pill">${Math.round(s.userCF * 100)}%</span>
                    </span>
                  `).join('')}
                </div>

                ${missingPremises.length > 0 ? `
                  <div class="evidence-missing-row">
                    <span class="evidence-missing-label">
                      <i class="fa-regular fa-circle-question"></i> Triệu chứng đặc trưng khác cần theo dõi:
                    </span>
                    <div class="evidence-chips-wrap">
                      ${missingPremises.map(s => `
                        <span class="evidence-chip unconfirmed" title="Chưa ghi nhận ở bệnh nhân này">
                          <i class="fa-regular fa-circle-dot"></i>
                          <strong class="chip-code">${s.id}:</strong> ${s.name}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- 4. Khối Mô Tả Lâm Sàng -->
              <div class="clinical-section-card section-card-desc">
                <div class="section-header-title">
                  <i class="fa-solid fa-stethoscope" style="color: var(--color-primary);"></i> Mô tả lâm sàng & Bệnh học:
                </div>
                <div class="section-card-content">${dis.description || 'Chưa có mô tả chi tiết cho bệnh này.'}</div>
              </div>

              <!-- 5. Khối Dấu Hiệu Cảnh Báo Nguy Hiểm (Red Flags) -->
              ${dis.warningSigns ? `
                <div class="clinical-section-card section-card-warning">
                  <div class="section-header-title">
                    <i class="fa-solid fa-triangle-exclamation"></i> Dấu hiệu cảnh báo nguy hiểm (Cần can thiệp khẩn cấp):
                  </div>
                  <div class="section-card-content">${warningTagsHtml}</div>
                </div>
              ` : ''}

              <!-- 6. Khối Khuyến Nghị Xử Lý Ban Đầu (Actionable Steps) -->
              ${dis.recommendation ? `
                <div class="clinical-section-card section-card-recommendation">
                  <div class="section-header-title">
                    <i class="fa-solid fa-clipboard-list"></i> Khuyến nghị xử lý ban đầu & Phác đồ:
                  </div>
                  <div class="section-card-content">${recommendationStepsHtml}</div>
                </div>
              ` : ''}

              <!-- 7. Footer Card: Căn cứ pháp lý & Nút thao tác -->
              <div class="disease-card-footer">
                <div class="legal-reference-tag">
                  <i class="fa-solid fa-file-shield"></i>
                  <span>${dis.reference || 'Hướng dẫn chẩn đoán - Bộ Y Tế'}</span>
                </div>

                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <button class="btn-card-action btn-action-backward btn-backward-query" data-disease-id="${dis.id || item.diseaseId}" title="Truy vấn triệu chứng phân biệt">
                    <i class="fa-solid fa-magnifying-glass-plus"></i> Hỏi thêm (WHY)
                  </button>
                  <button class="btn-card-action btn-action-graph btn-focus-graph" data-disease-id="${dis.id || item.diseaseId}" title="Xem đường suy diễn trên đồ thị RPG">
                    <i class="fa-solid fa-project-diagram"></i> Đồ thị RPG
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

          this.renderAll();
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
