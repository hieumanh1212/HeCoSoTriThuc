/**
 * FEATURE MODULE: KNOWLEDGE BASE CONTROLLER
 * Điều phối giao diện hiển thị danh sách luật, triệu chứng, bệnh và form CRUD
 */

class KBController {
  constructor({ kbManager }) {
    this.kbManager = kbManager;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.rulesTbody = document.getElementById("rulesTableBody");
    this.symsTbody = document.getElementById("symptomsTableBody");
    this.disTbody = document.getElementById("diseasesTableBody");

    this.ruleCountBadge = document.getElementById("ruleCountBadge");
    this.symCountBadge = document.getElementById("symptomCountBadge");
    this.disCountBadge = document.getElementById("diseaseCountBadge");

    this.btnAddNewRule = document.getElementById("btnAddNewRule");
    this.btnExportKB = document.getElementById("btnExportKB");
    this.importJsonInput = document.getElementById("importJsonInput");
    this.btnResetKB = document.getElementById("btnResetKB");

    this.modalRuleForm = document.getElementById("modalRuleForm");
    this.ruleForm = document.getElementById("ruleForm");
    this.ruleFormModalTitle = document.getElementById("ruleFormModalTitle");
  }

  bindEvents() {
    if (this.btnAddNewRule) {
      this.btnAddNewRule.addEventListener("click", () => this.openAddRuleModal());
    }

    if (this.btnExportKB) {
      this.btnExportKB.addEventListener("click", () => this.kbManager.exportJSON());
    }

    if (this.importJsonInput) {
      this.importJsonInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            this.kbManager.importJSON(event.target.result);
            alert("Nhập dữ liệu cơ sở tri thức từ file JSON thành công!");
          } catch (err) {
            alert(err.message);
          }
        };
        reader.readAsText(file);
        e.target.value = "";
      });
    }

    if (this.btnResetKB) {
      this.btnResetKB.addEventListener("click", () => {
        if (confirm("Bạn có chắc chắn muốn khôi phục cơ sở tri thức về trạng thái chuẩn ban đầu của Bộ Y Tế?")) {
          this.kbManager.resetToDefault();
          alert("Đã khôi phục cơ sở tri thức mặc định!");
        }
      });
    }

    if (this.ruleForm) {
      this.ruleForm.addEventListener("submit", (e) => this.handleRuleFormSubmit(e));
    }
  }

  renderTables() {
    const kb = this.kbManager.getKB();

    if (this.ruleCountBadge) this.ruleCountBadge.textContent = (kb.rules || []).length;
    if (this.symCountBadge) this.symCountBadge.textContent = (kb.symptoms || []).length;
    if (this.disCountBadge) this.disCountBadge.textContent = (kb.diseases || []).length;

    // 1. Render Rules Table
    if (this.rulesTbody) {
      this.rulesTbody.innerHTML = (kb.rules || []).map(rule => {
        const dis = (kb.diseases || []).find(d => d.id === rule.conclusion);
        return `
          <tr>
            <td><strong style="color: var(--color-primary); font-family: 'JetBrains Mono';">${rule.id}</strong></td>
            <td>
              <div style="font-weight: 600;">${rule.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${rule.description || ''}</div>
            </td>
            <td>
              ${(rule.premises || []).map(pId => {
                const sym = (kb.symptoms || []).find(s => s.id === pId);
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

      this.rulesTbody.querySelectorAll(".btn-edit-rule").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const ruleId = e.currentTarget.getAttribute("data-id");
          this.openEditRuleModal(ruleId);
        });
      });

      this.rulesTbody.querySelectorAll(".btn-delete-rule").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const ruleId = e.currentTarget.getAttribute("data-id");
          if (confirm(`Bạn có chắc chắn muốn xóa luật [${ruleId}] khỏi cơ sở tri thức?`)) {
            this.kbManager.deleteRule(ruleId);
          }
        });
      });
    }

    // 2. Render Symptoms Table
    if (this.symsTbody) {
      this.symsTbody.innerHTML = (kb.symptoms || []).map(s => {
        const grp = (kb.symptomGroups || []).find(g => g.id === s.groupId);
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

    // 3. Render Diseases Table
    if (this.disTbody) {
      this.disTbody.innerHTML = (kb.diseases || []).map(d => {
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

  openAddRuleModal() {
    if (!this.modalRuleForm || !this.ruleForm) return;
    this.ruleFormModalTitle.textContent = "Thêm Luật Sinh Mới";
    this.ruleForm.reset();
    document.getElementById("formRuleId").value = "";

    this.populateRuleFormInputs();
    this.modalRuleForm.classList.add("active");
  }

  openEditRuleModal(ruleId) {
    const rule = this.kbManager.getRuleById(ruleId);
    if (!rule || !this.modalRuleForm) return;

    this.ruleFormModalTitle.textContent = `Chỉnh Sửa Luật [${rule.id}]`;
    document.getElementById("formRuleId").value = rule.id;
    document.getElementById("formRuleName").value = rule.name;
    document.getElementById("formRuleCF").value = rule.cf;
    document.getElementById("formRuleDesc").value = rule.description || "";

    this.populateRuleFormInputs(rule.premises, rule.conclusion);
    this.modalRuleForm.classList.add("active");
  }

  populateRuleFormInputs(selectedPremises = [], selectedConclusion = "") {
    const kb = this.kbManager.getKB();

    const premisesContainer = document.getElementById("formRulePremisesList");
    if (premisesContainer) {
      premisesContainer.innerHTML = (kb.symptoms || []).map(s => {
        const isChecked = selectedPremises.includes(s.id);
        return `
          <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; font-size: 0.8rem; cursor: pointer;">
            <input type="checkbox" name="premiseCheckbox" value="${s.id}" ${isChecked ? 'checked' : ''}>
            <span><strong style="color: var(--color-cyan);">[${s.id}]</strong> ${s.name}</span>
          </label>
        `;
      }).join("");
    }

    const conclusionSelect = document.getElementById("formRuleConclusion");
    if (conclusionSelect) {
      conclusionSelect.innerHTML = (kb.diseases || []).map(d => {
        const isSelected = d.id === selectedConclusion;
        return `<option value="${d.id}" ${isSelected ? 'selected' : ''}>[${d.id}] ${d.name}</option>`;
      }).join("");
    }
  }

  handleRuleFormSubmit(e) {
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
        this.kbManager.updateRule(ruleId, ruleData);
      } else {
        this.kbManager.addRule(ruleData);
      }
      this.modalRuleForm.classList.remove("active");
      alert("Lưu luật thành công!");
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  }
}

if (typeof window !== "undefined") {
  window.KBController = KBController;
}
