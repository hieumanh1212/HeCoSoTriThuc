/**
 * FEATURE MODULE: KNOWLEDGE BASE MODEL & STORAGE MANAGER
 */

class KnowledgeBaseManager {
  constructor(dbEngine = null) {
    this.STORAGE_KEY = "HE_CO_SO_TRI_THUC_KB_DATA";
    this.db = dbEngine;
    this.kb = this.loadFromStorage();
    this.listeners = [];

    if (this.db && this.db.isReady) {
      this.syncFromDatabase();
    }
  }

  setDatabaseEngine(dbEngine) {
    this.db = dbEngine;
    this.syncFromDatabase();
  }

  sanitizeKB(rawKB) {
    if (!rawKB) return rawKB;
    const kb = { ...rawKB };
    if (Array.isArray(kb.rules)) {
      const uniqueRulesMap = new Map();
      kb.rules.forEach(r => {
        if (r && r.id) {
          const cleanPremises = Array.from(new Set((r.premises || []).map(p => String(p).trim()).filter(Boolean)));
          if (!uniqueRulesMap.has(r.id)) {
            uniqueRulesMap.set(r.id, {
              ...r,
              premises: cleanPremises
            });
          }
        }
      });
      kb.rules = Array.from(uniqueRulesMap.values());
    }
    if (Array.isArray(kb.diseases)) {
      const uniqueDiseasesMap = new Map();
      kb.diseases.forEach(d => {
        if (d && d.id && !uniqueDiseasesMap.has(d.id)) {
          uniqueDiseasesMap.set(d.id, d);
        }
      });
      kb.diseases = Array.from(uniqueDiseasesMap.values());
    }
    if (Array.isArray(kb.symptoms)) {
      const uniqueSymptomsMap = new Map();
      kb.symptoms.forEach(s => {
        if (s && s.id && !uniqueSymptomsMap.has(s.id)) {
          uniqueSymptomsMap.set(s.id, s);
        }
      });
      kb.symptoms = Array.from(uniqueSymptomsMap.values());
    }
    return kb;
  }

  async syncFromDatabase() {
    if (!this.db) return;
    try {
      const dbKB = await this.db.toKnowledgeBaseObject();
      if (dbKB && dbKB.rules && dbKB.rules.length > 0) {
        const mergedKB = this._mergeWithDefaults(dbKB, window.DEFAULT_KNOWLEDGE_BASE || {});
        const currentTestCases = this.getTestCases();
        this.kb = this.sanitizeKB(mergedKB);
        if (currentTestCases && currentTestCases.length > 0) {
          this.kb.testCases = currentTestCases;
        }
        this.saveToStorage();
        this.notifyListeners();
      }
    } catch (e) {
      console.warn("Lỗi sync từ Database, sử dụng cache:", e);
    }
  }

