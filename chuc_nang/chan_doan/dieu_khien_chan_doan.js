/**
 * FEATURE MODULE: CLINICAL DIAGNOSIS CONTROLLER (BALANCED LIST & CUSTOM DROPDOWN)
 * Hiển thị toàn bộ danh mục triệu chứng với bộ lọc cao cấp & Cột kết quả chuẩn Y khoa
 */

class DiagnosisController {
  constructor({ kbManager, forwardEngine, backwardEngine, onInferenceComplete, onFocusGraph, onFocusFpg }) {
    this.kbManager = kbManager;
    this.forwardEngine = forwardEngine;
    this.backwardEngine = backwardEngine;
    this.onInferenceComplete = onInferenceComplete;
    this.onFocusGraph = onFocusGraph;
    this.onFocusFpg = onFocusFpg;

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
    this.btnExportPDF = document.getElementById("btnExportPDF");
    this.modalExplanation = document.getElementById("modalExplanation");
    this.explanationContent = document.getElementById("explanationModalContent");
    this.modalBackward = document.getElementById("modalBackward");
    this.backwardContent = document.getElementById("backwardModalContent");
    this.modalChainPipeline = document.getElementById("modalChainPipeline");
    this.chainModalContent = document.getElementById("chainModalContent");
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

    // 8. Nút Xuất Phiếu Kết Quả PDF Chuẩn Y Tế
    if (this.btnExportPDF) {
      this.btnExportPDF.addEventListener("click", () => {
        if (!this.lastInferenceResult) return;
        const topResult = (this.lastInferenceResult.results || [])[0];
        const sessionData = {
          id: "PHIEN_" + Date.now(),
          timestamp: new Date().toISOString(),
          inputSymptoms: this.currentSelectedSymptoms || {},
          results: this.lastInferenceResult.results || [],
          traceLogs: this.lastInferenceResult.traceLogs || [],
          topDiseaseName: topResult ? topResult.diseaseName : "Không xác định",
          topCF: topResult ? topResult.finalCF : 0
        };
        if (window.MauBaoCaoYTe) {
          window.MauBaoCaoYTe.xuatBaoCaoPDF(sessionData, this.kbManager.getKB());
        }
      });
    }

    // 9. Khởi tạo Rich Rule Hover Tooltip
    this._initRuleHoverTooltips();
  }

  /* --- RICH CLINICAL RULE HOVER TOOLTIP (TRỰC QUAN HÓA QUY TẮC R1, R2...) --- */
  _initRuleHoverTooltips() {
    let tooltip = document.getElementById("globalRuleHoverTooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "globalRuleHoverTooltip";
      tooltip.className = "rule-hover-tooltip";
      document.body.appendChild(tooltip);
    }

    document.body.addEventListener("mouseover", (e) => this._handleRuleMouseOver(e));
    document.body.addEventListener("mouseout", (e) => this._handleRuleMouseOut(e));
  }

  _handleRuleMouseOver(e) {
    const target = e.target.closest("[data-rule-id]");
    if (!target) return;
    if (e.relatedTarget && target.contains(e.relatedTarget)) return;

    const ruleId = target.getAttribute("data-rule-id");
    if (!ruleId) return;

    const ruleInfo = this._resolveRuleInfo(ruleId);
    if (!ruleInfo) return;

    const tooltip = document.getElementById("globalRuleHoverTooltip");
    if (!tooltip) return;

    tooltip.innerHTML = this._buildRuleTooltipHtml(ruleInfo);
    this._positionRuleTooltip(tooltip, target);
    tooltip.classList.add("visible");
  }

  _handleRuleMouseOut(e) {
    const target = e.target.closest("[data-rule-id]");
    if (!target) return;
    if (e.relatedTarget && target.contains(e.relatedTarget)) return;

    const tooltip = document.getElementById("globalRuleHoverTooltip");
    if (tooltip) {
      tooltip.classList.remove("visible");
    }
  }

  _resolveRuleInfo(ruleId) {
    const fired = (this.lastInferenceResult?.firedRules || []).find(r => r.ruleId === ruleId);
    const kb = this.kbManager.getKB();
    const kbRule = (kb.rules || []).find(r => r.id === ruleId);
    if (!fired && !kbRule) return null;

    const name = fired ? fired.ruleName : (kbRule ? kbRule.name : ruleId);
    const desc = fired ? fired.ruleDescription : (kbRule ? kbRule.description : "");
    const baseCF = fired ? Math.round((fired.ruleBaseCF || 0.9) * 100) : Math.round(((kbRule && kbRule.cf) || 0.9) * 100);
    const conclusion = fired ? fired.conclusion : (kbRule ? kbRule.conclusion : "");
    const outputCF = fired ? fired.outputCF : null;

    const premises = this._resolvePremisesList(fired, kbRule, kb);
    const conclusionName = this._resolveConclusionName(conclusion, kb, fired);

    return {
      ruleId,
      name,
      desc,
      baseCF,
      conclusion,
      conclusionName,
      outputCF,
      premises
    };
  }

