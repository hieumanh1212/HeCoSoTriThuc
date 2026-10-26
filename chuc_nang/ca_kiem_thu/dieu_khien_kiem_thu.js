/**
 * FEATURE MODULE: TEST CASES CONTROLLER (QUẢN LÝ BỘ CA BỆNH KIỂM THỬ LÂM SÀNG)
 * Cung cấp đầy đủ tính năng Thêm - Sửa - Xóa (CRUD) và Nạp ca bệnh vào màn hình chẩn đoán
 */

class TestCasesController {
  constructor({ kbManager, onLoadTestCase }) {
    this.kbManager = kbManager;
    this.onLoadTestCase = onLoadTestCase;

    // DOM Elements
    this.container = document.getElementById("testCasesContainer");
    this.modal = document.getElementById("modalTestCaseForm");
    this.modalTitle = document.getElementById("modalTcTitle");
    this.btnOpenAddModal = document.getElementById("btnOpenAddTestCaseModal");
    this.btnResetCases = document.getElementById("btnResetTestCases");
    this.btnSave = document.getElementById("btnSaveTestCase");

    // Form inputs
    this.inputTcId = document.getElementById("tcFormId");
    this.inputTcName = document.getElementById("tcFormName");
    this.inputTcPatient = document.getElementById("tcFormPatient");
    this.selectTcDisease = document.getElementById("tcFormDisease");
    this.inputTcNote = document.getElementById("tcFormNote");

    // Symptom picker elements
    this.inputSymptomSearch = document.getElementById("tcSymptomSearch");
    this.selectCategoryFilter = document.getElementById("tcCategoryFilter");
    this.listSymptoms = document.getElementById("tcSymptomsList");
    this.badgeSelectedCount = document.getElementById("tcSelectedCountBadge");

    // Internal state
    this.editingCaseId = null;
    this.tempSelectedSymptoms = {}; // { symptomId: cfNumber }
    this.currentSearchText = "";
    this.currentCategory = "all";
  }