  _mergeWithDefaults(parsed, def) {
    if (!parsed || !def || !Array.isArray(parsed.rules)) return parsed;

    const existingRuleIds = new Set(parsed.rules.map(r => r.id));
    (def.rules || []).forEach(r => {
      if (!existingRuleIds.has(r.id)) parsed.rules.push(r);
    });

    const existingSymIds = new Set((parsed.symptoms || []).map(s => s.id));
    (def.symptoms || []).forEach(s => {
      if (!existingSymIds.has(s.id)) (parsed.symptoms = parsed.symptoms || []).push(s);
    });

    const existingGrpIds = new Set((parsed.symptomGroups || []).map(g => g.id));
    (def.symptomGroups || []).forEach(g => {
      if (!existingGrpIds.has(g.id)) (parsed.symptomGroups = parsed.symptomGroups || []).push(g);
    });

    return parsed;
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.testCases || !Array.isArray(parsed.testCases) || parsed.testCases.length === 0) {
          const customTC = localStorage.getItem("MED_EXPERT_CUSTOM_TESTCASES");
          if (customTC) {
            try { parsed.testCases = JSON.parse(customTC); } catch (e) {}
          }
          if (!parsed.testCases || parsed.testCases.length === 0) {
            const defKB = window.DEFAULT_KNOWLEDGE_BASE || {};
            parsed.testCases = JSON.parse(JSON.stringify(defKB.testCases || []));
          }
        }
        const def = window.DEFAULT_KNOWLEDGE_BASE || {};
        const merged = this._mergeWithDefaults(parsed, def);
        const cleanKB = this.sanitizeKB(merged);
        if (parsed.testCases) {
          cleanKB.testCases = parsed.testCases;
        }
        // Tự động làm sạch localStorage nếu trước đó bị lưu trùng lặp
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanKB));
        } catch (err) {}
        return cleanKB;
      }
    } catch (e) {
      console.warn("Lỗi đọc LocalStorage, sử dụng dữ liệu mặc định:", e);
    }
    const def = JSON.parse(JSON.stringify(window.DEFAULT_KNOWLEDGE_BASE || {}));
    const customTC = localStorage.getItem("MED_EXPERT_CUSTOM_TESTCASES");
    if (customTC) {
      try { def.testCases = JSON.parse(customTC); } catch (e) {}
    }
    return this.sanitizeKB(def);
  }

  async saveToStorage() {
    try {
      this.kb = this.sanitizeKB(this.kb);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.kb));
      if (this.kb && this.kb.testCases) {
        localStorage.setItem("MED_EXPERT_CUSTOM_TESTCASES", JSON.stringify(this.kb.testCases));
      }
      if (this.db) {
        await this.db.importFromKBObject(this.kb, "Cập nhật qua KnowledgeBaseManager");
      }
      this.notifyListeners();
    } catch (e) {
      console.error("Lỗi lưu trữ CSDL:", e);
    }
  }

  onUpdate(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
    }
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.kb));
  }

  getKB() {
    this.kb = this.sanitizeKB(this.kb);
    return this.kb;
  }

  resetToDefault() {
    this.kb = this.sanitizeKB(JSON.parse(JSON.stringify(window.DEFAULT_KNOWLEDGE_BASE || {})));
    localStorage.removeItem("MED_EXPERT_CUSTOM_TESTCASES");
    this.saveToStorage();
    return this.kb;
  }

  // --- RULES CRUD ---
  getRules() {
    return this.kb.rules || [];
  }

  getRuleById(id) {
    return (this.kb.rules || []).find(r => r.id === id);
  }

  addRule(ruleData) {
    if (!ruleData.id || String(ruleData.id).trim() === "") {
      const existingMax = (this.kb.rules || []).reduce((max, r) => {
        const num = parseInt(String(r.id || "").replace(/[^0-9]/g, ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      ruleData.id = `R${String(existingMax + 1).padStart(2, "0")}`;
    }

    const inputId = String(ruleData.id || "").trim();
    if (!inputId) {
      throw new Error("Mã luật không được để trống!");
    }

    // 1. Kiểm tra trùng Mã luật
    const existingRuleWithId = (this.kb.rules || []).find(r => (r.id || "").toUpperCase().trim() === inputId.toUpperCase());
    if (existingRuleWithId) {
      throw new Error(`Mã luật [${inputId}] đã tồn tại trong CSDL (${existingRuleWithId.name || existingRuleWithId.id})! Vui lòng chọn mã khác.`);
    }

    // 2. Kiểm tra định dạng CF (0.01 - 1.0)
    const cfVal = Number(ruleData.cf);
    if (isNaN(cfVal) || cfVal <= 0 || cfVal > 1.0) {
      throw new Error(`Hệ số tin cậy CF [${ruleData.cf}] không hợp lệ! Yêu cầu từ 0.01 đến 1.0.`);
    }

    // 3. Kiểm tra triệu chứng tiền đề
    const premises = (ruleData.premises || []).map(p => String(p).toUpperCase().trim()).filter(Boolean);
    if (premises.length === 0) {
      throw new Error("Phải chọn ít nhất 1 triệu chứng tiền đề (IF) cho luật!");
    }

    // 4. Kiểm tra bệnh kết luận
    const conclusion = String(ruleData.conclusion || "").toUpperCase().trim();
    if (!conclusion) {
      throw new Error("Phải chọn bệnh kết luận (THEN) cho luật!");
    }

    // 5. Kiểm tra trùng lặp Logic: Tiền đề (IF) & Kết luận (THEN)
    const sortedNewPremises = [...premises].sort().join(",");
    const duplicateLogic = (this.kb.rules || []).find(r => {
      const sortedP = (r.premises || []).map(p => String(p).toUpperCase().trim()).filter(Boolean).sort().join(",");
      const conc = String(r.conclusion || "").toUpperCase().trim();
      return sortedP === sortedNewPremises && conc === conclusion;
    });

    if (duplicateLogic) {
      throw new Error(`Trùng lặp tiền đề & kết luận với luật [${duplicateLogic.id}] (${duplicateLogic.name || duplicateLogic.id})! Đã tồn tại luật có cùng IF: [${premises.join(", ")}] -> THEN: [${conclusion}].`);
    }

    const newRule = {
      id: inputId,
      name: ruleData.name || `Luật ${inputId}`,
      premises: premises,
      conclusion: conclusion,
      cf: Number(cfVal.toFixed(4)),
      description: ruleData.description || ""
    };

    this.kb.rules.push(newRule);
    if (this.db) {
      this.db.put("tap_luat", newRule, true);
    }

    this.saveToStorage();
    return newRule;
  }

  updateRule(id, ruleData) {
    const idx = (this.kb.rules || []).findIndex(r => (r.id || "").toUpperCase().trim() === String(id).toUpperCase().trim());
    if (idx === -1) throw new Error(`Không tìm thấy luật có mã [${id}]`);

    const currentRule = this.kb.rules[idx];
    const targetId = String(ruleData.id || id).trim();

    // 1. Kiểm tra trùng mã nếu đổi mã
    if (targetId.toUpperCase() !== String(id).toUpperCase().trim()) {
      const existingRuleWithId = (this.kb.rules || []).find(r => (r.id || "").toUpperCase().trim() === targetId.toUpperCase());
      if (existingRuleWithId) {
        throw new Error(`Mã luật [${targetId}] đã tồn tại ở luật khác (${existingRuleWithId.name || existingRuleWithId.id})!`);
      }
    }

    // 2. Kiểm tra định dạng CF (0.01 - 1.0)
    const cfVal = Number(ruleData.cf);
    if (isNaN(cfVal) || cfVal <= 0 || cfVal > 1.0) {
      throw new Error(`Hệ số tin cậy CF [${ruleData.cf}] không hợp lệ! Yêu cầu từ 0.01 đến 1.0.`);
    }

    // 3. Kiểm tra triệu chứng tiền đề
    const premises = (ruleData.premises || []).map(p => String(p).toUpperCase().trim()).filter(Boolean);
    if (premises.length === 0) {
      throw new Error("Phải chọn ít nhất 1 triệu chứng tiền đề (IF) cho luật!");
    }

    // 4. Kiểm tra bệnh kết luận
    const conclusion = String(ruleData.conclusion || "").toUpperCase().trim();
    if (!conclusion) {
      throw new Error("Phải chọn bệnh kết luận (THEN) cho luật!");
    }

    // 5. Kiểm tra trùng lặp Logic: Tiền đề (IF) & Kết luận (THEN) với các luật khác
    const sortedNewPremises = [...premises].sort().join(",");
    const duplicateLogic = (this.kb.rules || []).find(r => {
      if ((r.id || "").toUpperCase().trim() === String(id).toUpperCase().trim()) return false;
      const sortedP = (r.premises || []).map(p => String(p).toUpperCase().trim()).filter(Boolean).sort().join(",");
      const conc = String(r.conclusion || "").toUpperCase().trim();
      return sortedP === sortedNewPremises && conc === conclusion;
    });

    if (duplicateLogic) {
      throw new Error(`Trùng lặp tiền đề & kết luận với luật [${duplicateLogic.id}] (${duplicateLogic.name || duplicateLogic.id})! Đã tồn tại luật có cùng IF: [${premises.join(", ")}] -> THEN: [${conclusion}].`);
    }

    this.kb.rules[idx] = {
      ...currentRule,
      id: targetId,
      name: ruleData.name || currentRule.name,
      premises: premises,
      conclusion: conclusion,
      cf: Number(cfVal.toFixed(4)),
      description: ruleData.description !== undefined ? ruleData.description : currentRule.description
    };

    if (this.db) {
      this.db.put("tap_luat", this.kb.rules[idx], true);
    }

    this.saveToStorage();
    return this.kb.rules[idx];
  }

  deleteRule(id) {
    this.kb.rules = (this.kb.rules || []).filter(r => r.id !== id);
    if (this.db) {
      this.db.delete("tap_luat", id, true);
    }
    this.saveToStorage();
  }

  // --- SYMPTOMS CRUD ---
  getSymptoms() {
    return this.kb.symptoms || [];
  }

  addSymptom(symptomData) {
    if (!symptomData.id) {
      const maxNum = (this.kb.symptoms || []).reduce((max, s) => {
        const num = parseInt(s.id.replace("S", ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      symptomData.id = `S${String(maxNum + 1).padStart(2, "0")}`;
    }

    this.kb.symptoms.push({
      id: symptomData.id,
      name: symptomData.name,
      groupId: symptomData.groupId || "group_fever",
      question: symptomData.question || `Bạn có bị ${symptomData.name} không?`
    });

    this.saveToStorage();
    return symptomData;
  }

  // --- DISEASES CRUD ---
  getDiseases() {
    return this.kb.diseases || [];
  }

  addDisease(diseaseData) {
    if (!diseaseData.id) {
      const maxNum = (this.kb.diseases || []).reduce((max, d) => {
        const num = parseInt(d.id.replace("D", ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      diseaseData.id = `D${String(maxNum + 1).padStart(2, "0")}`;
    }

    this.kb.diseases.push({
      id: diseaseData.id,
      name: diseaseData.name,
      severity: diseaseData.severity || "Trung bình",
      color: diseaseData.color || "#3b82f6",
      description: diseaseData.description || "",
      warningSigns: diseaseData.warningSigns || "",
      recommendation: diseaseData.recommendation || "",
      reference: diseaseData.reference || "Tài liệu Y khoa"
    });

    this.saveToStorage();
    return diseaseData;
  }

  // --- TEST CASES CRUD ---
  getTestCases() {
    if (this.kb && Array.isArray(this.kb.testCases) && this.kb.testCases.length > 0) {
      return this.kb.testCases;
    }
    try {
      const backup = localStorage.getItem("MED_EXPERT_CUSTOM_TESTCASES");
      if (backup) {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (this.kb) this.kb.testCases = parsed;
          return parsed;
        }
      }
    } catch (e) {}
    const defaultCases = (window.DEFAULT_KNOWLEDGE_BASE && window.DEFAULT_KNOWLEDGE_BASE.testCases)
      ? window.DEFAULT_KNOWLEDGE_BASE.testCases
      : [];
    if (this.kb) this.kb.testCases = JSON.parse(JSON.stringify(defaultCases));
    return this.kb ? (this.kb.testCases || []) : [];
  }

  getTestCaseById(id) {
    return this.getTestCases().find(c => c.id === id) || null;
  }

  saveTestCases() {
    try {
      localStorage.setItem("MED_EXPERT_CUSTOM_TESTCASES", JSON.stringify(this.kb.testCases || []));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.kb));
      this.notifyListeners();
    } catch (e) {
      console.error("Lỗi lưu trữ ca kiểm thử:", e);
    }
  }

  addTestCase(tcData) {
    if (!this.kb.testCases) this.kb.testCases = [];

    let tcId = (tcData.id || "").trim();
    if (!tcId) {
      const existingMax = this.kb.testCases.reduce((max, c) => {
        const num = parseInt(String(c.id || "").replace(/[^0-9]/g, ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      tcId = `TC${String(existingMax + 1).padStart(2, "0")}`;
    }

    if (this.kb.testCases.some(c => c.id.toUpperCase() === tcId.toUpperCase())) {
      throw new Error(`Mã ca kiểm thử "${tcId}" đã tồn tại! Vui lòng chọn mã khác.`);
    }

    if (!tcData.name || !tcData.name.trim()) {
      throw new Error("Tên ca bệnh kiểm thử không được để trống!");
    }

    if (!tcData.selectedSymptoms || tcData.selectedSymptoms.length === 0) {
      throw new Error("Vui lòng chọn ít nhất 1 triệu chứng lâm sàng cho ca kiểm thử!");
    }

    const newCase = {
      id: tcId,
      name: tcData.name.trim(),
      patientInfo: (tcData.patientInfo || "").trim() || "Bệnh nhân ngoại trú",
      selectedSymptoms: tcData.selectedSymptoms,
      expectedDisease: tcData.expectedDisease || "",
      clinicalNote: (tcData.clinicalNote || "").trim() || "Ca bệnh kiểm chứng do chuyên gia thiết lập."
    };

    this.kb.testCases.push(newCase);
    this.saveTestCases();
    return newCase;
  }

  updateTestCase(id, tcData) {
    if (!this.kb.testCases) this.kb.testCases = [];
    const index = this.kb.testCases.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy ca kiểm thử có mã "${id}" để cập nhật!`);
    }

    if (!tcData.name || !tcData.name.trim()) {
      throw new Error("Tên ca bệnh kiểm thử không được để trống!");
    }

    if (!tcData.selectedSymptoms || tcData.selectedSymptoms.length === 0) {
      throw new Error("Vui lòng chọn ít nhất 1 triệu chứng lâm sàng cho ca kiểm thử!");
    }

    this.kb.testCases[index] = {
      id: id,
      name: tcData.name.trim(),
      patientInfo: (tcData.patientInfo || "").trim() || "Bệnh nhân ngoại trú",
      selectedSymptoms: tcData.selectedSymptoms,
      expectedDisease: tcData.expectedDisease || "",
      clinicalNote: (tcData.clinicalNote || "").trim() || "Ca bệnh kiểm chứng do chuyên gia thiết lập."
    };

    this.saveTestCases();
    return this.kb.testCases[index];
  }

  deleteTestCase(id) {
    if (!this.kb.testCases) this.kb.testCases = [];
    const index = this.kb.testCases.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy ca kiểm thử có mã "${id}" để xóa!`);
    }

    const deleted = this.kb.testCases.splice(index, 1)[0];
    this.saveTestCases();
    return deleted;
  }

  resetTestCasesToDefault() {
    const defaultCases = (window.DEFAULT_KNOWLEDGE_BASE && window.DEFAULT_KNOWLEDGE_BASE.testCases)
      ? window.DEFAULT_KNOWLEDGE_BASE.testCases
      : [];
    this.kb.testCases = JSON.parse(JSON.stringify(defaultCases));
    this.saveTestCases();
    return this.kb.testCases;
  }

  // ============================================================================
  // XUẤT / NHẬP EXCEL (.XLSX) BẰNG THƯ VIỆN SHEETJS
  // ============================================================================

  exportExcel(scope = "all") {
    if (typeof XLSX === "undefined") {
      throw new Error("Thư viện SheetJS chưa được tải. Vui lòng kiểm tra kết nối mạng!");
    }

    const kb = this.getKB();
    const wb = XLSX.utils.book_new();

    // 1. Sheet TẬP LUẬT SINH
    const rulesRows = (kb.rules || []).map(r => {
      const dis = (kb.diseases || []).find(d => d.id === r.conclusion);
      const premsNames = (r.premises || []).map(pId => {
        const s = (kb.symptoms || []).find(sym => sym.id === pId);
        return s ? s.name : pId;
      }).join("; ");

      return {
        "Mã Luật": r.id,
        "Tên Luật Sinh": r.name || `Luật ${r.id}`,
        "Mã Bệnh Kết Luận": r.conclusion,
        "Tên Bệnh Kết Luận": dis ? dis.name : r.conclusion,
        "Hệ Số Tin Cậy (CF)": Number(r.cf) || 0.8,
        "Danh Sách Mã Triệu Chứng (Cách nhau dấu phẩy)": (r.premises || []).join(", "),
        "Tên Triệu Chứng Tiền Đề": premsNames,
        "Mô Tả Luật": r.description || ""
      };
    });
    const wsRules = XLSX.utils.json_to_sheet(rulesRows);
    wsRules["!cols"] = [
      { wch: 10 }, { wch: 45 }, { wch: 18 }, { wch: 30 },
      { wch: 18 }, { wch: 40 }, { wch: 60 }, { wch: 50 }
    ];
    if (scope === "all" || scope === "rules") {
      XLSX.utils.book_append_sheet(wb, wsRules, "TAP_LUAT");
    }

    // 2. Sheet DANH MỤC TRIỆU CHỨNG
    const symsRows = (kb.symptoms || []).map(s => {
      const grp = (kb.symptomGroups || []).find(g => g.id === s.groupId);
      return {
        "Mã Triệu Chứng": s.id,
        "Mã Nhóm": s.groupId || "G01",
        "Tên Nhóm": grp ? grp.name : s.groupId,
        "Tên Triệu Chứng": s.name,
        "Câu Hỏi Truy Vấn (WHY)": s.question || "",
        "Mức Độ Cảnh Báo": s.severity || "Bình thường"
      };
    });
    const wsSyms = XLSX.utils.json_to_sheet(symsRows);
    wsSyms["!cols"] = [
      { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 45 }, { wch: 65 }, { wch: 18 }
    ];
    if (scope === "all" || scope === "symptoms") {
      XLSX.utils.book_append_sheet(wb, wsSyms, "TRIEU_CHUNG");
    }

    // 3. Sheet DANH MỤC BỆNH HỌC
    const disRows = (kb.diseases || []).map(d => ({
      "Mã Bệnh": d.id,
      "Tên Bệnh Học": d.name,
      "Mức Độ Nguy Hiểm": d.severity || "",
      "Hướng Xử Trí & Phác Đồ": d.treatment || d.recommendation || "",
      "Dấu Hiệu Cảnh Báo Nguy Hiểm": d.warningSigns || ""
    }));
    const wsDis = XLSX.utils.json_to_sheet(disRows);
    wsDis["!cols"] = [
      { wch: 12 }, { wch: 35 }, { wch: 30 }, { wch: 35 },
      { wch: 30 }, { wch: 70 }, { wch: 70 }
    ];
    if (scope === "all" || scope === "diseases") {
      XLSX.utils.book_append_sheet(wb, wsDis, "DANH_MUC_BENH");
    }

    // 4. Sheet NHÓM TRIỆU CHỨNG
    const grpRows = (kb.symptomGroups || []).map(g => ({
      "Mã Nhóm": g.id,
      "Tên Nhóm Triệu Chứng": g.name,
      "Biểu Tượng FontAwesome": g.icon || "fa-notes-medical",
      "Mô Tả Phân Loại": g.description || ""
    }));
    const wsGrp = XLSX.utils.json_to_sheet(grpRows);
    wsGrp["!cols"] = [{ wch: 12 }, { wch: 35 }, { wch: 25 }, { wch: 50 }];
    if (scope === "all") {
      XLSX.utils.book_append_sheet(wb, wsGrp, "NHOM_TRIEU_CHUNG");
    }

    // Tự động tải file Excel
    const scopeNames = { rules: "Tap_Luat", symptoms: "Danh_Muc_Trieu_Chung", diseases: "Danh_Muc_Benh", all: "Toan_Bo_Tri_Thuc" };
    const scopeName = scopeNames[scope] || scopeNames.all;
    const filename = `Co_So_Tri_Thuc_${scopeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
  }

  downloadExcelTemplate(scope = "all") {
    if (typeof XLSX === "undefined") {
      throw new Error("Thư viện SheetJS chưa được tải!");
    }

    const supportedScopes = ["all", "rules", "symptoms", "diseases"];
    if (!supportedScopes.includes(scope)) {
      throw new Error(`Không hỗ trợ tải mẫu Excel cho phạm vi [${scope}].`);
    }

    const wb = XLSX.utils.book_new();

    // Mẫu tập luật
    const sampleRules = [
      {
        "Mã Luật": "R99",
        "Tên Luật Sinh": "Luật phát hiện ca bệnh mẫu từ Excel",
        "Mã Bệnh Kết Luận": "D01",
        "Tên Bệnh Kết Luận": "Sốt xuất huyết Dengue",
        "Hệ Số Tin Cậy (CF)": 0.90,
        "Danh Sách Mã Triệu Chứng (Cách nhau dấu phẩy)": "S01, S04, S17",
        "Mô Tả Luật": "Sốt cao + Đau đầu trán + Xuất huyết dưới da"
      }
    ];
    const wsRules = XLSX.utils.json_to_sheet(sampleRules);
    wsRules["!cols"] = [
      { wch: 10 }, { wch: 40 }, { wch: 18 }, { wch: 30 },
      { wch: 18 }, { wch: 45 }, { wch: 50 }
    ];
    if (scope === "all" || scope === "rules") {
      XLSX.utils.book_append_sheet(wb, wsRules, "TAP_LUAT");
    }

    // Mẫu triệu chứng
    const sampleGroupId = (this.getKB().symptomGroups || [])[0]?.id || "group_fever";
    const sampleSyms = [
      {
        "Mã Triệu Chứng": "S99",
        "Mã Nhóm": sampleGroupId,
        "Tên Triệu Chứng": "Triệu chứng mẫu mới",
        "Câu Hỏi Truy Vấn (WHY)": "Bệnh nhân có biểu hiện triệu chứng mẫu này không?",
        "Mức Độ Cảnh Báo": "Bình thường"
      }
    ];
    const wsSyms = XLSX.utils.json_to_sheet(sampleSyms);
    if (scope === "all" || scope === "symptoms") {
      XLSX.utils.book_append_sheet(wb, wsSyms, "TRIEU_CHUNG");
    }

    const sampleDiseases = [
      {
        "Mã Bệnh": "D99",
        "Tên Bệnh Học": "Tên bệnh mẫu",
        "Mức Độ Nguy Hiểm": "Trung bình",
        "Hướng Xử Trí & Phác Đồ": "Hướng xử trí theo hướng dẫn chuyên môn",
        "Dấu Hiệu Cảnh Báo Nguy Hiểm": "Dấu hiệu cần chuyển khám"
      }
    ];
    const wsDiseases = XLSX.utils.json_to_sheet(sampleDiseases);
    wsDiseases["!cols"] = [
      { wch: 12 }, { wch: 35 }, { wch: 28 }, { wch: 30 }, { wch: 25 },
      { wch: 70 }, { wch: 70 }
    ];
    if (scope === "all" || scope === "diseases") {
      XLSX.utils.book_append_sheet(wb, wsDiseases, "DANH_MUC_BENH");
    }

    const sampleGroups = [
      {
        "Mã Nhóm": "G99",
        "Tên Nhóm Triệu Chứng": "Nhóm mẫu",
        "Biểu Tượng FontAwesome": "fa-notes-medical",
        "Mô Tả Phân Loại": "Mô tả nhóm triệu chứng"
      }
    ];
    if (scope === "all") {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleGroups), "NHOM_TRIEU_CHUNG");
    }

    // Mẫu hướng dẫn
    const guideRows = [
      { "Mục": "Quy tắc 1", "Nội dung": "Các sheet được nhận diện: TAP_LUAT, TRIEU_CHUNG, DANH_MUC_BENH, NHOM_TRIEU_CHUNG; giữ lại các cột mẫu để ánh xạ chính xác." },
      { "Mục": "Quy tắc 2", "Nội dung": "Mã và tên là bắt buộc cho mỗi triệu chứng, bệnh và nhóm; mã phải duy nhất trong cùng sheet." },
      { "Mục": "Quy tắc 3", "Nội dung": "Sheet DANH_MUC_BENH hỗ trợ tên khoa học, nhóm bệnh, mức độ nguy hiểm, hướng xử trí/phác đồ và dấu hiệu cảnh báo." },
      { "Mục": "Quy tắc 4", "Nội dung": "Với TAP_LUAT, tiền đề là danh sách mã triệu chứng cách nhau bằng dấu phẩy và CF nằm trong khoảng 0.01 đến 1.0." },
      { "Mục": "Quy tắc 5", "Nội dung": "Có thể sửa các dòng hiện có bằng cùng mã; dòng trùng mã trong chính file sẽ bị báo lỗi." }
    ];
    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide["!cols"] = [{ wch: 15 }, { wch: 90 }];
    if (scope === "all") {
      XLSX.utils.book_append_sheet(wb, wsGuide, "HUONG_DAN");
    }

    const filenames = {
      rules: "Mau_Nhap_Tap_Luat.xlsx",
      symptoms: "Mau_Nhap_Danh_Muc_Trieu_Chung.xlsx",
      diseases: "Mau_Nhap_Danh_Muc_Benh_Phac_Do.xlsx",
      all: "Mau_Nhap_Toan_Bo_Tri_Thuc.xlsx"
    };
    XLSX.writeFile(wb, filenames[scope]);
  }

  async importExcel(input, { scope = "all", includeRules = true, includeCatalog = true } = {}) {
    if (typeof XLSX === "undefined") {
      throw new Error("Thư viện SheetJS chưa sẵn sàng!");
    }

    const workbook = input && Array.isArray(input.SheetNames)
      ? input
      : XLSX.read(input, { type: "array" });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Tệp Excel không chứa bất kỳ trang tính nào!");
    }

    const normalizeKey = value => {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    };
    const getSheet = (patterns, excludedPatterns = []) => {
      const name = workbook.SheetNames.find(sheetName => {
        const normalizedName = normalizeKey(sheetName);
        return patterns.some(pattern => normalizedName.includes(pattern)) &&
          !excludedPatterns.some(pattern => normalizedName.includes(pattern));
      });
      return name ? XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "" }) : [];
    };
    const valueFor = (row, predicate) => {
      const entry = Object.entries(row).find(([key, value]) =>
        value !== undefined && value !== null && String(value).trim() !== "" && predicate(normalizeKey(key))
      );
      return entry ? String(entry[1]).trim() : "";
    };
    const upsertById = (items, item) => {
      const index = items.findIndex(existing => String(existing.id).toUpperCase() === item.id.toUpperCase());
      if (index >= 0) items[index] = { ...items[index], ...item };
      else items.push(item);
    };

    const imported = { importedRules: 0, importedSyms: 0, importedDiseases: 0, importedGroups: 0 };
    const includeGroups = includeCatalog && (scope === "all" || scope === "groups");
    const includeSymptoms = includeCatalog && (scope === "all" || scope === "symptoms");
    const includeDiseases = includeCatalog && (scope === "all" || scope === "diseases");

    if (includeCatalog) {
      const groups = this.kb.symptomGroups || [];
      const groupRows = includeGroups ? getSheet(["nhomtrieuchung", "symptomgroup", "symptomgroups"]) : [];
      for (const row of groupRows) {
        const id = valueFor(row, key => key.includes("manhom") || key === "id" || key === "groupid");
        const name = valueFor(row, key => key.includes("tennhom") || key === "name" || key === "groupname");
        if (!id || !name) continue;
        upsertById(groups, {
          id,
          name,
          icon: valueFor(row, key => key.includes("bieutuong") || key === "icon") || "fa-notes-medical",
          description: valueFor(row, key => key.includes("mota") || key === "description")
        });
        imported.importedGroups++;
      }
      this.kb.symptomGroups = groups;

      const symptomRows = includeSymptoms
        ? getSheet(["trieuchung", "symptom"], ["nhomtrieuchung", "symptomgroup"])
        : [];
      const symptoms = this.kb.symptoms || [];
      for (const row of symptomRows) {
        const id = valueFor(row, key => key.includes("matrieuchung") || key === "id" || key === "symptomid");
        const name = valueFor(row, key => key.includes("tentrieuchung") || key === "name" || key === "symptomname");
        if (!id || !name) continue;

        const groupName = valueFor(row, key => key.includes("tennhom") || key === "groupname");
        const rawGroupId = valueFor(row, key => key.includes("manhom") || key === "groupid");
        const matchedGroup = groups.find(group =>
          String(group.id).toUpperCase() === rawGroupId.toUpperCase() ||
          normalizeKey(group.name) === normalizeKey(groupName || rawGroupId)
        );
        const prior = symptoms.find(symptom => String(symptom.id).toUpperCase() === id.toUpperCase());
        upsertById(symptoms, {
          ...(prior || {}),
          id,
          name,
          groupId: matchedGroup ? matchedGroup.id : (rawGroupId || prior?.groupId || groups[0]?.id || "group_fever"),
          question: valueFor(row, key => key.includes("cauhoi") || key.includes("question") || key.includes("why")) || prior?.question || `Bệnh nhân có bị ${name} không?`,
          severity: valueFor(row, key => key.includes("canhbao") || key.includes("mucdo") || key === "severity") || prior?.severity || "Bình thường"
        });
        imported.importedSyms++;
      }
      this.kb.symptoms = symptoms;

      const diseaseRows = includeDiseases ? getSheet(["danhmucbenh", "benh", "disease"]) : [];
      const diseases = this.kb.diseases || [];
      for (const row of diseaseRows) {
        const id = valueFor(row, key => key.includes("mabenh") || key === "id" || key === "diseaseid");
        const name = valueFor(row, key => key.includes("tenbenh") || key === "name" || key === "diseasename");
        if (!id || !name) continue;

        const prior = diseases.find(disease => String(disease.id).toUpperCase() === id.toUpperCase()) || {};
        const treatment = valueFor(row, key => key.includes("xutri") || key.includes("treatment") || key.includes("phacdo") || key.includes("recommendation"));
        upsertById(diseases, {
          ...prior,
          id,
          name,
          severity: valueFor(row, key => key.includes("nguyhiem") || key === "severity") || prior.severity || "Trung bình",
          treatment: treatment || prior.treatment || prior.recommendation || "",
          recommendation: treatment || prior.recommendation || prior.treatment || "",
          warningSigns: valueFor(row, key => key.includes("canhbao") || key.includes("warning")) || prior.warningSigns || ""
        });
        imported.importedDiseases++;
      }
      this.kb.diseases = diseases;
    }

    if (includeRules && (scope === "all" || scope === "rules")) {
      const ruleRows = getSheet(["tapluat", "rule"]);
      const rules = this.kb.rules || [];
      const symptoms = this.kb.symptoms || [];
      const diseases = this.kb.diseases || [];
      for (const row of ruleRows) {
        const id = valueFor(row, key => key.includes("maluat") || key === "id" || key === "ruleid");
        const name = valueFor(row, key => key.includes("tenluat") || key === "name" || key === "rulename");
        let conclusion = valueFor(row, key => key.includes("mabenh") || key === "conclusion" || key.includes("ketluan") || key === "then");
        const rawCF = valueFor(row, key => key === "cf" || key.includes("tincay") || key.includes("heso") || key.includes("certainty"));
        const parsedCF = Number(rawCF.replace("%", "").replace(",", "."));
        const cf = parsedCF > 1 && parsedCF <= 100 ? parsedCF / 100 : parsedCF;
        const premiseText = valueFor(row, key => key.includes("danhsach") || key.includes("tiende") || key.includes("matrieuchung") || key.includes("premises") || key === "if");
        const premises = premiseText.split(/[,;\n\r\s]+/).map(value => value.trim().toUpperCase()).filter(Boolean);
        if (!id || !conclusion || !premises.length || !Number.isFinite(cf) || cf <= 0 || cf > 1) continue;

        const matchedDisease = diseases.find(disease =>
          String(disease.id).toUpperCase() === conclusion.toUpperCase() || normalizeKey(disease.name) === normalizeKey(conclusion)
        );
        if (matchedDisease) conclusion = matchedDisease.id;
        const validPremises = premises.every(premise => symptoms.some(symptom => symptom.id.toUpperCase() === premise));
        if (!matchedDisease || !validPremises) continue;

        upsertById(rules, {
          id,
          name: name || `Luật ${id}`,
          conclusion,
          cf: Number(cf.toFixed(4)),
          premises,
          description: valueFor(row, key => key.includes("mota") || key.includes("description") || key.includes("ghichu"))
        });
        imported.importedRules++;
      }
      this.kb.rules = rules;
    }

    if (!Object.values(imported).some(count => count > 0)) {
      throw new Error("Không tìm thấy dòng dữ liệu hợp lệ trong các sheet Nhóm triệu chứng, Triệu chứng, Danh mục bệnh hoặc Tập luật.");
    }

    await this.saveToStorage();
    return imported;
  }
}

if (typeof window !== "undefined") {
  window.KnowledgeBaseManager = KnowledgeBaseManager;
}