  _resolvePremisesList(fired, kbRule, kb) {
    if (fired && fired.premiseDetails && fired.premiseDetails.length > 0) {
      return fired.premiseDetails.map(p => ({
        id: p.id,
        name: p.name,
        userCF: Math.round((p.userCF || 0) * 100)
      }));
    }

    const rawPremises = kbRule ? (kbRule.premises || []) : [];
    return rawPremises.map(pId => {
      const sym = (kb.symptoms || []).find(s => s.id === pId);
      const userCF = this.currentSelectedSymptoms[pId];
      return {
        id: pId,
        name: sym ? sym.name : pId,
        userCF: userCF !== undefined ? Math.round(userCF * 100) : 0
      };
    });
  }

  _resolveConclusionName(conclusionId, kb, fired) {
    if (fired && fired.conclusionName) return fired.conclusionName;
    const dis = (kb.diseases || []).find(d => d.id === conclusionId);
    if (dis) return dis.name;
    const sym = (kb.symptoms || []).find(s => s.id === conclusionId);
    if (sym) return sym.name;
    return conclusionId;
  }

  _buildRuleTooltipHtml(info) {
    const premisesHtml = info.premises.map(p => `
      <div class="rtt-premise-item">
        <span><strong>${p.id}:</strong> ${p.name}</span>
        <span style="font-weight: 700; color: ${p.userCF > 0 ? 'var(--color-emerald)' : 'var(--text-muted)'};">
          ${p.userCF > 0 ? `${p.userCF}%` : 'Chưa chọn'}
        </span>
      </div>
    `).join('');

    const cfCalculated = info.outputCF !== null
      ? `<span style="margin-left: auto; color: #10b981; font-size: 0.75rem;">(CF suy ra: ${Math.round(info.outputCF * 100)}%)</span>`
      : '';

    const descHtml = info.desc ? `
      <div class="rtt-desc-text">
        <i class="fa-solid fa-circle-info"></i> ${info.desc}
      </div>
    ` : '';

    return `
      <div class="rtt-header">
        <div>
          <div style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700;">
            Quy tắc suy luận lâm sàng
          </div>
          <div class="rtt-title">
            <i class="fa-solid fa-bolt" style="color: #8b5cf6;"></i> [${info.ruleId}] ${info.name}
          </div>
        </div>
        <span class="rtt-cf-badge">Độ tin cậy: ${info.baseCF}%</span>
      </div>

      <div class="rtt-section-title">
        <i class="fa-solid fa-list-check" style="color: var(--color-cyan);"></i> ĐIỀU KIỆN (NẾU CÓ TRIỆU CHỨNG):
      </div>
      <div class="rtt-premises-list">
        ${premisesHtml}
      </div>

      <div class="rtt-section-title">
        <i class="fa-solid fa-arrow-turn-down" style="color: #10b981;"></i> KẾT LUẬN (THÌ SUY RA):
      </div>
      <div class="rtt-conclusion-box">
        <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
        <span><strong>[${info.conclusion}]</strong> ${info.conclusionName}</span>
        ${cfCalculated}
      </div>

      ${descHtml}
    `;
  }