  init() {
    this.bindEvents();
    this.renderTestCases();
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

  bindEvents() {
    // 1. Nút mở Modal Thêm mới
    if (this.btnOpenAddModal) {
      this.btnOpenAddModal.addEventListener("click", () => this.openAddModal());
    }

    // 2. Nút Khôi phục mặc định
    if (this.btnResetCases) {
      this.btnResetCases.addEventListener("click", () => this.confirmResetDefault());
    }

    // 3. Nút Lưu ca bệnh
    if (this.btnSave) {
      this.btnSave.addEventListener("click", () => this.saveTestCase());
    }

    // 4. Tìm kiếm & Lọc nhóm triệu chứng trong Modal
    if (this.inputSymptomSearch) {
      this.inputSymptomSearch.addEventListener("input", (e) => {
        this.currentSearchText = e.target.value.trim();
        this.renderSymptomPicker();
      });
    }

    if (this.selectCategoryFilter) {
      this.selectCategoryFilter.addEventListener("change", (e) => {
        this.currentCategory = e.target.value;
        this.renderSymptomPicker();
      });
    }

    // 5. Đóng Modal
    document.querySelectorAll('[data-close="modalTestCaseForm"]').forEach(btn => {
      btn.addEventListener("click", () => this.closeModal());
    });

    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    // 6. Lắng nghe cập nhật từ KB
    if (this.kbManager && typeof this.kbManager.onUpdate === "function") {
      this.kbManager.onUpdate(() => this.renderTestCases());
    }
  }

  closeModal() {
    if (this.modal) {
      this.modal.classList.remove("active");
    }
    this.editingCaseId = null;
    this.tempSelectedSymptoms = {};
  }

  renderTestCases() {
    if (!this.container) return;
    const kb = this.kbManager.getKB();
    const cases = this.kbManager.getTestCases ? this.kbManager.getTestCases() : (kb.testCases || []);

    if (cases.length === 0) {
      this.container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: 12px;">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 0.8rem;"></i>
          <p style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.4rem;">Chưa có ca bệnh kiểm thử nào trong hệ thống.</p>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.2rem;">Bạn có thể tạo ca mới hoặc khôi phục 5 ca mẫu lâm sàng mặc định.</p>
          <div style="display: flex; justify-content: center; gap: 0.75rem;">
            <button class="btn-secondary" onclick="document.getElementById('btnResetTestCases').click();">
              <i class="fa-solid fa-rotate-left"></i> Khôi phục 5 ca mặc định
            </button>
            <button class="btn-primary" onclick="document.getElementById('btnOpenAddTestCaseModal').click();">
              <i class="fa-solid fa-plus"></i> Tạo ca mới ngay
            </button>
          </div>
        </div>
      `;
      return;
    }

    this.container.innerHTML = cases.map(tc => {
      const expDis = (kb.diseases || []).find(d => d.id === tc.expectedDisease);
      const disName = expDis ? expDis.name : (tc.expectedDisease || "Chưa xác định");
      const isChaining = !!tc.isChainingBenchmark;

      return `
        <div class="test-case-card" data-card-id="${tc.id}" style="${isChaining ? 'border: 1.5px solid rgba(139, 92, 246, 0.4); box-shadow: 0 4px 16px rgba(139, 92, 246, 0.12);' : ''}">
          <div>
            <div class="tc-top-bar">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="tc-id" style="${isChaining ? 'background: #8b5cf6;' : ''}">${tc.id}</span>
                ${isChaining ? `
                  <span class="badge" style="background: rgba(139, 92, 246, 0.2); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.4); font-size: 0.7rem; font-weight: 700;">
                    <i class="fa-solid fa-network-wired"></i> Suy diễn Đa tầng Mắt xích
                  </span>
                ` : ''}
              </div>
              <div class="tc-actions">
                <button class="btn-tc-action btn-tc-edit" data-edit-id="${tc.id}" title="Chỉnh sửa ca bệnh này">
                  <i class="fa-solid fa-pen-to-square"></i> Sửa
                </button>
                <button class="btn-tc-action btn-tc-delete" data-delete-id="${tc.id}" title="Xóa ca bệnh này">
                  <i class="fa-solid fa-trash-can"></i> Xóa
                </button>
              </div>
            </div>

            <h3 class="tc-title" style="margin-top: 0.35rem;">${tc.name}</h3>
            <div class="tc-patient">
              <i class="fa-solid fa-user-injured" style="color: var(--color-primary);"></i>
              <span>${tc.patientInfo || "Bệnh nhân ngoại trú"}</span>
            </div>

            <div class="tc-symptoms-list">
              <div style="font-weight: 600; margin-bottom: 0.35rem; color: var(--text-secondary); font-size: 0.78rem;">
                Triệu chứng ghi nhận (${(tc.selectedSymptoms || []).length}):
              </div>
              <div>
                ${(tc.selectedSymptoms || []).map(s => {
                  const sym = (kb.symptoms || []).find(x => x.id === s.id);
                  return `<span class="tc-symptom-tag">[${s.id}] ${sym ? sym.name : s.id} <strong>(CF: ${s.cf})</strong></span>`;
                }).join("")}
              </div>
            </div>

            ${tc.chainingPath ? `
              <div style="font-size: 0.76rem; background: rgba(139, 92, 246, 0.08); border-left: 3px solid #8b5cf6; padding: 0.4rem 0.65rem; border-radius: 4px; margin-bottom: 0.75rem; font-family: monospace; color: #8b5cf6; line-height: 1.45;">
                <i class="fa-solid fa-route"></i> <strong>Lộ trình mắt xích:</strong><br>${tc.chainingPath}
              </div>
            ` : ''}

            <div class="tc-expected-disease">
              <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); display: block; margin-bottom: 0.15rem;">Bác sĩ chẩn đoán chuẩn:</span>
              <span style="color: #ef4444; font-weight: 700; font-size: 0.9rem;">
                <i class="fa-solid fa-circle-check"></i> [${tc.expectedDisease || 'N/A'}] ${disName}
              </span>
            </div>

            <div class="tc-note">
              "${tc.clinicalNote || "Không có ghi chú lâm sàng."}"
            </div>
          </div>

          <button class="btn-primary btn-load-testcase" data-tc-id="${tc.id}" style="width: 100%; justify-content: center; gap: 0.5rem; margin-top: 0.5rem; ${isChaining ? 'background: linear-gradient(135deg, #8b5cf6, #3b82f6); border-color: #8b5cf6;' : ''}">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Nạp ca bệnh này vào Chẩn đoán
          </button>
        </div>
      `;
    }).join("");

    // Gắn sự kiện cho các nút trên từng Card
    this.container.querySelectorAll(".btn-load-testcase").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tcId = e.currentTarget.getAttribute("data-tc-id");
        this.loadTestCase(tcId);
      });
    });

    this.container.querySelectorAll(".btn-tc-edit").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tcId = e.currentTarget.getAttribute("data-edit-id");
        this.openEditModal(tcId);
      });
    });

    this.container.querySelectorAll(".btn-tc-delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tcId = e.currentTarget.getAttribute("data-delete-id");
        this.deleteTestCase(tcId);
      });
    });
  }

  populateDiseaseSelect(selectedDiseaseId = "") {
    if (!this.selectTcDisease) return;
    const diseases = this.kbManager.getKB().diseases || [];
    this.selectTcDisease.innerHTML = `
      <option value="">-- Chọn bệnh chẩn đoán chuẩn --</option>
      ${diseases.map(d => `
        <option value="${d.id}" ${d.id === selectedDiseaseId ? "selected" : ""}>
          [${d.id}] ${d.name} (${d.category || "Bệnh truyền nhiễm"})
        </option>
      `).join("")}
    `;
  }

  populateCategorySelect() {
    if (!this.selectCategoryFilter) return;
    const groups = this.kbManager.getKB().symptomGroups || [];
    this.selectCategoryFilter.innerHTML = `
      <option value="all">Tất cả nhóm</option>
      ${groups.map(g => `
        <option value="${g.id}">${g.name}</option>
      `).join("")}
    `;
    this.selectCategoryFilter.value = this.currentCategory;
  }

  openAddModal() {
    this.editingCaseId = null;
    if (this.modalTitle) this.modalTitle.textContent = "Thêm Ca Bệnh Kiểm Thử Mới";

    // Tự sinh mã ca kế tiếp
    const cases = this.kbManager.getTestCases ? this.kbManager.getTestCases() : [];
    const maxNum = cases.reduce((max, c) => {
      const num = parseInt(String(c.id || "").replace(/[^0-9]/g, ""), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const nextId = `TC${String(maxNum + 1).padStart(2, "0")}`;

    if (this.inputTcId) {
      this.inputTcId.value = nextId;
      this.inputTcId.readOnly = false;
    }
    if (this.inputTcName) this.inputTcName.value = "";
    if (this.inputTcPatient) this.inputTcPatient.value = "";
    if (this.inputTcNote) this.inputTcNote.value = "";

    this.tempSelectedSymptoms = {};
    this.currentSearchText = "";
    this.currentCategory = "all";
    if (this.inputSymptomSearch) this.inputSymptomSearch.value = "";

    this.populateDiseaseSelect("");
    this.populateCategorySelect();
    this.renderSymptomPicker();

    if (this.modal) this.modal.classList.add("active");
  }

  openEditModal(tcId) {
    const tc = this.kbManager.getTestCaseById ? this.kbManager.getTestCaseById(tcId) : null;
    if (!tc) {
      if (typeof ThongBao !== "undefined" && ThongBao.thatBai) {
        ThongBao.thatBai(`Không tìm thấy ca kiểm thử [${tcId}]!`);
      }
      return;
    }

    this.editingCaseId = tcId;
    if (this.modalTitle) this.modalTitle.textContent = `Chỉnh Sửa Ca Kiểm Thử [${tcId}]`;

    if (this.inputTcId) {
      this.inputTcId.value = tc.id;
      this.inputTcId.readOnly = true;
    }
    if (this.inputTcName) this.inputTcName.value = tc.name || "";
    if (this.inputTcPatient) this.inputTcPatient.value = tc.patientInfo || "";
    if (this.inputTcNote) this.inputTcNote.value = tc.clinicalNote || "";

    // Nạp danh sách triệu chứng đang chọn
    this.tempSelectedSymptoms = {};
    (tc.selectedSymptoms || []).forEach(s => {
      this.tempSelectedSymptoms[s.id] = s.cf !== undefined ? s.cf : 1.0;
    });

    this.currentSearchText = "";
    this.currentCategory = "all";
    if (this.inputSymptomSearch) this.inputSymptomSearch.value = "";

    this.populateDiseaseSelect(tc.expectedDisease);
    this.populateCategorySelect();
    this.renderSymptomPicker();

    if (this.modal) this.modal.classList.add("active");
  }

  renderSymptomPicker() {
    if (!this.listSymptoms) return;
    const kb = this.kbManager.getKB();
    const symptoms = kb.symptoms || [];

    const searchNorm = this._stripVN(this.currentSearchText);

    const filtered = symptoms.filter(s => {
      if (this.currentCategory !== "all" && s.groupId !== this.currentCategory) {
        return false;
      }
      if (searchNorm) {
        const idNorm = (s.id || "").toLowerCase();
        const nameNorm = this._stripVN(s.name || "");
        if (!idNorm.includes(searchNorm) && !nameNorm.includes(searchNorm)) {
          return false;
        }
      }
      return true;
    });

    // Cập nhật badge số lượng đã chọn
    const count = Object.keys(this.tempSelectedSymptoms).length;
    if (this.badgeSelectedCount) {
      this.badgeSelectedCount.textContent = `Đã chọn: ${count}`;
      if (count > 0) {
        this.badgeSelectedCount.className = "badge badge-medium";
      } else {
        this.badgeSelectedCount.className = "badge badge-low";
      }
    }

    if (filtered.length === 0) {
      this.listSymptoms.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.82rem;">
          Không tìm thấy triệu chứng phù hợp với từ khóa "${this.currentSearchText}".
        </div>
      `;
      return;
    }

    this.listSymptoms.innerHTML = filtered.map(s => {
      const isSelected = this.tempSelectedSymptoms.hasOwnProperty(s.id);
      const currentCF = isSelected ? this.tempSelectedSymptoms[s.id] : 1.0;

      return `
        <div class="symptom-picker-row ${isSelected ? 'selected' : ''}" data-symptom-id="${s.id}">
          <div class="symptom-picker-row-info">
            <input type="checkbox" class="tc-sym-checkbox" ${isSelected ? 'checked' : ''} style="cursor: pointer;" />
            <div>
              <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--color-cyan); font-size: 0.75rem;">[${s.id}]</span>
              <span style="font-weight: 500;">${s.name}</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.35rem;" onclick="event.stopPropagation();">
            <span style="font-size: 0.72rem; color: var(--text-muted);">CF:</span>
            <select class="symptom-picker-cf-select tc-sym-cf" data-symptom-id="${s.id}" ${!isSelected ? 'disabled' : ''}>
              <option value="0.4" ${currentCF === 0.4 ? 'selected' : ''}>0.4 (Ít)</option>
              <option value="0.6" ${currentCF === 0.6 ? 'selected' : ''}>0.6 (Có thể)</option>
              <option value="0.7" ${currentCF === 0.7 ? 'selected' : ''}>0.7 (Rõ rệt)</option>
              <option value="0.8" ${currentCF === 0.8 ? 'selected' : ''}>0.8 (Nhiều)</option>
              <option value="0.9" ${currentCF === 0.9 ? 'selected' : ''}>0.9 (Rất cao)</option>
              <option value="1.0" ${currentCF === 1.0 ? 'selected' : ''}>1.0 (Chắc chắn)</option>
            </select>
          </div>
        </div>
      `;
    }).join("");

    // Gắn sự kiện click dòng / checkbox để chọn triệu chứng
    this.listSymptoms.querySelectorAll(".symptom-picker-row").forEach(row => {
      row.addEventListener("click", (e) => {
        // Tránh double toggle nếu click trực tiếp vào checkbox
        if (e.target.tagName.toLowerCase() === "input" || e.target.tagName.toLowerCase() === "select") {
          return;
        }
        const symId = row.getAttribute("data-symptom-id");
        this.toggleSymptomSelection(symId);
      });

      const chk = row.querySelector(".tc-sym-checkbox");
      if (chk) {
        chk.addEventListener("change", () => {
          const symId = row.getAttribute("data-symptom-id");
          this.toggleSymptomSelection(symId);
        });
      }

      const cfSelect = row.querySelector(".tc-sym-cf");
      if (cfSelect) {
        cfSelect.addEventListener("change", (e) => {
          const symId = cfSelect.getAttribute("data-symptom-id");
          const cfVal = parseFloat(e.target.value) || 1.0;
          this.tempSelectedSymptoms[symId] = cfVal;
        });
      }
    });
  }

