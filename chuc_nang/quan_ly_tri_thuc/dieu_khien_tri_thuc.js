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
    this.btnExportExcel = document.getElementById("btnExportExcel");
    this.btnOpenImportModal = document.getElementById("btnOpenImportModal");
    this.btnDownloadTemplate = document.getElementById("btnDownloadTemplate");
    this.btnResetKB = document.getElementById("btnResetKB");

    // Modal Import Excel Elements
    this.modalImportExcel = document.getElementById("modalImportExcel");
    this.modalDownloadTemplateLink = document.getElementById("modalDownloadTemplateLink");
    this.excelFileInput = document.getElementById("excelFileInput");
    this.selectedFileName = document.getElementById("selectedFileName");
    this.btnValidateExcel = document.getElementById("btnValidateExcel");
    this.countValid = document.getElementById("countValid");
    this.countInvalid = document.getElementById("countInvalid");
    this.totalRowsBadge = document.getElementById("totalRowsBadge");
    this.importPreviewTableBody = document.getElementById("importPreviewTableBody");
    this.btnSubmitImport = document.getElementById("btnSubmitImport");

    this.modalRuleForm = document.getElementById("modalRuleForm");
    this.ruleForm = document.getElementById("ruleForm");
    this.ruleFormModalTitle = document.getElementById("ruleFormModalTitle");

    // State biến tạm
    this.importedParsedRows = [];
    this.importedWorkbook = null;
  }

  bindEvents() {
    if (this.btnAddNewRule) {
      this.btnAddNewRule.addEventListener("click", () => this.openAddRuleModal());
    }

    if (this.btnExportExcel) {
      this.btnExportExcel.addEventListener("click", () => {
        try {
          this.kbManager.exportExcel();
        } catch (err) {
          alert(`Lỗi xuất Excel: ${err.message}`);
        }
      });
    }

    if (this.btnDownloadTemplate) {
      this.btnDownloadTemplate.addEventListener("click", () => {
        try {
          this.kbManager.downloadExcelTemplate();
        } catch (err) {
          alert(`Lỗi tải mẫu Excel: ${err.message}`);
        }
      });
    }

    if (this.modalDownloadTemplateLink) {
      this.modalDownloadTemplateLink.addEventListener("click", () => {
        try {
          this.kbManager.downloadExcelTemplate();
        } catch (err) {
          alert(`Lỗi tải mẫu Excel: ${err.message}`);
        }
      });
    }

    // Mở Modal Import Excel
    if (this.btnOpenImportModal) {
      this.btnOpenImportModal.addEventListener("click", () => this.openImportModal());
    }

    // Chọn file Excel từ máy
    if (this.excelFileInput) {
      this.excelFileInput.addEventListener("change", (e) => this.handleExcelFileSelect(e));
    }

    // Nút Kiểm tra / Validate dữ liệu
    if (this.btnValidateExcel) {
      this.btnValidateExcel.addEventListener("click", () => this.validateImportData());
    }

    // Nút Nạp dữ liệu vào CSDL
    if (this.btnSubmitImport) {
      this.btnSubmitImport.addEventListener("click", () => this.submitImportData());
    }

    if (this.btnResetKB) {
      this.btnResetKB.addEventListener("click", () => {
        if (confirm("Bạn có chắc chắn muốn khôi phục cơ sở tri thức về trạng thái chuẩn ban đầu của Bộ Y Tế?")) {
          this.kbManager.resetToDefault();
          this.renderTables();
          alert("Đã khôi phục cơ sở tri thức mặc định!");
        }
      });
    }

    if (this.ruleForm) {
      this.ruleForm.addEventListener("submit", (e) => this.handleRuleFormSubmit(e));
    }
  }

  // ============================================================================
  // LOGIC MODAL IMPORT EXCEL THEO ĐÚNG YÊU CẦU
  // ============================================================================

  openImportModal() {
    this.importedParsedRows = [];
    this.importedWorkbook = null;
    if (this.selectedFileName) {
      this.selectedFileName.classList.remove("has-file");
      this.selectedFileName.innerHTML = `<i class="fa-regular fa-file"></i> <span>Chưa có tệp nào được chọn</span>`;
    }
    if (this.excelFileInput) this.excelFileInput.value = "";
    if (this.btnValidateExcel) this.btnValidateExcel.disabled = true;
    if (this.btnSubmitImport) this.btnSubmitImport.disabled = true;
    if (this.countValid) this.countValid.textContent = "0";
    if (this.countInvalid) this.countInvalid.textContent = "0";
    if (this.totalRowsBadge) this.totalRowsBadge.textContent = "0 dòng";

    if (this.importPreviewTableBody) {
      this.importPreviewTableBody.innerHTML = `
        <tr id="importEmptyRow">
          <td colspan="9" class="import-empty-state">
            <div class="empty-icon-box"><i class="fa-solid fa-file-excel"></i></div>
            <div class="empty-text">Chưa có dữ liệu nào được tải lên</div>
            <div class="empty-subtext">Hãy bấm <strong>"Chọn tệp Excel"</strong> ở trên để nạp và xem trước dữ liệu</div>
          </td>
        </tr>
      `;
    }

    if (this.modalImportExcel) {
      this.modalImportExcel.classList.add("active");
    }
  }

  handleExcelFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const sizeKB = (file.size / 1024).toFixed(1);
    if (this.selectedFileName) {
      this.selectedFileName.classList.add("has-file");
      this.selectedFileName.innerHTML = `<i class="fa-solid fa-file-excel" style="color:#10b981; font-size:1.1rem;"></i> <strong>${file.name}</strong> <span style="color:var(--text-muted); font-size:0.75rem;">(${sizeKB} KB)</span>`;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (typeof XLSX === "undefined") {
          throw new Error("Thư viện SheetJS chưa được tải!");
        }

        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        this.importedWorkbook = workbook;

        const norm = (str) => String(str || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        const ruleSheetName = workbook.SheetNames.find(name => /luat|rule/i.test(name)) || workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[ruleSheetName]);

        if (!rows || rows.length === 0) {
          throw new Error("Trang tính rỗng hoặc không có dữ liệu!");
        }

        if (this.totalRowsBadge) {
          this.totalRowsBadge.textContent = `${rows.length} dòng`;
        }

        this.importedParsedRows = rows.map((row, idx) => {
          let rId = null, rName = null, rConclusion = null, rCF = 0.8, rPremises = [], rDesc = "";

          for (const [k, v] of Object.entries(row)) {
            const nk = norm(k);
            if (nk.includes("maluat") || nk === "id" || nk === "ma") rId = String(v).trim();
            else if (nk.includes("tenluat") || nk === "name" || nk === "ten") rName = String(v).trim();
            else if (nk.includes("mabenh") || nk.includes("conclusion") || nk.includes("ketluan")) rConclusion = String(v).trim();
            else if (nk.includes("cf") || nk.includes("tincay") || nk.includes("heso")) {
              const val = String(v).replace("%", "").replace(",", ".");
              rCF = parseFloat(val);
              if (rCF > 1.0 && rCF <= 100) rCF = rCF / 100;
            }
            else if (nk.includes("trieuchung") || nk.includes("tiende") || nk.includes("premises") || nk.includes("danhsach")) {
              const strVal = String(v || "");
              rPremises = strVal.split(/[,;\s]+/).map(s => s.trim()).filter(s => s.length > 0);
            }
            else if (nk.includes("mota") || nk.includes("description")) rDesc = String(v).trim();
          }

          return {
            stt: idx + 1,
            id: rId || `R_ROW_${idx + 1}`,
            name: rName || `Luật ${rId || idx + 1}`,
            conclusion: rConclusion || "",
            cf: isNaN(rCF) ? 0.85 : rCF,
            premises: rPremises,
            description: rDesc,
            status: "PENDING", // PENDING, VALID, INVALID
            errorMessage: ""
          };
        });

        // Hiển thị toàn bộ dữ liệu người dùng chọn ở dưới
        this.renderImportPreviewTable();

        // Kích hoạt nút Kiểm tra, vô hiệu hóa nút Nạp dữ liệu
        if (this.btnValidateExcel) this.btnValidateExcel.disabled = false;
        if (this.btnSubmitImport) this.btnSubmitImport.disabled = true;
        if (this.countValid) this.countValid.textContent = "0";
        if (this.countInvalid) this.countInvalid.textContent = "0";

      } catch (err) {
        alert(`❌ Lỗi đọc file Excel: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  renderImportPreviewTable() {
    if (!this.importPreviewTableBody) return;

    if (!this.importedParsedRows || this.importedParsedRows.length === 0) {
      this.importPreviewTableBody.innerHTML = `
        <tr id="importEmptyRow">
          <td colspan="9" class="import-empty-state">
            <div class="empty-icon-box"><i class="fa-solid fa-file-excel"></i></div>
            <div class="empty-text">Chưa có dữ liệu nào được tải lên</div>
            <div class="empty-subtext">Hãy bấm <strong>"Chọn tệp Excel"</strong> ở trên để nạp và xem trước dữ liệu</div>
          </td>
        </tr>
      `;
      return;
    }

    this.importPreviewTableBody.innerHTML = this.importedParsedRows.map(row => {
      let badgeHtml = `<span class="import-badge-pending"><i class="fa-solid fa-clock"></i> Chưa kiểm tra</span>`;
      let rowClass = "";

      if (row.status === "VALID") {
        badgeHtml = `<span class="import-badge-valid"><i class="fa-solid fa-circle-check"></i> Hợp lệ</span>`;
        rowClass = "import-row-valid";
      } else if (row.status === "INVALID") {
        badgeHtml = `<span class="import-badge-error"><i class="fa-solid fa-circle-xmark"></i> Lỗi</span>`;
        rowClass = "import-row-error";
      }

      return `
        <tr class="${rowClass}">
          <td style="text-align: center; font-weight: 600;">${row.stt}</td>
          <td>${badgeHtml}</td>
          <td style="color: ${row.status === 'INVALID' ? '#dc2626' : 'var(--text-muted)'}; font-weight: ${row.status === 'INVALID' ? '600' : 'normal'};">
            ${row.errorMessage || '-'}
          </td>
          <td><strong style="color: var(--color-primary); font-family: 'JetBrains Mono';">${row.id}</strong></td>
          <td style="font-weight: 600;">${row.name}</td>
          <td><strong style="color: #ef4444;">${row.conclusion || '<em>[Trống]</em>'}</strong></td>
          <td style="text-align: center;"><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${row.cf}</span></td>
          <td style="font-family: 'JetBrains Mono'; font-size: 0.75rem;">${(row.premises || []).join(", ") || '<em>[Trống]</em>'}</td>
          <td style="font-size: 0.75rem; color: var(--text-secondary);">${row.description || '-'}</td>
        </tr>
      `;
    }).join("");
  }

  validateImportData() {
    if (!this.importedParsedRows || this.importedParsedRows.length === 0) {
      alert("Vui lòng chọn tệp Excel trước khi kiểm tra!");
      return;
    }

    const kb = this.kbManager.getKB();
    const validDiseases = (kb.diseases || []).map(d => d.id.toUpperCase());
    const validSymptoms = (kb.symptoms || []).map(s => s.id.toUpperCase());

    const seenIds = new Set();
    let validCount = 0;
    let invalidCount = 0;

    for (const row of this.importedParsedRows) {
      const errors = [];

      // 1. Kiểm tra Mã luật
      if (!row.id || row.id.startsWith("R_ROW_")) {
        errors.push("Mã luật không được để trống");
      } else {
        const uId = row.id.toUpperCase();
        if (seenIds.has(uId)) {
          errors.push(`Mã luật [${row.id}] bị trùng lặp trong file`);
        } else {
          seenIds.add(uId);
        }
      }

      // 2. Kiểm tra Bệnh kết luận
      if (!row.conclusion) {
        errors.push("Mã bệnh kết luận không được để trống");
      } else if (!validDiseases.includes(row.conclusion.toUpperCase())) {
        errors.push(`Mã bệnh [${row.conclusion}] không tồn tại trong danh mục bệnh`);
      }

      // 3. Kiểm tra Hệ số tin cậy CF
      if (isNaN(row.cf) || row.cf <= 0 || row.cf > 1.0) {
        errors.push(`Hệ số CF (${row.cf}) không hợp lệ (yêu cầu từ 0.1 đến 1.0)`);
      }

      // 4. Kiểm tra Triệu chứng tiền đề
      if (!row.premises || row.premises.length === 0) {
        errors.push("Phải có ít nhất 1 triệu chứng tiền đề");
      } else {
        const invalidSyms = row.premises.filter(p => !validSymptoms.includes(p.toUpperCase()));
        if (invalidSyms.length > 0) {
          errors.push(`Mã triệu chứng [${invalidSyms.join(', ')}] không tồn tại`);
        }
      }

      // Đánh giá dòng
      if (errors.length > 0) {
        row.status = "INVALID";
        row.errorMessage = errors.join("; ");
        invalidCount++;
      } else {
        row.status = "VALID";
        row.errorMessage = "";
        validCount++;
      }
    }

    // Cập nhật giao diện thống kê & bảng
    if (this.countValid) this.countValid.textContent = validCount;
    if (this.countInvalid) this.countInvalid.textContent = invalidCount;
    this.renderImportPreviewTable();

    // Quy tắc: Chỉ khi toàn bộ dữ liệu hợp lệ (0 lỗi) thì mới kích hoạt nút Nạp dữ liệu
    if (invalidCount === 0 && validCount > 0) {
      if (this.btnSubmitImport) this.btnSubmitImport.disabled = false;
    } else {
      if (this.btnSubmitImport) this.btnSubmitImport.disabled = true;
    }
  }

  async submitImportData() {
    if (!this.importedParsedRows || this.importedParsedRows.length === 0) return;

    const invalidCount = this.importedParsedRows.filter(r => r.status !== "VALID").length;
    if (invalidCount > 0) {
      alert("Không thể nạp dữ liệu do vẫn còn dòng bị lỗi!");
      return;
    }

    try {
      // 1. Cập nhật các luật sinh hợp lệ vào KB
      const existingRules = this.kbManager.kb.rules || [];

      for (const row of this.importedParsedRows) {
        const newRuleObj = {
          id: row.id,
          name: row.name || `Luật ${row.id}`,
          conclusion: row.conclusion,
          cf: Number(row.cf) || 0.85,
          premises: row.premises,
          description: row.description || ""
        };

        const existIdx = existingRules.findIndex(r => r.id.toUpperCase() === row.id.toUpperCase());
        if (existIdx >= 0) {
          existingRules[existIdx] = newRuleObj;
        } else {
          existingRules.push(newRuleObj);
        }
      }

      this.kbManager.kb.rules = existingRules;

      // 2. Lưu vĩnh viễn vào SQLite (qua may_chu.js) hoặc IndexedDB
      await this.kbManager.saveToStorage();

      // 3. Đóng modal và render lại bảng
      if (this.modalImportExcel) this.modalImportExcel.classList.remove("active");
      this.renderTables();

      alert(`🎉 Chúc mừng! Đã nạp thành công ${this.importedParsedRows.length} luật sinh vào Cơ sở tri thức và đồng bộ CSDL.`);
    } catch (err) {
      alert(`❌ Lỗi lưu dữ liệu: ${err.message}`);
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