  _positionRuleTooltip(tooltip, target) {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth || 360;
    const tooltipHeight = tooltip.offsetHeight || 220;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    let top = rect.top - tooltipHeight - 12;
    if (top < 10) {
      top = rect.bottom + 12;
    }
    if (top + tooltipHeight > window.innerHeight - 10) {
      top = Math.max(10, window.innerHeight - tooltipHeight - 10);
    }

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
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

  getDiseaseFrame(disease) {
    if (typeof DiseaseFrame === "undefined") return null;
    return disease && disease.frame
      ? disease.frame
      : DiseaseFrame.fromDisease(disease, this.kbManager.getKB());
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
                    <span class="symptom-id-badge" style="${sym.isIntermediate ? 'background: rgba(139, 92, 246, 0.2); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.4);' : ''}">${sym.id}</span>
                    <span class="symptom-name">
                      ${sym.name}
                      ${sym.isIntermediate ? '<span style="font-size: 0.72rem; color: #a78bfa; font-weight: 700; margin-left: 4px; background: rgba(139, 92, 246, 0.15); padding: 1px 6px; border-radius: 4px;"><i class="fa-solid fa-network-wired"></i> Hội chứng</span>' : ''}
                    </span>
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
    if (this.btnExportPDF) {
      this.btnExportPDF.style.display = "none";
    }
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
    if (this.btnExportPDF) {
      this.btnExportPDF.style.display = "inline-flex";
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
    if (this.btnExportPDF) {
      this.btnExportPDF.style.display = "none";
    }
  }

  _getSymptomMeta(sId, kb) {
    const sym = (kb.symptoms || []).find(s => s.id === sId);
    const userCF = this.currentSelectedSymptoms[sId] !== undefined ? this.currentSelectedSymptoms[sId] : 1.0;
    return {
      id: sId,
      name: sym ? sym.name : sId,
      userCF: Math.round(userCF * 100)
    };
  }

  _collectChainInputs(imFiredRules, kb) {
    const inputIds = new Set();
    imFiredRules.forEach(r => (r.premises || []).forEach(p => inputIds.add(p)));
    return Array.from(inputIds).map(id => this._getSymptomMeta(id, kb));
  }

  _collectDownstreamChains(imId, firedRules, kb, diseaseResults) {
    const downstream = firedRules.filter(r => (r.premises || []).includes(imId));
    return downstream.map(rule => {
      const extraPremises = (rule.premises || [])
        .filter(p => p !== imId)
        .map(p => this._getSymptomMeta(p, kb));
      const disResult = (diseaseResults || []).find(d => (d.diseaseId || (d.disease && d.disease.id)) === rule.conclusion);
      const disMeta = (kb.diseases || []).find(d => d.id === rule.conclusion);
      const kbRule = (kb.rules || []).find(r => r.id === rule.ruleId);
      return {
        ruleId: rule.ruleId,
        ruleName: rule.ruleName || (kbRule ? kbRule.name : ''),
        ruleBaseCF: Math.round((rule.ruleBaseCF || 0.9) * 100),
        extraPremises,
        diseaseId: rule.conclusion,
        diseaseName: disMeta ? disMeta.name : rule.conclusion,
        finalCF: disResult ? Math.round(disResult.finalCF * 100) : Math.round((rule.outputCF || 0.9) * 100)
      };
    });
  }

  _buildChainStage1Html(inputSymptoms) {
    return `
      <div class="chain-stage-box chain-stage-input">
        <div>
          <div class="chain-stage-tag tag-input">
            <i class="fa-solid fa-stethoscope"></i> TẦNG 1: DẤU HIỆU LÂM SÀNG BAN ĐẦU
          </div>
          <div class="chain-pill-list">
            ${inputSymptoms.map(s => `
              <div class="chain-pill-item" title="${s.name}">
                <span><strong>${s.id}:</strong> ${s.name}</span>
                <span style="font-weight: 700; color: var(--color-cyan); margin-left: 6px;">${s.userCF}%</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="chain-meta-row" style="color: var(--text-muted); font-size: 0.72rem; margin-top: 0.6rem;">
          <span>${inputSymptoms.length} dữ kiện lâm sàng</span>
          <span style="font-weight: 700; color: var(--color-cyan);">Dữ liệu ghi nhận</span>
        </div>
      </div>
    `;
  }

  _buildChainStage2Html(im) {
    const firedChips = im.firedRules.map(r => `
      <span class="clinical-rule-chip" data-rule-id="${r.ruleId}" style="cursor: pointer;" title="Rê chuột xem chi tiết quy tắc ${r.ruleId}">
        <i class="fa-solid fa-bolt"></i> [${r.ruleId}]
      </span>
    `).join(' ');

    return `
      <div class="chain-stage-box chain-stage-intermediate">
        <div>
          <div class="chain-stage-tag tag-intermediate">
            <i class="fa-solid fa-network-wired"></i> TẦNG 2: HỘI CHỨNG TRUNG GIAN
          </div>
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.35rem;">
            <span style="font-family: monospace; font-weight: 800; color: #8b5cf6; font-size: 0.85rem; background: rgba(139, 92, 246, 0.18); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid rgba(139, 92, 246, 0.3);">
              ${im.id}
            </span>
            <span style="font-size: 1.15rem; font-weight: 900; color: #8b5cf6;">
              ${Math.round(im.finalCF * 100)}%
            </span>
          </div>
          <div class="chain-intermediate-heading">
            ${im.name}
          </div>
          <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 0.4rem; line-height: 1.45;">
            <i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Đã xác lập vào hồ sơ chẩn đoán để làm căn cứ xác định bệnh lý tiếp theo.
          </div>
        </div>
        <div class="chain-meta-row" style="margin-top: 0.6rem; flex-wrap: wrap; gap: 0.35rem;">
          <span style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
            Căn cứ từ: ${firedChips}
          </span>
        </div>
      </div>
    `;
  }

  _buildChainStage3Html(downstreamTargets) {
    if (!downstreamTargets || downstreamTargets.length === 0) {
      return `
        <div class="chain-stage-box chain-stage-goal">
          <div class="chain-stage-tag tag-goal">
            <i class="fa-solid fa-flag-checkered"></i> TẦNG 3: BỆNH ĐÍCH CHẨN ĐOÁN
          </div>
          <div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic; line-height: 1.5;">
            Hội chứng đã được xác lập. Cần bổ sung thêm triệu chứng đặc hiệu để kích hoạt bước xác định bệnh đích.
          </div>
        </div>
      `;
    }

    return `
      <div class="chain-stage-box chain-stage-goal">
        <div>
          <div class="chain-stage-tag tag-goal">
            <i class="fa-solid fa-flag-checkered"></i> TẦNG 3: BỆNH ĐÍCH CHẨN ĐOÁN
          </div>
          ${downstreamTargets.map(target => `
            <div style="background: rgba(16, 185, 129, 0.08); border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 8px; padding: 0.65rem; margin-bottom: 0.45rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                <span style="font-family: monospace; font-weight: 800; color: #10b981; font-size: 0.85rem; background: rgba(16, 185, 129, 0.18); padding: 0.15rem 0.45rem; border-radius: 4px;">
                  ${target.diseaseId}
                </span>
                <span style="font-size: 1.15rem; font-weight: 900; color: var(--color-emerald);">
                  ${target.finalCF}%
                </span>
              </div>
              <div style="font-size: 0.92rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.45rem;">
                ${target.diseaseName}
              </div>
              <div class="chain-stage-actions">
                <a href="../do_thi_rpg/do_thi_rpg.html?focus=${target.diseaseId}&mode=RPG" class="btn-stage-mini" title="Xem vị trí bệnh trên Mạng Petri RPG">
                  <i class="fa-solid fa-project-diagram"></i> Mạng RPG
                </a>
                <a href="../do_thi_rpg/do_thi_rpg.html?focus=${target.diseaseId}&mode=FPG" class="btn-stage-mini" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: rgba(16, 185, 129, 0.35);" title="Xem cây phụ thuộc sự kiện FPG">
                  <i class="fa-solid fa-network-wired"></i> Mạng FPG
                </a>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="chain-meta-row" style="color: var(--text-muted); font-size: 0.72rem; margin-top: 0.4rem;">
          <span>Kết luận suy diễn lâm sàng</span>
          <span style="font-weight: 700; color: var(--color-emerald);">Mục tiêu chẩn đoán</span>
        </div>
      </div>
    `;
  }

  _buildChainConnector1(im) {
    const firstRule = (im.firedRules && im.firedRules[0]) || {};
    const rId = firstRule.ruleId || 'R17';

    return `
      <div class="chain-connector">
        <span class="chain-rule-pill clinical-rule-chip" data-rule-id="${rId}" title="Rê chuột xem chi tiết quy tắc ${rId}">
          <i class="fa-solid fa-bolt"></i> [${rId}]
        </span>
        <div class="chain-arrow-icon">
          <i class="fa-solid fa-arrow-right"></i>
        </div>
        <div class="chain-step-label">Bước 1: Hội chứng</div>
      </div>
    `;
  }

  _buildChainConnector2(downstreamTargets) {
    if (!downstreamTargets || downstreamTargets.length === 0) {
      return `
        <div class="chain-connector">
          <div class="chain-arrow-icon" style="opacity: 0.4;">
            <i class="fa-solid fa-arrow-right"></i>
          </div>
        </div>
      `;
    }

    const branchesHtml = downstreamTargets.map(target => {
      const extraItems = target.extraPremises.map(p => {
        const shortName = p.name.length > 14 ? p.name.substring(0, 12) + '...' : p.name;
        return `<span class="chain-extra-badge" title="Dấu hiệu kết hợp: [${p.id}] ${p.name}">+ [${p.id}] ${shortName}</span>`;
      }).join('');

      return `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.2rem; margin-bottom: 0.35rem;">
          <span class="chain-rule-pill clinical-rule-chip" data-rule-id="${target.ruleId}" style="border-color: rgba(16, 185, 129, 0.4); color: #10b981; background: rgba(16, 185, 129, 0.12);" title="Rê chuột xem chi tiết quy tắc ${target.ruleId}">
            <i class="fa-solid fa-bolt"></i> [${target.ruleId}]
          </span>
          <div class="chain-arrow-icon" style="color: #10b981; margin: 1px 0;">
            <i class="fa-solid fa-arrow-right"></i>
          </div>
          ${extraItems}
        </div>
      `;
    }).join('');

    return `
      <div class="chain-connector">
        <div class="chain-step-label" style="color: #10b981; margin-bottom: 0.25rem;">Bước 2: Bệnh đích</div>
        ${branchesHtml}
      </div>
    `;
  }

  _buildSingleChainHtml(im, result, kb) {
    const inputSymptoms = this._collectChainInputs(im.firedRules, kb);
    const downstreamTargets = this._collectDownstreamChains(im.id, result.firedRules || [], kb, result.results || []);

    const stage1Html = this._buildChainStage1Html(inputSymptoms);
    const conn1Html = this._buildChainConnector1(im);
    const stage2Html = this._buildChainStage2Html(im);
    const conn2Html = this._buildChainConnector2(downstreamTargets);
    const stage3Html = this._buildChainStage3Html(downstreamTargets);

    const r1Chips = im.firedRules.map(r => `
      <span class="clinical-rule-chip" data-rule-id="${r.ruleId}" style="cursor: pointer;" title="Rê chuột xem chi tiết quy tắc">
        <i class="fa-solid fa-bolt"></i> [${r.ruleId}] Nhận diện hội chứng
      </span>
    `).join(', ');

    const r2Chips = downstreamTargets.length > 0
      ? downstreamTargets.map(target => {
          const extraStr = target.extraPremises.length > 0
            ? ` (+ [${target.extraPremises.map(p => p.id).join(', ')}])`
            : '';
          return `<span class="clinical-rule-chip" data-rule-id="${target.ruleId}" style="cursor: pointer; border-color: rgba(16, 185, 129, 0.4); color: #10b981; background: rgba(16, 185, 129, 0.12);" title="Rê chuột xem chi tiết quy tắc">
            <i class="fa-solid fa-bolt"></i> [${target.ruleId}] ${target.diseaseName}${extraStr}
          </span>`;
        }).join(' và ')
      : '...';

    const inputNames = inputSymptoms.map(s => `"${s.name}"`).join(', ');

    const targetsNarrative = downstreamTargets.length > 0
      ? downstreamTargets.map(t => {
          const extraDesc = t.extraPremises.length > 0
            ? ` kết hợp cùng dấu hiệu chuyên biệt ${t.extraPremises.map(s => `"${s.name}" [${s.id}]`).join(', ')}`
            : '';
          return `kích hoạt quy tắc <strong>[${t.ruleId}]</strong>${extraDesc} ➔ chẩn đoán xác định bệnh <strong>"${t.diseaseName}"</strong> với độ tin cậy <strong>${t.finalCF}%</strong>`;
        }).join('; đồng thời ')
      : 'tiếp tục chờ thêm dữ kiện đặc hiệu.';

    const narrativeStr = `Hệ thống ghi nhận bệnh nhân có các dấu hiệu lâm sàng ban đầu: ${inputNames} ➔ kích hoạt quy tắc nhận diện hội chứng để tổng hợp thành <strong>"${im.name}"</strong> (Độ tin cậy: ${Math.round(im.finalCF * 100)}%). Từ hội chứng này, hệ thống ${targetsNarrative}.`;

    return `
      <div style="margin-bottom: 1.25rem;">
        <div class="chain-flow-wrapper">
          ${stage1Html}
          ${conn1Html}
          ${stage2Html}
          ${conn2Html}
          ${stage3Html}
        </div>

        <div class="chain-formula-ribbon">
          <span style="font-weight: 700; color: #8b5cf6;"><i class="fa-solid fa-route"></i> Tiến trình suy diễn trực quan:</span>
          <span style="display: inline-flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
            <span>Triệu chứng ban đầu</span>
            <i class="fa-solid fa-arrow-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
            ${r1Chips}
            <i class="fa-solid fa-arrow-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
            <strong style="color: #8b5cf6;">${im.name}</strong> (${Math.round(im.finalCF * 100)}%)
            <i class="fa-solid fa-arrow-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
            ${r2Chips}
          </span>
        </div>

        <div class="chain-narrative-box">
          <i class="fa-solid fa-comment-medical" style="color: var(--color-primary); margin-right: 0.4rem;"></i>
          ${narrativeStr}
        </div>
      </div>
    `;
  }

  _findConvergentRules(firedRules, intermediateResults) {
    const imIds = new Set((intermediateResults || []).map(im => im.id));
    return (firedRules || []).filter(r => {
      const imPremises = (r.premises || []).filter(p => imIds.has(p));
      return imPremises.length >= 2;
    });
  }

  _buildConvergentChainHtml(convRule, result, kb) {
    const imIds = (convRule.premises || []);
    const parentIms = imIds.map(id => (result.intermediateResults || []).find(im => im.id === id)).filter(Boolean);
    const disMeta = (kb.diseases || []).find(d => d.id === convRule.conclusion) || { id: convRule.conclusion, name: convRule.conclusion };
    const disResult = (result.results || []).find(d => d.diseaseId === convRule.conclusion);
    const finalCF = disResult ? Math.round(disResult.finalCF * 100) : Math.round((convRule.outputCF || 0.9) * 100);

    const branchesData = parentIms.map(im => {
      const inputs = this._collectChainInputs(im.firedRules, kb);
      const rule = im.firedRules[0] || {};
      return { im, inputs, rule };
    });

    const stage1Html = `
      <div class="chain-stage-box chain-stage-input" style="flex: 1.1;">
        <div class="chain-stage-tag tag-input">
          <i class="fa-solid fa-stethoscope"></i> TẦNG 1: DỮ LIỆU BAN ĐẦU (2 NHÁNH)
        </div>
        ${branchesData.map((b, idx) => `
          <div style="margin-bottom: 0.5rem; padding: 0.45rem; background: rgba(6, 182, 212, 0.06); border-radius: 6px; border: 1px dashed rgba(6, 182, 212, 0.3);">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--color-cyan); margin-bottom: 0.25rem;">
              Nhánh ${idx + 1} (➔ ${b.im.id}):
            </div>
            <div class="chain-pill-list">
              ${b.inputs.map(s => `
                <div class="chain-pill-item" title="${s.name}" style="font-size: 0.72rem; padding: 0.2rem 0.4rem;">
                  <span><strong>${s.id}:</strong> ${s.name}</span>
                  <span style="font-weight: 700; color: var(--color-cyan); margin-left: 4px;">${s.userCF}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    const conn1Html = `
      <div class="chain-connector">
        <div class="chain-step-label" style="color: #8b5cf6;">Bước 1: Song song</div>
        ${branchesData.map(b => `
          <span class="chain-rule-pill clinical-rule-chip" data-rule-id="${b.rule.ruleId || b.rule.id}" style="margin: 0.2rem 0;" title="Rê chuột xem quy tắc ${b.rule.ruleId || b.rule.id}">
            <i class="fa-solid fa-bolt"></i> [${b.rule.ruleId || b.rule.id}]
          </span>
        `).join('')}
        <div class="chain-arrow-icon" style="color: #8b5cf6; margin: 2px 0;">
          <i class="fa-solid fa-arrow-right"></i>
        </div>
      </div>
    `;

    const stage2Html = `
      <div class="chain-stage-box chain-stage-intermediate" style="flex: 1.1;">
        <div class="chain-stage-tag tag-intermediate">
          <i class="fa-solid fa-network-wired"></i> TẦNG 2: HỘI CHỨNG TRUNG GIAN (HỘI TỤ)
        </div>
        ${branchesData.map(b => `
          <div style="margin-bottom: 0.5rem; padding: 0.45rem; background: rgba(139, 92, 246, 0.08); border-radius: 6px; border: 1px solid rgba(139, 92, 246, 0.25);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
              <span style="font-family: monospace; font-weight: 800; color: #8b5cf6; font-size: 0.78rem; background: rgba(139, 92, 246, 0.18); padding: 0.1rem 0.35rem; border-radius: 4px;">
                ${b.im.id}
              </span>
              <span style="font-size: 0.95rem; font-weight: 900; color: #8b5cf6;">
                ${Math.round(b.im.finalCF * 100)}%
              </span>
            </div>
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">
              ${b.im.name}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    const conn2Html = `
      <div class="chain-connector">
        <div class="chain-step-label" style="color: #10b981;">Bước 2: Hội tụ</div>
        <span class="chain-rule-pill clinical-rule-chip" data-rule-id="${convRule.ruleId}" style="border-color: rgba(16, 185, 129, 0.4); color: #10b981; background: rgba(16, 185, 129, 0.12);" title="Rê chuột xem quy tắc hội tụ ${convRule.ruleId}">
          <i class="fa-solid fa-bolt"></i> [${convRule.ruleId}]
        </span>
        <div class="chain-arrow-icon" style="color: #10b981; margin: 3px 0;">
          <i class="fa-solid fa-angles-right"></i>
        </div>
        <span style="font-size: 0.68rem; font-weight: 700; color: #10b981;">(${imIds.join(' + ')})</span>
      </div>
    `;

    const stage3Html = `
      <div class="chain-stage-box chain-stage-goal">
        <div>
          <div class="chain-stage-tag tag-goal">
            <i class="fa-solid fa-flag-checkered"></i> TẦNG 3: BỆNH ĐÍCH HỘI TỤ
          </div>
          <div style="background: rgba(16, 185, 129, 0.08); border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 8px; padding: 0.65rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
              <span style="font-family: monospace; font-weight: 800; color: #10b981; font-size: 0.85rem; background: rgba(16, 185, 129, 0.18); padding: 0.15rem 0.45rem; border-radius: 4px;">
                ${disMeta.id}
              </span>
              <span style="font-size: 1.15rem; font-weight: 900; color: var(--color-emerald);">
                ${finalCF}%
              </span>
            </div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.45rem;">
              ${disMeta.name}
            </div>
            <div class="chain-stage-actions">
              <a href="../do_thi_rpg/do_thi_rpg.html?focus=${disMeta.id}&mode=RPG" class="btn-stage-mini" title="Xem trên Mạng Petri RPG">
                <i class="fa-solid fa-project-diagram"></i> Mạng RPG
              </a>
              <a href="../do_thi_rpg/do_thi_rpg.html?focus=${disMeta.id}&mode=FPG" class="btn-stage-mini" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: rgba(16, 185, 129, 0.35);" title="Xem cây phụ thuộc FPG">
                <i class="fa-solid fa-network-wired"></i> Mạng FPG
              </a>
            </div>
          </div>
        </div>
        <div class="chain-meta-row" style="color: var(--text-muted); font-size: 0.72rem; margin-top: 0.4rem;">
          <span>Kết luận suy diễn hội tụ</span>
          <span style="font-weight: 700; color: var(--color-emerald);">Chu kỳ 2</span>
        </div>
      </div>
    `;

    const branchNames = branchesData.map(b => `${b.im.id}: "${b.im.name}" (${Math.round(b.im.finalCF * 100)}%)`).join(' và ');

    return `
      <div style="margin-bottom: 1.5rem; border: 1.5px solid rgba(139, 92, 246, 0.35); border-radius: 12px; padding: 1rem; background: rgba(139, 92, 246, 0.03);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge" style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: #fff; font-size: 0.76rem; font-weight: 700; padding: 4px 10px; border-radius: 999px;">
              <i class="fa-solid fa-code-fork fa-rotate-180"></i> TIẾN TRÌNH SUY DIỄN HỘI TỤ ĐA HỘI CHỨNG
            </span>
            <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 600;">Quy tắc hội tụ [${convRule.ruleId}]</span>
          </div>
        </div>

        <div class="chain-flow-wrapper">
          ${stage1Html}
          ${conn1Html}
          ${stage2Html}
          ${conn2Html}
          ${stage3Html}
        </div>

        <div class="chain-formula-ribbon" style="margin-top: 0.85rem;">
          <span style="font-weight: 700; color: #8b5cf6;"><i class="fa-solid fa-route"></i> Tiến trình hội tụ:</span>
          <span style="display: inline-flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
            <span>Nhánh 1 & Nhánh 2</span>
            <i class="fa-solid fa-arrow-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
            ${branchesData.map(b => {
              const rId = b.rule.ruleId || b.rule.id;
              return `<span class="clinical-rule-chip" data-rule-id="${rId}" style="cursor: pointer;" title="Rê chuột xem chi tiết quy tắc ${rId}">
                <i class="fa-solid fa-bolt"></i> [${rId}]
              </span>`;
            }).join(' và ')}
            <i class="fa-solid fa-arrow-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
            ${parentIms.map(im => `
              <span class="badge" style="background: rgba(139, 92, 246, 0.18); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.35); font-weight: 700; font-size: 0.76rem; padding: 2px 7px; border-radius: 4px; cursor: help;" title="${im.name} (Độ tin cậy: ${Math.round(im.finalCF * 100)}%)">
                ${im.id}: ${im.name}
              </span>
            `).join(' ∧ ')}
            <i class="fa-solid fa-arrow-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
            <span class="clinical-rule-chip" data-rule-id="${convRule.ruleId}" style="cursor: pointer; border-color: rgba(16, 185, 129, 0.4); color: #10b981; background: rgba(16, 185, 129, 0.12);" title="Rê chuột xem chi tiết quy tắc ${convRule.ruleId}">
              <i class="fa-solid fa-bolt"></i> [${convRule.ruleId}] Hội tụ
            </span>
            <i class="fa-solid fa-arrow-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
            <strong style="color: var(--color-emerald); cursor: help;" title="Chẩn đoán xác định bệnh đích [${disMeta.id}]">${disMeta.name}</strong> (${finalCF}%)
          </span>
        </div>

        <div class="chain-narrative-box">
          <i class="fa-solid fa-comment-medical" style="color: var(--color-primary); margin-right: 0.4rem;"></i>
          <strong>Chu kỳ 1:</strong> Hệ thống kích hoạt song song 2 nhánh tiền đề ban đầu để tổng hợp thành 2 hội chứng trung gian ${branchNames}.<br>
          <i class="fa-solid fa-bolt" style="color: #10b981; margin-right: 0.4rem; margin-top: 0.35rem;"></i>
          <strong>Chu kỳ 2 (Hội tụ):</strong> Cả 2 hội chứng trung gian đã nạp vào Bộ nhớ làm việc cùng thỏa mãn tiền đề của quy tắc hội tụ <strong>[${convRule.ruleId}]</strong> để chẩn đoán xác định bệnh <strong>"${disMeta.name}"</strong> với độ tin cậy <strong>${finalCF}%</strong>.
        </div>
      </div>
    `;
  }

  _renderIntermediateSyndromes(result, kb) {
    const intermediateResults = result ? (result.intermediateResults || []) : [];
    if (intermediateResults.length === 0) return "";

    const syndromeNames = intermediateResults.map(im => `"${im.name}"`).join(', ');

    return `
      <div class="chain-pipeline-banner" style="padding: 0.95rem 1.15rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="chain-icon-badge">
              <i class="fa-solid fa-network-wired"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: var(--text-primary);">
                  Chẩn Đoán Qua Hội Chứng Lâm Sàng
                </h4>
                <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.74rem; padding: 2px 8px; border-radius: 999px; font-weight: 700;">
                  <i class="fa-solid fa-circle-check"></i> Đã nhận diện hội chứng
                </span>
              </div>
              <div style="margin-top: 0.25rem; font-size: 0.82rem; color: var(--text-secondary); line-height: 1.45;">
                Từ các triệu chứng ban đầu, hệ thống đã nhận diện được <strong>${syndromeNames}</strong> để làm căn cứ suy luận tiếp ra bệnh đích.
              </div>
            </div>
          </div>

          <div>
            <button type="button" class="btn-toggle-chain-detail btn-open-chain-modal" style="cursor: pointer;" title="Xem chi tiết các bước từ triệu chứng đến hội chứng và bệnh đích">
              <i class="fa-solid fa-diagram-project"></i>
              <span>Xem chi tiết sơ đồ suy luận</span>
              <i class="fa-solid fa-arrow-right" style="font-size: 0.78rem; margin-left: 2px;"></i>
            </button>
          </div>
        </div>
      </div>
    `;
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
    const intermediateHtml = this._renderIntermediateSyndromes(result, kb);

    this.resultsContainer.innerHTML = `
      ${intermediateHtml}
      <div class="result-card-list">
        ${result.results.map((item, index) => {
          const isTop = index === 0;
          const dis = item.disease || {};
          const diseaseFrame = this.getDiseaseFrame(dis);
          const frameSlots = diseaseFrame ? diseaseFrame.slots : {};
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
                        <i class="fa-solid fa-bolt-lightning"></i> ${item.firedRules.length} quy tắc suy luận
                      </span>
                    </div>

                    <!-- Danh sách các quy tắc suy luận (Rê chuột để xem chi tiết) -->
                    <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.45rem 0 0.35rem 0; align-items: center;">
                      <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">Căn cứ quy tắc:</span>
                      ${item.firedRules.map(r => `
                        <span class="clinical-rule-chip" data-rule-id="${r.ruleId}" style="cursor: pointer;" title="Rê chuột để xem chi tiết quy tắc ${r.ruleId}">
                          <i class="fa-solid fa-bolt"></i> [${r.ruleId}] ${r.ruleName || 'Quy tắc'}
                        </span>
                      `).join('')}
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

              <!-- 4b. Frame bệnh: các slot cấu thành khái niệm bệnh -->
              ${diseaseFrame ? `
                <div class="clinical-section-card section-card-frame">
                  <div class="section-header-title">
                    <i class="fa-solid fa-cubes-stacked" style="color: var(--color-purple);"></i> Frame khái niệm Bệnh:
                  </div>
                  <div class="frame-slot-grid">
                    <div><strong>Nhóm:</strong> ${frameSlots.nhomBenh}</div>
                    <div><strong>Tên khoa học:</strong> ${frameSlots.tenKhoaHoc}</div>
                    <div><strong>Mức độ:</strong> ${frameSlots.mucDoNguyHiem}</div>
                    <div><strong>Nguồn:</strong> ${frameSlots.nguonThamKhao}</div>
                    <div class="frame-slot-wide"><strong>Định nghĩa:</strong> ${frameSlots.moTa}</div>
                  </div>
                </div>
              ` : ''}

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
                  <button class="btn-card-action btn-action-graph btn-focus-fpg" data-disease-id="${dis.id || item.diseaseId}" title="Xem lan truyền sự kiện trên đồ thị FPG" style="background: rgba(6, 182, 212, 0.15); border-color: rgba(6, 182, 212, 0.4); color: #38bdf8;">
                    <i class="fa-solid fa-diagram-successor"></i> Đồ thị FPG
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

    this.resultsContainer.querySelectorAll(".btn-focus-fpg").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const disId = e.currentTarget.getAttribute("data-disease-id");
        if (this.onFocusFpg) this.onFocusFpg(disId);
      });
    });

    const btnOpenChain = this.resultsContainer.querySelector(".btn-open-chain-modal");
    if (btnOpenChain) {
      btnOpenChain.addEventListener("click", () => {
        this.openChainPipelineModal();
      });
    }
  }

  openChainPipelineModal() {
    if (!this.lastInferenceResult || !this.modalChainPipeline || !this.chainModalContent) return;
    const kb = this.kbManager.getKB();
    const intermediateResults = this.lastInferenceResult.intermediateResults || [];
    const convRules = this._findConvergentRules(this.lastInferenceResult.firedRules, intermediateResults);

    let html = '';
    if (convRules.length > 0) {
      html += convRules.map(r => this._buildConvergentChainHtml(r, this.lastInferenceResult, kb)).join('');
    } else {
      html += intermediateResults
        .map(im => this._buildSingleChainHtml(im, this.lastInferenceResult, kb))
        .join('');
    }

    this.chainModalContent.innerHTML = html;
    this.modalChainPipeline.classList.add("active");
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
          if (log.type === "CYCLE_START") {
            return `
              <div style="background: rgba(59, 130, 246, 0.12); border-left: 4px solid var(--color-primary); border-radius: 6px; padding: 0.65rem 0.9rem; font-weight: 700; color: #60a5fa; display: flex; align-items: center; gap: 0.5rem; margin: 0.25rem 0;">
                <i class="fa-solid fa-rotate"></i>
                <span>${log.message}</span>
              </div>
            `;
          } else if (log.type === "START") {
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
            const targetTypeLabel = dt.isDisease ? "Bệnh đích kết luận" : "Hội chứng trung gian (Đã nạp vào Working Memory)";
            return `
              <div class="trace-step-item" style="border-left-color: ${dt.isDisease ? 'var(--color-emerald)' : '#8b5cf6'};">
                <div class="trace-step-title" style="color: ${dt.isDisease ? '#34d399' : '#a78bfa'};">
                  Bước ${log.step} [Chu kỳ ${dt.cycle}]: ${log.message}
                </div>
                <div class="trace-step-body">
                  <strong>• Luật:</strong> ${dt.ruleDescription}<br>
                  <strong>• Các tiền đề:</strong> ${dt.premiseDetails.map(p => `[${p.id}] ${p.name} (CF=${p.userCF})`).join(" AND ")}<br>
                  <strong>• Công thức tính CF luật:</strong> <code>${dt.formulaStr}</code><br>
                  <strong>• Kết luận sinh ra:</strong> [${dt.conclusion}] ${dt.conclusionName} với CF = ${dt.outputCF} <em style="color: ${dt.isDisease ? '#34d399' : '#a78bfa'};">(${targetTypeLabel})</em>
                </div>
              </div>
            `;
          } else if (log.type === "RULE_SKIPPED") {
            return `
              <div class="trace-step-item" style="border-left-color: var(--color-amber);">
                <div class="trace-step-title" style="color: var(--color-amber);">Bước ${log.step} [Chu kỳ ${log.cycle}]: ${log.message}</div>
                <div class="trace-step-body">
                  <strong>Vì sao chưa áp dụng:</strong> luật này cần đủ tất cả tiền đề theo phép AND.<br>
                  <strong>Tiền đề còn thiếu:</strong> ${(log.missing || []).map(p => `[${p.id}] ${p.name}`).join("; ") || "Không có"}
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
