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

    // Điều hướng lỗi
    this.errorNavigatorGroup = document.getElementById("errorNavigatorGroup");
    this.errorNavIndex = document.getElementById("errorNavIndex");
    this.btnPrevError = document.getElementById("btnPrevError");
    this.btnNextError = document.getElementById("btnNextError");
    this.pillInvalidCount = document.getElementById("pillInvalidCount");

    // State biến tạm
    this.importedParsedRows = [];
    this.importedWorkbook = null;
    this.errorRowIndices = [];
    this.currentErrorIndex = -1;

    // Cấu hình phân trang cho các bảng dữ liệu tri thức (10, 20, 50, 100)
    this.pagination = {
      rules: { page: 1, pageSize: 20 },
      symptoms: { page: 1, pageSize: 20 },
      diseases: { page: 1, pageSize: 20 }
    };

    // Tìm kiếm thông minh
    this.kbSearchInput = document.getElementById("kbSearchInput");
    this.btnKbClearSearch = document.getElementById("btnKbClearSearch");
    this.searchKeyword = "";

    // Bộ lọc khoảng hệ số CF (cho Tập luật)
    this.cfFilterGroup = document.getElementById("cfFilterGroup");
    this.cfRangeSelect = document.getElementById("cfRangeSelect");
    this.cfCustomRangeInputs = document.getElementById("cfCustomRangeInputs");
    this.cfMinInput = document.getElementById("cfMinInput");
    this.cfMaxInput = document.getElementById("cfMaxInput");
    this.cfFilter = { mode: "all", min: 0.0, max: 1.0 };
  }

  bindEvents() {
    // Sự kiện tìm kiếm dữ liệu tri thức theo từ khóa hoặc cú pháp khoảng CF
    if (this.kbSearchInput) {
      this.kbSearchInput.addEventListener("input", (e) => {
        this.searchKeyword = e.target.value.trim();
        if (this.btnKbClearSearch) {
          this.btnKbClearSearch.style.display = this.searchKeyword ? "inline-flex" : "none";
        }
        // Reset về trang 1 khi tìm kiếm
        this.pagination.rules.page = 1;
        this.pagination.symptoms.page = 1;
        this.pagination.diseases.page = 1;
        this.renderTables();
      });
    }

    if (this.btnKbClearSearch) {
      this.btnKbClearSearch.addEventListener("click", () => {
        if (this.kbSearchInput) this.kbSearchInput.value = "";
        this.searchKeyword = "";
        this.btnKbClearSearch.style.display = "none";
        this.pagination.rules.page = 1;
        this.pagination.symptoms.page = 1;
        this.pagination.diseases.page = 1;
        this.renderTables();
        if (this.kbSearchInput) this.kbSearchInput.focus();
      });
    }

    // Sự kiện lọc khoảng hệ số CF
    if (this.cfRangeSelect) {
      this.cfRangeSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        this.cfFilter.mode = val;

        if (val === "custom") {
          if (this.cfCustomRangeInputs) this.cfCustomRangeInputs.style.display = "inline-flex";
          const min = parseFloat(this.cfMinInput ? this.cfMinInput.value : "") || 0.0;
          const max = parseFloat(this.cfMaxInput ? this.cfMaxInput.value : "") || 1.0;
          this.cfFilter.min = min;
          this.cfFilter.max = max;
        } else {
          if (this.cfCustomRangeInputs) this.cfCustomRangeInputs.style.display = "none";
          if (val === "all") {
            this.cfFilter.min = 0.0;
            this.cfFilter.max = 1.0;
          } else {
            const parts = val.split("-");
            this.cfFilter.min = parseFloat(parts[0]) || 0.0;
            this.cfFilter.max = parseFloat(parts[1]) || 1.0;
          }
        }

        this.pagination.rules.page = 1;
        this.renderRulesTable();
      });
    }

    if (this.cfMinInput) {
      this.cfMinInput.addEventListener("input", () => {
        this.cfFilter.min = parseFloat(this.cfMinInput.value) || 0.0;
        this.pagination.rules.page = 1;
        this.renderRulesTable();
      });
    }

    if (this.cfMaxInput) {
      this.cfMaxInput.addEventListener("input", () => {
        this.cfFilter.max = parseFloat(this.cfMaxInput.value) || 1.0;
        this.pagination.rules.page = 1;
        this.renderRulesTable();
      });
    }

    if (this.btnAddNewRule) {
      this.btnAddNewRule.addEventListener("click", () => this.openAddRuleModal());
    }

    if (this.btnExportExcel) {
      this.btnExportExcel.addEventListener("click", () => {
        try {
          this.kbManager.exportExcel();
          ThongBao.thanhCong("Đã xuất thành công tệp Excel cơ sở tri thức!");
        } catch (err) {
          ThongBao.thatBai(`Lỗi xuất Excel: ${err.message}`);
        }
      });
    }

    if (this.btnDownloadTemplate) {
      this.btnDownloadTemplate.addEventListener("click", () => {
        try {
          this.kbManager.downloadExcelTemplate();
          ThongBao.thanhCong("Đã tải tệp mẫu Excel thành công!");
        } catch (err) {
          ThongBao.thatBai(`Lỗi tải mẫu Excel: ${err.message}`);
        }
      });
    }

    if (this.modalDownloadTemplateLink) {
      this.modalDownloadTemplateLink.addEventListener("click", () => {
        try {
          this.kbManager.downloadExcelTemplate();
          ThongBao.thanhCong("Đã tải tệp mẫu chuẩn thành công!");
        } catch (err) {
          ThongBao.thatBai(`Lỗi tải mẫu Excel: ${err.message}`);
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

    // Gắn sự kiện bấm vào từng dòng trong bảng xem trước để chọn nhanh
    if (this.importPreviewTableBody) {
      this.importPreviewTableBody.addEventListener("click", (e) => {
        const tr = e.target.closest("tr[data-row-index]");
        if (!tr) return;
        const rowIdx = parseInt(tr.dataset.rowIndex, 10);
        if (this.errorRowIndices && this.errorRowIndices.length > 0) {
          const errIdx = this.errorRowIndices.indexOf(rowIdx);
          if (errIdx >= 0) {
            this.jumpToError(errIdx);
          }
        }
      });
    }

    // Điều hướng vị trí dòng lỗi (Error Navigator)
    if (this.btnPrevError) {
      this.btnPrevError.addEventListener("click", () => this.jumpToError(this.currentErrorIndex - 1));
    }
    if (this.btnNextError) {
      this.btnNextError.addEventListener("click", () => this.jumpToError(this.currentErrorIndex + 1));
    }
    if (this.pillInvalidCount) {
      this.pillInvalidCount.addEventListener("click", () => {
        if (this.errorRowIndices && this.errorRowIndices.length > 0) {
          this.jumpToError(this.currentErrorIndex + 1);
        }
      });
    }

    // Phím tắt chuyển lỗi F8 / Shift+F8 khi modal đang mở
    document.addEventListener("keydown", (e) => {
      if (!this.modalImportExcel || !this.modalImportExcel.classList.contains("active")) return;
      if (this.errorRowIndices && this.errorRowIndices.length > 0) {
        if (e.key === "F8") {
          e.preventDefault();
          this.jumpToError(e.shiftKey ? this.currentErrorIndex - 1 : this.currentErrorIndex + 1);
        }
      }
    });

    if (this.btnResetKB) {
      this.btnResetKB.addEventListener("click", async () => {
        const isConfirmed = await (window.XacNhan ? window.XacNhan.khoiPhuc("Cơ sở tri thức Y tế", "Toàn bộ tập luật, triệu chứng và danh mục bệnh sẽ được đặt lại về dữ liệu chuẩn Bộ Y Tế.") : confirm("Bạn có chắc chắn muốn khôi phục cơ sở tri thức về trạng thái chuẩn ban đầu của Bộ Y Tế?"));
        if (isConfirmed) {
          this.kbManager.resetToDefault();
          this.renderTables();
          ThongBao.thanhCong("Đã khôi phục cơ sở tri thức về mặc định chuẩn Bộ Y Tế!");
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
    this.errorRowIndices = [];
    this.currentErrorIndex = -1;

    if (this.errorNavigatorGroup) {
      this.errorNavigatorGroup.style.display = "none";
    }

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

        const normalizeKey = (str) => {
          return String(str || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
        };

        const kb = this.kbManager.getKB();
        const ruleSheetName = workbook.SheetNames.find(name => {
          const n = normalizeKey(name);
          return n.includes("luat") || n.includes("rule") || n.includes("tapluat");
        }) || workbook.SheetNames[0];

        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[ruleSheetName]);

        if (!rows || rows.length === 0) {
          throw new Error("Trang tính rỗng hoặc không có dữ liệu!");
        }

        if (this.totalRowsBadge) {
          this.totalRowsBadge.textContent = `${rows.length} dòng`;
        }

        this.importedParsedRows = rows.map((row, idx) => {
          let rId = null, rName = null, rConclusion = null, rRawCF = "", rCF = null, rPremises = [], rDesc = "";

          for (const [k, v] of Object.entries(row)) {
            if (v === undefined || v === null || String(v).trim() === "") continue;
            const nk = normalizeKey(k);
            const strVal = String(v).trim();

            // 1. Mã luật
            if (nk.includes("maluat") || nk === "id" || nk === "ma" || nk.includes("ruleid") || nk === "sttluat") {
              rId = strVal;
            }
            // 2. Tên luật
            else if (nk.includes("tenluat") || nk === "name" || (nk.includes("ten") && !nk.includes("benh") && !nk.includes("trieuchung")) || nk.includes("rulename")) {
              rName = strVal;
            }
            // 3. Mã bệnh kết luận
            else if (nk.includes("mabenh") || nk === "conclusion" || nk === "ketluan" || (nk.includes("ketluan") && !nk.includes("ten")) || nk.includes("then")) {
              rConclusion = strVal;
            }
            // 4. Hệ số CF
            else if (nk.includes("cf") || nk.includes("tincay") || nk.includes("heso") || nk.includes("certainty")) {
              rRawCF = strVal;
              const cleanVal = strVal.replace("%", "").replace(",", ".").trim();
              const parsed = Number(cleanVal);
              if (!isNaN(parsed) && cleanVal !== "") {
                // Nếu người dùng nhập 85% hoặc 85 (>1 và <=100) -> quy đổi 0.85
                rCF = (parsed > 1.0 && parsed <= 100) ? Number((parsed / 100).toFixed(4)) : parsed;
              } else {
                rCF = NaN; // Không phải định dạng số
              }
            }
            // 5. Triệu chứng tiền đề
            else if (nk.includes("matrieuchung") || nk.includes("danhsach") || (nk.includes("tiende") && !nk.includes("ten")) || (nk.includes("trieuchung") && !nk.includes("ten")) || nk.includes("premises") || nk === "if") {
              rPremises = strVal.split(/[,;\n\r\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
            }
            // 6. Mô tả
            else if (nk.includes("mota") || nk.includes("description") || nk.includes("ghichu") || nk.includes("note")) {
              rDesc = strVal;
            }
          }

          // Dự phòng: Nếu kết luận là tên bệnh (VD: "Sốt xuất huyết Dengue") -> Tự động ánh xạ sang mã bệnh D01
          if (rConclusion) {
            const matchedDis = (kb.diseases || []).find(d => 
              d.id.toUpperCase() === rConclusion.toUpperCase() || 
              normalizeKey(d.name) === normalizeKey(rConclusion)
            );
            if (matchedDis) {
              rConclusion = matchedDis.id;
            }
          }

          return {
            stt: idx + 1,
            id: rId || "",
            name: rName || (rId ? `Luật ${rId}` : `Luật dòng ${idx + 1}`),
            conclusion: rConclusion || "",
            rawCF: rRawCF,
            cf: rCF,
            premises: rPremises || [],
            description: rDesc || "",
            status: "PENDING", // PENDING, VALID, INVALID
            errorMessage: ""
          };
        });

        // Reset trạng thái điều hướng lỗi
        this.errorRowIndices = [];
        this.currentErrorIndex = -1;
        if (this.errorNavigatorGroup) {
          this.errorNavigatorGroup.style.display = "none";
        }

        // Hiển thị toàn bộ dữ liệu người dùng chọn ở dưới
        this.renderImportPreviewTable();

        // Kích hoạt nút Kiểm tra, vô hiệu hóa nút Nạp dữ liệu
        if (this.btnValidateExcel) this.btnValidateExcel.disabled = false;
        if (this.btnSubmitImport) this.btnSubmitImport.disabled = true;
        if (this.countValid) this.countValid.textContent = "0";
        if (this.countInvalid) this.countInvalid.textContent = "0";

      } catch (err) {
        if (window.ThongBao) {
          window.ThongBao.thatBai(`Lỗi đọc tệp Excel: ${err.message}`);
        } else {
          alert(`❌ Lỗi đọc file Excel: ${err.message}`);
        }
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

    const escapeHtml = (str) => String(str || "").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    this.importPreviewTableBody.innerHTML = this.importedParsedRows.map((row, idx) => {
      let badgeHtml = `<span class="import-badge-pending"><i class="fa-solid fa-clock"></i> Chưa kiểm tra</span>`;
      let rowClass = "";

      if (row.status === "VALID") {
        badgeHtml = `<span class="import-badge-valid"><i class="fa-solid fa-circle-check"></i> Hợp lệ</span>`;
        rowClass = "import-row-valid";
      } else if (row.status === "INVALID") {
        badgeHtml = `<span class="import-badge-error"><i class="fa-solid fa-circle-xmark"></i> Lỗi</span>`;
        rowClass = "import-row-error";
      }

      const nameText = row.name || `Luật ${row.id || row.stt}`;
      const descText = row.description || "-";
      const premisesText = (row.premises || []).join(", ") || "[Trống]";

      const tooltipName = `📝 Tên luật sinh:\n${nameText}`;
      const tooltipPremises = `🔍 Triệu chứng tiền đề:\n${premisesText}`;
      const tooltipDesc = descText !== "-" ? `ℹ️ Mô tả luật:\n${descText}` : "";

      // Hiển thị badge CF: Hợp lệ (xanh) hoặc Không hợp lệ (đỏ)
      let cfBadge = "";
      const isCfValid = row.cf !== null && !isNaN(row.cf) && row.cf > 0 && row.cf <= 1.0;
      if (isCfValid) {
        cfBadge = `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${row.cf}</span>`;
      } else {
        const displayVal = row.rawCF || (row.cf === null ? "[Trống]" : String(row.cf));
        cfBadge = `<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;" title="Sai định dạng CF">${displayVal}</span>`;
      }
      const tooltipCF = isCfValid ? `⚖️ Hệ số tin cậy CF: ${row.cf}` : `❌ Hệ số CF không đúng định dạng (yêu cầu từ 0.01 đến 1.0): ${row.rawCF || '[Trống]'}`;

      // Xây dựng danh sách chi tiết lỗi (hiển thị đầy đủ, mỗi lỗi trên 1 dòng riêng biệt)
      let errorCellHtml = "";
      if (row.status === "INVALID") {
        const errorList = (row.errors && row.errors.length > 0) 
          ? row.errors 
          : (row.errorMessage ? row.errorMessage.split("; ").filter(Boolean) : ["Dữ liệu không hợp lệ"]);
        
        errorCellHtml = `
          <div class="import-error-list">
            ${errorList.map(err => `
              <div class="import-error-item">
                <i class="fa-solid fa-circle-xmark"></i>
                <span>${escapeHtml(err)}</span>
              </div>
            `).join("")}
          </div>
        `;
      } else if (row.status === "VALID") {
        errorCellHtml = `
          <div class="import-valid-text">
            <i class="fa-solid fa-circle-check"></i>
            <span>Dữ liệu hợp lệ</span>
          </div>
        `;
      } else {
        errorCellHtml = `<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Chưa kiểm tra</span>`;
      }

      return `
        <tr class="${rowClass}" data-row-index="${idx}">
          <td style="text-align: center; font-weight: 600;">${row.stt}</td>
          <td style="text-align: center;">${badgeHtml}</td>
          <td class="cell-error-detail">
            ${errorCellHtml}
          </td>
          <td><strong style="color: var(--color-primary); font-family: 'JetBrains Mono';">${row.id || '<em style="color:#f87171;">[Trống]</em>'}</strong></td>
          <td data-tooltip="${escapeHtml(tooltipName)}">
            <div class="cell-truncate text-rule-name" style="font-weight: 600;">
              ${nameText}
            </div>
          </td>
          <td><strong style="color: #ef4444;">${row.conclusion || '<em style="color:#f87171;">[Trống]</em>'}</strong></td>
          <td style="text-align: center;" data-tooltip="${escapeHtml(tooltipCF)}">${cfBadge}</td>
          <td data-tooltip="${escapeHtml(tooltipPremises)}">
            <div class="cell-truncate text-premises" style="font-family: 'JetBrains Mono'; font-size: 0.78rem;">
              ${premisesText}
            </div>
          </td>
          <td ${tooltipDesc ? `data-tooltip="${escapeHtml(tooltipDesc)}"` : ""}>
            <div class="cell-truncate text-description" style="font-size: 0.78rem; color: var(--text-secondary);">
              ${descText}
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  jumpToError(targetIndex) {
    if (!this.errorRowIndices || this.errorRowIndices.length === 0) {
      if (this.errorNavigatorGroup) this.errorNavigatorGroup.style.display = "none";
      return;
    }

    const totalErrors = this.errorRowIndices.length;
    if (targetIndex < 0) {
      this.currentErrorIndex = totalErrors - 1;
    } else if (targetIndex >= totalErrors) {
      this.currentErrorIndex = 0;
    } else {
      this.currentErrorIndex = targetIndex;
    }

    if (this.errorNavIndex) {
      this.errorNavIndex.textContent = `${this.currentErrorIndex + 1}/${totalErrors}`;
    }

    if (this.importPreviewTableBody) {
      const allRows = this.importPreviewTableBody.querySelectorAll("tr");
      allRows.forEach(r => r.classList.remove("row-focused"));

      const targetRowIndex = this.errorRowIndices[this.currentErrorIndex];
      const targetRow = this.importPreviewTableBody.querySelector(`tr[data-row-index="${targetRowIndex}"]`);
      if (targetRow) {
        targetRow.classList.add("row-focused");

        // Cuộn chính xác container để dòng lỗi luôn hiển thị rõ ràng bên dưới Sticky Thead
        const container = this.importPreviewTableBody.closest(".import-table-container");
        if (container) {
          const thead = container.querySelector("thead");
          const theadHeight = thead ? thead.offsetHeight : 42;
          
          const rowTop = targetRow.offsetTop;
          const rowHeight = targetRow.offsetHeight;
          const currentScrollTop = container.scrollTop;
          const visibleHeight = container.clientHeight;

          // Vùng an toàn hiển thị
          const safeTop = rowTop - theadHeight;
          const safeBottom = rowTop + rowHeight;

          // Nếu dòng lỗi bị thead che hoặc nằm ngoài tầm nhìn phía trên
          if (safeTop < currentScrollTop) {
            container.scrollTo({
              top: Math.max(0, safeTop - 8),
              behavior: "smooth"
            });
          }
          // Nếu dòng lỗi nằm ngoài tầm nhìn phía dưới
          else if (safeBottom > currentScrollTop + visibleHeight) {
            container.scrollTo({
              top: safeBottom - visibleHeight + 15,
              behavior: "smooth"
            });
          }
        }
      }
    }
  }

  validateImportData() {
    if (!this.importedParsedRows || this.importedParsedRows.length === 0) {
      ThongBao.canhBao("Vui lòng chọn tệp Excel trước khi kiểm tra!");
      return;
    }

    const kb = this.kbManager.getKB();
    const existingRules = kb.rules || [];
    const validDiseases = (kb.diseases || []).map(d => d.id.toUpperCase());
    const validSymptoms = (kb.symptoms || []).map(s => s.id.toUpperCase());

    // 1. Ánh xạ dữ liệu CSDL hiện có để đối chiếu trùng lặp
    const existingRuleIdMap = new Map(); // Mã luật hiện có: uId -> rule
    const existingLogicMap = new Map(); // Logic hiện có: "S01,S02->D01" -> rule

    existingRules.forEach(r => {
      const uId = (r.id || "").toUpperCase().trim();
      if (uId) {
        existingRuleIdMap.set(uId, r);
      }

      const sortedPremises = (r.premises || []).map(p => p.toUpperCase().trim()).filter(Boolean).sort().join(",");
      const conclusionId = (r.conclusion || "").toUpperCase().trim();
      if (sortedPremises && conclusionId) {
        existingLogicMap.set(`${sortedPremises}->${conclusionId}`, r);
      }
    });

    // 2. Map theo dõi trùng lặp nội bộ trong cùng file Excel
    const seenIdsInFile = new Map(); // uId -> stt dòng xuất hiện đầu tiên
    const seenLogicInFile = new Map(); // "S01,S02->D01" -> stt dòng xuất hiện đầu tiên

    let validCount = 0;
    let invalidCount = 0;

    for (const row of this.importedParsedRows) {
      const errors = [];

      // A. KIỂM TRA MÃ LUẬT (ID)
      if (!row.id || row.id.startsWith("R_ROW_")) {
        errors.push("Mã luật không được để trống");
      } else {
        const uId = row.id.toUpperCase().trim();

        // 1. Kiểm tra định dạng mã luật (chữ cái, chữ số, gạch dưới, gạch ngang)
        if (!/^[a-zA-Z0-9_\-]+$/.test(row.id.trim())) {
          errors.push(`Mã luật [${row.id}] không đúng định dạng (không chứa khoảng trắng/ký tự lạ, VD: R01, R15)`);
        }
        // 2. Kiểm tra trùng mã trong cùng file Excel
        else if (seenIdsInFile.has(uId)) {
          const firstStt = seenIdsInFile.get(uId);
          errors.push(`Trùng mã luật [${row.id}] với dòng STT ${firstStt} trong file`);
        }
        // 3. Kiểm tra trùng mã với các luật đã tồn tại trong CSDL
        else if (existingRuleIdMap.has(uId)) {
          const existRule = existingRuleIdMap.get(uId);
          errors.push(`Trùng mã luật [${row.id}] đã có trong CSDL (${existRule.name || existRule.id})`);
        } else {
          seenIdsInFile.set(uId, row.stt);
        }
      }

      // B. KIỂM TRA BỆNH KẾT LUẬN
      if (!row.conclusion) {
        errors.push("Mã bệnh kết luận không được để trống");
      } else if (!validDiseases.includes(row.conclusion.toUpperCase())) {
        errors.push(`Mã bệnh [${row.conclusion}] không tồn tại trong danh mục bệnh`);
      }

      // C. KIỂM TRA HỆ SỐ TIN CẬY CF (Yêu cầu số từ 0.01 đến 1.0)
      if (row.cf === null && (!row.rawCF || row.rawCF.trim() === "")) {
        errors.push("Hệ số CF không được để trống (yêu cầu từ 0.01 đến 1.0)");
      } else if (isNaN(row.cf)) {
        errors.push(`Hệ số CF [${row.rawCF}] không đúng định dạng số (ví dụ: 0.85, 0.1, 0.01)`);
      } else if (row.cf <= 0 || row.cf > 1.0) {
        errors.push(`Hệ số CF [${row.rawCF || row.cf}] nằm ngoài khoảng cho phép (yêu cầu từ 0.01 đến 1.0)`);
      }

      // D. KIỂM TRA TRIỆU CHỨNG TIỀN ĐỀ
      let hasValidPremises = false;
      if (!row.premises || row.premises.length === 0) {
        errors.push("Phải có ít nhất 1 triệu chứng tiền đề");
      } else {
        const invalidSyms = row.premises.filter(p => !validSymptoms.includes(p.toUpperCase()));
        if (invalidSyms.length > 0) {
          errors.push(`Mã triệu chứng [${invalidSyms.join(', ')}] không tồn tại trong danh mục`);
        } else {
          hasValidPremises = true;
        }
      }

      // E. KIỂM TRA TRÙNG LẶP TIỀN ĐỀ VÀ KẾT LUẬN (LOGICAL DUPLICATE RULE)
      if (hasValidPremises && row.conclusion && validDiseases.includes(row.conclusion.toUpperCase())) {
        const sortedPremises = row.premises.map(p => p.toUpperCase().trim()).sort().join(",");
        const conclusionId = row.conclusion.toUpperCase().trim();
        const logicSig = `${sortedPremises}->${conclusionId}`;

        // 1. Kiểm tra trùng tiền đề & kết luận trong cùng file
        if (seenLogicInFile.has(logicSig)) {
          const firstStt = seenLogicInFile.get(logicSig);
          errors.push(`Trùng lặp tiền đề & kết luận với dòng STT ${firstStt} trong file (cùng IF: [${row.premises.join(', ')}] -> THEN: [${row.conclusion}])`);
        }
        // 2. Kiểm tra trùng tiền đề & kết luận với CSDL đã có
        else if (existingLogicMap.has(logicSig)) {
          const existRule = existingLogicMap.get(logicSig);
          errors.push(`Trùng lặp tiền đề & kết luận với luật [${existRule.id}] đã có trong CSDL (cùng IF: [${row.premises.join(', ')}] -> THEN: [${row.conclusion}])`);
        } else {
          seenLogicInFile.set(logicSig, row.stt);
        }
      }

      // Đánh giá trạng thái dòng
      if (errors.length > 0) {
        row.status = "INVALID";
        row.errors = errors;
        row.errorMessage = errors.join("; ");
        invalidCount++;
      } else {
        row.status = "VALID";
        row.errors = [];
        row.errorMessage = "";
        validCount++;
      }
    }

    // Cập nhật danh sách vị trí các dòng lỗi
    this.errorRowIndices = [];
    this.importedParsedRows.forEach((row, idx) => {
      if (row.status === "INVALID") {
        this.errorRowIndices.push(idx);
      }
    });

    // Cập nhật giao diện thống kê & bảng
    if (this.countValid) this.countValid.textContent = validCount;
    if (this.countInvalid) this.countInvalid.textContent = invalidCount;
    this.renderImportPreviewTable();

    // Điều hướng đến lỗi đầu tiên nếu có
    if (this.errorRowIndices.length > 0) {
      if (this.errorNavigatorGroup) this.errorNavigatorGroup.style.display = "inline-flex";
      this.jumpToError(0);
    } else {
      this.currentErrorIndex = -1;
      if (this.errorNavigatorGroup) this.errorNavigatorGroup.style.display = "none";
    }

    // Thông báo nhanh góc màn hình
    if (invalidCount === 0 && validCount > 0) {
      ThongBao.thanhCong(`Kiểm tra hoàn tất: Toàn bộ ${validCount} dòng dữ liệu đều hợp lệ! Bạn có thể nạp vào CSDL.`);
      if (this.btnSubmitImport) this.btnSubmitImport.disabled = false;
    } else {
      ThongBao.canhBao(`Phát hiện ${invalidCount} dòng dữ liệu không hợp lệ. Vui lòng sử dụng nút điều hướng (↑ / ↓) để xem chi tiết.`);
      if (this.btnSubmitImport) this.btnSubmitImport.disabled = true;
    }
  }

  async submitImportData() {
    if (!this.importedParsedRows || this.importedParsedRows.length === 0) return;

    const invalidCount = this.importedParsedRows.filter(r => r.status !== "VALID").length;
    if (invalidCount > 0) {
      ThongBao.thatBai("Không thể nạp dữ liệu do vẫn còn dòng bị lỗi cú pháp!");
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

      ThongBao.thanhCong(`Đã nạp thành công ${this.importedParsedRows.length} luật sinh vào Cơ sở tri thức và đồng bộ CSDL!`);
    } catch (err) {
      ThongBao.thatBai(`Lỗi lưu dữ liệu: ${err.message}`);
    }
  }

  renderTables() {
    this.renderRulesTable();
    this.renderSymptomsTable();
    this.renderDiseasesTable();
  }

  // 1. Render Bảng Tập Luật (Rules Table) có tìm kiếm & phân trang
  renderRulesTable() {
    const kb = this.kbManager.getKB();
    const rawRules = kb.rules || [];

    // Sắp xếp danh sách tập luật theo Mã giảm dần (để luật mới thêm luôn hiển thị ngay trên đầu)
    const allRules = [...rawRules].sort((a, b) => {
      const idA = String(a.id || "");
      const idB = String(b.id || "");
      return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: "base" });
    });

    const removeVietnameseTones = (str) => {
      return String(str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
    };

    // Hàm phân tích khoảng CF từ ô tìm kiếm (vd: 0.8-0.9, >=0.85, <=0.7, cf: 0.7-0.95)
    const parseCFQuery = (text) => {
      if (!text) return null;
      const raw = text.trim();

      const cfPrefixMatch = raw.match(/^(?:cf|he\s*so)\s*[:=]?\s*(.*)$/i);
      const targetStr = cfPrefixMatch ? cfPrefixMatch[1].trim() : raw;

      // 1. Khoảng: 0.7 - 0.9, 0.7..0.9, 0.7 to 0.9
      const rangeMatch = targetStr.match(/^(\d+(?:\.\d+)?)\s*(?:-|->|to|\.\.|,)\s*(\d+(?:\.\d+)?)$/i);
      if (rangeMatch) {
        let min = parseFloat(rangeMatch[1]);
        let max = parseFloat(rangeMatch[2]);
        if (min > 1 && min <= 100) min /= 100;
        if (max > 1 && max <= 100) max /= 100;
        if (min > max) [min, max] = [max, min];
        return { min, max };
      }

      // 2. So sánh: >= 0.85, > 0.8, <= 0.9, < 0.8, = 0.85
      const compMatch = targetStr.match(/^(>=|>|<=|<|=)\s*(\d+(?:\.\d+)?)$/i);
      if (compMatch) {
        const op = compMatch[1];
        let val = parseFloat(compMatch[2]);
        if (val > 1 && val <= 100) val /= 100;
        if (op === ">=") return { min: val, max: 1.0 };
        if (op === ">") return { min: val + 0.0001, max: 1.0 };
        if (op === "<=") return { min: 0.0, max: val };
        if (op === "<") return { min: 0.0, max: val - 0.0001 };
        if (op === "=") return { min: val - 0.005, max: val + 0.005 };
      }

      if (cfPrefixMatch) {
        const singleNum = parseFloat(targetStr);
        if (!isNaN(singleNum)) {
          const val = (singleNum > 1 && singleNum <= 100) ? singleNum / 100 : singleNum;
          return { min: val - 0.02, max: val + 0.02 };
        }
      }

      return null;
    };

    const cfFromQuery = parseCFQuery(this.searchKeyword);
    const filterMinCF = cfFromQuery ? cfFromQuery.min : this.cfFilter.min;
    const filterMaxCF = cfFromQuery ? cfFromQuery.max : this.cfFilter.max;
    const isFilteringCF = (cfFromQuery !== null) || (this.cfFilter.mode !== "all");

    let rules = allRules;

    // A. Lọc theo khoảng hệ số CF
    if (isFilteringCF) {
      rules = rules.filter(r => {
        const cfVal = Number(r.cf) || 0;
        return cfVal >= (filterMinCF - 0.001) && cfVal <= (filterMaxCF + 0.001);
      });
    }

    // B. Lọc theo từ khóa text thông thường (nếu từ khóa không phải cú pháp khoảng CF)
    if (this.searchKeyword && !cfFromQuery) {
      const q = removeVietnameseTones(this.searchKeyword);
      rules = rules.filter(rule => {
        const matchId = removeVietnameseTones(rule.id).includes(q);
        const matchName = removeVietnameseTones(rule.name).includes(q);
        const matchDesc = removeVietnameseTones(rule.description).includes(q);
        const matchConc = removeVietnameseTones(rule.conclusion).includes(q);
        const dis = (kb.diseases || []).find(d => d.id === rule.conclusion);
        const matchDisName = dis && removeVietnameseTones(dis.name).includes(q);
        const matchPremises = (rule.premises || []).some(p => {
          if (removeVietnameseTones(p).includes(q)) return true;
          const sym = (kb.symptoms || []).find(s => s.id === p);
          return sym && removeVietnameseTones(sym.name).includes(q);
        });
        return matchId || matchName || matchDesc || matchConc || matchDisName || matchPremises;
      });
    }

    const isFiltered = Boolean(this.searchKeyword || isFilteringCF);
    if (this.ruleCountBadge) {
      this.ruleCountBadge.textContent = isFiltered ? `${rules.length}/${allRules.length}` : allRules.length;
    }

    const { page, pageSize } = this.pagination.rules;
    const totalItems = rules.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    const validPage = Math.min(Math.max(1, page), totalPages);
    this.pagination.rules.page = validPage;

    const startIdx = (validPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const currentRows = rules.slice(startIdx, endIdx);

    if (this.rulesTbody) {
      if (currentRows.length === 0) {
        this.rulesTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
              <i class="fa-solid fa-magnifying-glass" style="font-size: 1.8rem; opacity: 0.4; margin-bottom: 0.5rem; display: block;"></i>
              ${this.searchKeyword ? `Không tìm thấy luật sinh nào phù hợp với từ khóa "<strong>${this.searchKeyword}</strong>"` : "Chưa có dữ liệu luật sinh nào"}
            </td>
          </tr>
        `;
      } else {
        this.rulesTbody.innerHTML = currentRows.map(rule => {
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
                <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; font-family: 'JetBrains Mono'; font-weight: 700;">
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
          btn.addEventListener("click", async (e) => {
            const ruleId = e.currentTarget.getAttribute("data-id");
            const isConfirmed = await (window.XacNhan ? window.XacNhan.xoa(`Luật sinh [${ruleId}]`, `Luật [${ruleId}] sẽ bị xóa hoàn toàn khỏi cơ sở tri thức.`) : confirm(`Bạn có chắc chắn muốn xóa luật [${ruleId}] khỏi cơ sở tri thức?`));
            if (isConfirmed) {
              this.kbManager.deleteRule(ruleId);
              this.renderRulesTable();
              ThongBao.thanhCong(`Đã xóa luật [${ruleId}] thành công!`);
            }
          });
        });
      }
    }

    this.renderPaginationFooter("paginationRules", "rules", totalItems);
  }

  // 2. Render Bảng Triệu Chứng (Symptoms Table) có tìm kiếm & phân trang
  renderSymptomsTable() {
    const kb = this.kbManager.getKB();
    const allSymptoms = kb.symptoms || [];

    const removeVietnameseTones = (str) => {
      return String(str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
    };

    let symptoms = allSymptoms;
    if (this.searchKeyword) {
      const q = removeVietnameseTones(this.searchKeyword);
      symptoms = allSymptoms.filter(s => {
        const matchId = removeVietnameseTones(s.id).includes(q);
        const matchName = removeVietnameseTones(s.name).includes(q);
        const matchQuestion = removeVietnameseTones(s.question).includes(q);
        const grp = (kb.symptomGroups || []).find(g => g.id === s.groupId);
        const matchGroup = grp && removeVietnameseTones(grp.name).includes(q);
        return matchId || matchName || matchQuestion || matchGroup;
      });
    }

    if (this.symCountBadge) {
      this.symCountBadge.textContent = this.searchKeyword ? `${symptoms.length}/${allSymptoms.length}` : allSymptoms.length;
    }

    const { page, pageSize } = this.pagination.symptoms;
    const totalItems = symptoms.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    const validPage = Math.min(Math.max(1, page), totalPages);
    this.pagination.symptoms.page = validPage;

    const startIdx = (validPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const currentRows = symptoms.slice(startIdx, endIdx);

    if (this.symsTbody) {
      if (currentRows.length === 0) {
        this.symsTbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
              <i class="fa-solid fa-magnifying-glass" style="font-size: 1.8rem; opacity: 0.4; margin-bottom: 0.5rem; display: block;"></i>
              ${this.searchKeyword ? `Không tìm thấy triệu chứng nào phù hợp với từ khóa "<strong>${this.searchKeyword}</strong>"` : "Chưa có dữ liệu triệu chứng nào"}
            </td>
          </tr>
        `;
      } else {
        this.symsTbody.innerHTML = currentRows.map(s => {
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
    }

    this.renderPaginationFooter("paginationSymptoms", "symptoms", totalItems);
  }

  // 3. Render Bảng Danh Mục Bệnh (Diseases Table) có tìm kiếm & phân trang
  renderDiseasesTable() {
    const kb = this.kbManager.getKB();
    const allDiseases = kb.diseases || [];

    const removeVietnameseTones = (str) => {
      return String(str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
    };

    let diseases = allDiseases;
    if (this.searchKeyword) {
      const q = removeVietnameseTones(this.searchKeyword);
      diseases = allDiseases.filter(d => {
        const matchId = removeVietnameseTones(d.id).includes(q);
        const matchName = removeVietnameseTones(d.name).includes(q);
        const matchSeverity = removeVietnameseTones(d.severity).includes(q);
        const matchWarning = removeVietnameseTones(d.warningSigns).includes(q);
        const matchRef = removeVietnameseTones(d.reference).includes(q);
        return matchId || matchName || matchSeverity || matchWarning || matchRef;
      });
    }

    if (this.disCountBadge) {
      this.disCountBadge.textContent = this.searchKeyword ? `${diseases.length}/${allDiseases.length}` : allDiseases.length;
    }

    const { page, pageSize } = this.pagination.diseases;
    const totalItems = diseases.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    const validPage = Math.min(Math.max(1, page), totalPages);
    this.pagination.diseases.page = validPage;

    const startIdx = (validPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const currentRows = diseases.slice(startIdx, endIdx);

    if (this.disTbody) {
      if (currentRows.length === 0) {
        this.disTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
              <i class="fa-solid fa-magnifying-glass" style="font-size: 1.8rem; opacity: 0.4; margin-bottom: 0.5rem; display: block;"></i>
              ${this.searchKeyword ? `Không tìm thấy bệnh học nào phù hợp với từ khóa "<strong>${this.searchKeyword}</strong>"` : "Chưa có dữ liệu danh mục bệnh nào"}
            </td>
          </tr>
        `;
      } else {
        this.disTbody.innerHTML = currentRows.map(d => {
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

    this.renderPaginationFooter("paginationDiseases", "diseases", totalItems);
  }

  // 4. Hàm render component phân trang dùng chung cho cả 3 bảng
  renderPaginationFooter(containerId, tabKey, totalItems) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { page, pageSize } = this.pagination[tabKey];
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalItems);

    // Xây dựng danh sách các nút số trang
    let pageNumbersHtml = "";
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbersHtml += `<button class="btn-page-step ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) {
          pageNumbersHtml += `<button class="btn-page-step ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        pageNumbersHtml += `<span class="pagination-ellipsis">...</span>`;
        pageNumbersHtml += `<button class="btn-page-step" data-page="${totalPages}">${totalPages}</button>`;
      } else if (page >= totalPages - 3) {
        pageNumbersHtml += `<button class="btn-page-step" data-page="1">1</button>`;
        pageNumbersHtml += `<span class="pagination-ellipsis">...</span>`;
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pageNumbersHtml += `<button class="btn-page-step ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
      } else {
        pageNumbersHtml += `<button class="btn-page-step" data-page="1">1</button>`;
        pageNumbersHtml += `<span class="pagination-ellipsis">...</span>`;
        for (let i = page - 1; i <= page + 1; i++) {
          pageNumbersHtml += `<button class="btn-page-step ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        pageNumbersHtml += `<span class="pagination-ellipsis">...</span>`;
        pageNumbersHtml += `<button class="btn-page-step" data-page="${totalPages}">${totalPages}</button>`;
      }
    }

    container.innerHTML = `
      <div class="pagination-left">
        <div class="pagination-info-text">
          Hiển thị <strong>${startItem} - ${endItem}</strong> trên tổng số <strong>${totalItems}</strong> bản ghi
        </div>
        <div class="page-size-selector-wrap">
          <label>Hiển thị:</label>
          <select class="select-page-size" data-tab="${tabKey}">
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

    // Gắn sự kiện chuyển trang
    container.querySelectorAll(".btn-page-step[data-page]").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetPage = parseInt(btn.getAttribute("data-page"), 10);
        if (targetPage && targetPage !== page && targetPage >= 1 && targetPage <= totalPages) {
          this.pagination[tabKey].page = targetPage;
          if (tabKey === "rules") this.renderRulesTable();
          else if (tabKey === "symptoms") this.renderSymptomsTable();
          else if (tabKey === "diseases") this.renderDiseasesTable();
        }
      });
    });

    // Gắn sự kiện đổi pageSize (10, 20, 50, 100)
    const selectEl = container.querySelector(".select-page-size");
    if (selectEl) {
      selectEl.addEventListener("change", (e) => {
        const newPageSize = parseInt(e.target.value, 10);
        if (newPageSize) {
          this.pagination[tabKey].pageSize = newPageSize;
          this.pagination[tabKey].page = 1; // Reset về trang 1
          if (tabKey === "rules") this.renderRulesTable();
          else if (tabKey === "symptoms") this.renderSymptomsTable();
          else if (tabKey === "diseases") this.renderDiseasesTable();
        }
      });
    }
  }

  openAddRuleModal() {
    if (!this.modalRuleForm || !this.ruleForm) return;
    this.ruleFormModalTitle.textContent = "Thêm Luật Sinh Mới";
    this.ruleForm.reset();
    
    const originalIdEl = document.getElementById("formRuleOriginalId");
    if (originalIdEl) originalIdEl.value = "";
    
    const ruleIdInput = document.getElementById("formRuleId");
    if (ruleIdInput) {
      // Gợi ý mã luật tiếp theo
      const kb = this.kbManager.getKB();
      const existingMax = (kb.rules || []).reduce((max, r) => {
        const num = parseInt(String(r.id || "").replace(/[^0-9]/g, ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const nextId = `R${String(existingMax + 1).padStart(2, "0")}`;
      ruleIdInput.value = nextId;
      ruleIdInput.placeholder = nextId;
    }

    const cfInput = document.getElementById("formRuleCF");
    if (cfInput) cfInput.value = "0.85";

    this.populateRuleFormInputs();
    this.modalRuleForm.classList.add("active");
  }

  openEditRuleModal(ruleId) {
    const rule = this.kbManager.getRuleById(ruleId);
    if (!rule || !this.modalRuleForm) return;

    this.ruleFormModalTitle.textContent = `Chỉnh Sửa Luật [${rule.id}]`;
    
    const originalIdEl = document.getElementById("formRuleOriginalId");
    if (originalIdEl) originalIdEl.value = rule.id;

    const ruleIdInput = document.getElementById("formRuleId");
    if (ruleIdInput) ruleIdInput.value = rule.id;

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
    const originalIdEl = document.getElementById("formRuleOriginalId");
    const originalId = originalIdEl ? originalIdEl.value.trim() : "";

    const ruleIdInput = document.getElementById("formRuleId");
    const inputRuleId = ruleIdInput ? ruleIdInput.value.trim().toUpperCase() : "";

    const name = document.getElementById("formRuleName").value.trim();
    const conclusion = document.getElementById("formRuleConclusion").value.trim();
    const cfVal = parseFloat(document.getElementById("formRuleCF").value);
    const description = document.getElementById("formRuleDesc").value.trim();

    // 1. Kiểm tra tiền đề
    const checkedBoxes = document.querySelectorAll('input[name="premiseCheckbox"]:checked');
    const premises = Array.from(checkedBoxes).map(cb => cb.value.trim().toUpperCase());

    if (premises.length === 0) {
      ThongBao.canhBao("Vui lòng chọn ít nhất 1 triệu chứng tiền đề (NẾU / IF) cho luật!");
      return;
    }

    // 2. Kiểm tra bệnh kết luận
    if (!conclusion) {
      ThongBao.canhBao("Vui lòng chọn Bệnh kết luận (THÌ / THEN) cho luật!");
      return;
    }

    // 3. Kiểm tra định dạng CF (0.01 - 1.0)
    if (isNaN(cfVal) || cfVal <= 0 || cfVal > 1.0) {
      ThongBao.canhBao("Hệ số tin cậy (CF) không hợp lệ! Vui lòng nhập số trong khoảng từ 0.01 đến 1.0.");
      return;
    }

    const ruleData = {
      id: inputRuleId || undefined,
      name: name || (inputRuleId ? `Luật ${inputRuleId}` : undefined),
      premises,
      conclusion,
      cf: cfVal,
      description
    };

    try {
      if (originalId) {
        // Cập nhật luật hiện có
        this.kbManager.updateRule(originalId, ruleData);
        ThongBao.thanhCong(`Đã cập nhật luật [${inputRuleId || originalId}] thành công!`);
      } else {
        // Thêm luật mới
        const created = this.kbManager.addRule(ruleData);
        ThongBao.thanhCong(`Đã thêm luật sinh mới [${created.id}] vào cơ sở tri thức!`);
        this.pagination.rules.page = 1; // Tự động chuyển về trang 1 để thấy ngay bản ghi mới ở trên cùng
      }
      this.modalRuleForm.classList.remove("active");
      this.renderRulesTable();
    } catch (err) {
      ThongBao.thatBai(err.message, "Lỗi kiểm tra trùng lặp");
    }
  }
}

if (typeof window !== "undefined") {
  window.KBController = KBController;
}