  toggleSymptomSelection(symId) {
    if (this.tempSelectedSymptoms.hasOwnProperty(symId)) {
      delete this.tempSelectedSymptoms[symId];
    } else {
      this.tempSelectedSymptoms[symId] = 1.0;
    }
    this.renderSymptomPicker();
  }

  saveTestCase() {
    const idVal = this.inputTcId ? this.inputTcId.value.trim() : "";
    const nameVal = this.inputTcName ? this.inputTcName.value.trim() : "";
    const patientVal = this.inputTcPatient ? this.inputTcPatient.value.trim() : "";
    const diseaseVal = this.selectTcDisease ? this.selectTcDisease.value : "";
    const noteVal = this.inputTcNote ? this.inputTcNote.value.trim() : "";

    // Kiểm tra tính hợp lệ
    if (!nameVal) {
      if (typeof ThongBao !== "undefined" && ThongBao.canhBao) {
        ThongBao.canhBao("Vui lòng nhập tên ca bệnh kiểm thử!");
      } else {
        alert("Vui lòng nhập tên ca bệnh kiểm thử!");
      }
      if (this.inputTcName) this.inputTcName.focus();
      return;
    }

    if (!diseaseVal) {
      if (typeof ThongBao !== "undefined" && ThongBao.canhBao) {
        ThongBao.canhBao("Vui lòng chọn bệnh chẩn đoán chuẩn của bác sĩ lâm sàng!");
      } else {
        alert("Vui lòng chọn bệnh chẩn đoán chuẩn của bác sĩ lâm sàng!");
      }
      if (this.selectTcDisease) this.selectTcDisease.focus();
      return;
    }

    const symptomKeys = Object.keys(this.tempSelectedSymptoms);
    if (symptomKeys.length === 0) {
      if (typeof ThongBao !== "undefined" && ThongBao.canhBao) {
        ThongBao.canhBao("Vui lòng chọn ít nhất 1 triệu chứng lâm sàng cho ca kiểm thử!");
      } else {
        alert("Vui lòng chọn ít nhất 1 triệu chứng lâm sàng cho ca kiểm thử!");
      }
      return;
    }

    const selectedSymptomsList = symptomKeys.map(sId => ({
      id: sId,
      cf: parseFloat(this.tempSelectedSymptoms[sId]) || 1.0
    }));

    const tcData = {
      id: idVal,
      name: nameVal,
      patientInfo: patientVal || "Bệnh nhân ngoại trú",
      expectedDisease: diseaseVal,
      clinicalNote: noteVal || "Ca bệnh kiểm chứng do chuyên gia thiết lập.",
      selectedSymptoms: selectedSymptomsList
    };

    try {
      if (this.editingCaseId) {
        this.kbManager.updateTestCase(this.editingCaseId, tcData);
        if (typeof ThongBao !== "undefined" && ThongBao.thanhCong) {
          ThongBao.thanhCong(`Đã cập nhật thành công ca kiểm thử [${this.editingCaseId}]!`, "Lưu thành công");
        }
      } else {
        const created = this.kbManager.addTestCase(tcData);
        if (typeof ThongBao !== "undefined" && ThongBao.thanhCong) {
          ThongBao.thanhCong(`Đã thêm mới ca kiểm thử [${created.id}] thành công!`, "Thêm mới");
        }
      }

      this.closeModal();
      this.renderTestCases();
    } catch (err) {
      if (typeof ThongBao !== "undefined" && ThongBao.thatBai) {
        ThongBao.thatBai(`Lỗi: ${err.message}`, "Không thể lưu");
      } else {
        alert(err.message);
      }
    }
  }

  async deleteTestCase(tcId) {
    let confirmed = false;
    if (window.XacNhan && typeof window.XacNhan.xoa === "function") {
      confirmed = await window.XacNhan.xoa(
        `Ca kiểm thử [${tcId}]`,
        "Ca bệnh lâm sàng này sẽ bị xóa khỏi danh sách ca kiểm thử và không thể hoàn tác."
      );
    } else {
      confirmed = confirm(`Bạn có chắc chắn muốn xóa ca kiểm thử [${tcId}] khỏi hệ thống không? Hành động này không thể hoàn tác.`);
    }
    if (!confirmed) return;

    try {
      this.kbManager.deleteTestCase(tcId);
      if (window.ThongBao?.thanhCong) {
        window.ThongBao.thanhCong(`Đã xóa ca kiểm thử [${tcId}] thành công!`);
      }
      this.renderTestCases();
    } catch (err) {
      if (window.ThongBao?.thatBai) {
        window.ThongBao.thatBai(`Lỗi xóa ca kiểm thử: ${err.message}`);
      } else {
        alert(err.message);
      }
    }
  }

  async confirmResetDefault() {
    let confirmed = false;
    if (window.XacNhan && typeof window.XacNhan.khoiPhuc === "function") {
      confirmed = await window.XacNhan.khoiPhuc(
        "Danh sách ca bệnh kiểm thử",
        "Danh sách sẽ được thiết lập lại về 5 ca lâm sàng chuẩn mặc định (TC01 - TC05)."
      );
    } else {
      confirmed = confirm("Bạn có chắc chắn muốn khôi phục danh sách ca kiểm thử về 5 ca lâm sàng chuẩn mặc định (TC01 - TC05) không?");
    }
    if (!confirmed) return;

    try {
      this.kbManager.resetTestCasesToDefault();
      if (window.ThongBao?.thanhCong) {
        window.ThongBao.thanhCong("Đã khôi phục toàn bộ ca bệnh kiểm thử về mặc định!");
      }
      this.renderTestCases();
    } catch (err) {
      if (window.ThongBao?.thatBai) {
        window.ThongBao.thatBai(`Lỗi khôi phục: ${err.message}`);
      }
    }
  }

  loadTestCase(tcId) {
    const tc = this.kbManager.getTestCaseById ? this.kbManager.getTestCaseById(tcId) : null;
    if (!tc) return;

    const symptomsMap = {};
    (tc.selectedSymptoms || []).forEach(s => {
      symptomsMap[s.id] = s.cf;
    });

    if (this.onLoadTestCase) {
      this.onLoadTestCase(symptomsMap);
    }
  }
}

if (typeof window !== "undefined") {
  window.TestCasesController = TestCasesController;
}
