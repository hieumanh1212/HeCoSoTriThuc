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

  async syncFromDatabase() {
    if (!this.db) return;
    try {
      const dbKB = await this.db.toKnowledgeBaseObject();
      if (dbKB && dbKB.rules && dbKB.rules.length > 0) {
        this.kb = dbKB;
        this.saveToStorage();
        this.notifyListeners();
      }
    } catch (e) {
      console.warn("Lỗi sync từ Database, sử dụng cache:", e);
    }
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Lỗi đọc LocalStorage, sử dụng dữ liệu mặc định:", e);
    }
    return JSON.parse(JSON.stringify(window.DEFAULT_KNOWLEDGE_BASE || {}));
  }

  async saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.kb));
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
    return this.kb;
  }

  resetToDefault() {
    this.kb = JSON.parse(JSON.stringify(window.DEFAULT_KNOWLEDGE_BASE || {}));
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
    if (!ruleData.id) {
      const existingMax = (this.kb.rules || []).reduce((max, r) => {
        const num = parseInt(r.id.replace("R", ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      ruleData.id = `R${String(existingMax + 1).padStart(2, "0")}`;
    }

    if (this.getRuleById(ruleData.id)) {
      throw new Error(`Mã luật ${ruleData.id} đã tồn tại!`);
    }

    const newRule = {
      id: ruleData.id,
      name: ruleData.name || `Luật ${ruleData.id}`,
      premises: Array.isArray(ruleData.premises) ? ruleData.premises : [],
      conclusion: ruleData.conclusion,
      cf: Number(ruleData.cf) || 0.8,
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
    const idx = (this.kb.rules || []).findIndex(r => r.id === id);
    if (idx === -1) throw new Error(`Không tìm thấy luật có mã ${id}`);

    this.kb.rules[idx] = {
      ...this.kb.rules[idx],
      name: ruleData.name || this.kb.rules[idx].name,
      premises: Array.isArray(ruleData.premises) ? ruleData.premises : this.kb.rules[idx].premises,
      conclusion: ruleData.conclusion || this.kb.rules[idx].conclusion,
      cf: Number(ruleData.cf) !== undefined ? Number(ruleData.cf) : this.kb.rules[idx].cf,
      description: ruleData.description || this.kb.rules[idx].description
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

  // ============================================================================
  // XUẤT / NHẬP EXCEL (.XLSX) BẰNG THƯ VIỆN SHEETJS
  // ============================================================================

  exportExcel() {
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
    XLSX.utils.book_append_sheet(wb, wsRules, "TAP_LUAT");

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
    XLSX.utils.book_append_sheet(wb, wsSyms, "TRIEU_CHUNG");

    // 3. Sheet DANH MỤC BỆNH HỌC
    const disRows = (kb.diseases || []).map(d => ({
      "Mã Bệnh": d.id,
      "Tên Bệnh Học": d.name,
      "Tên Khoa Học": d.scientificName || "",
      "Nhóm Bệnh": d.category || "",
      "Mức Độ Nguy Hiểm": d.severity || "",
      "Hướng Xử Trí & Phác Đồ": d.treatment || d.recommendation || "",
      "Dấu Hiệu Cảnh Báo Nguy Hiểm": d.warningSigns || ""
    }));
    const wsDis = XLSX.utils.json_to_sheet(disRows);
    wsDis["!cols"] = [
      { wch: 12 }, { wch: 35 }, { wch: 30 }, { wch: 35 },
      { wch: 30 }, { wch: 70 }, { wch: 70 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDis, "DANH_MUC_BENH");

    // 4. Sheet NHÓM TRIỆU CHỨNG
    const grpRows = (kb.symptomGroups || []).map(g => ({
      "Mã Nhóm": g.id,
      "Tên Nhóm Triệu Chứng": g.name,
      "Biểu Tượng FontAwesome": g.icon || "fa-notes-medical",
      "Mô Tả Phân Loại": g.description || ""
    }));
    const wsGrp = XLSX.utils.json_to_sheet(grpRows);
    wsGrp["!cols"] = [{ wch: 12 }, { wch: 35 }, { wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsGrp, "NHOM_TRIEU_CHUNG");

    // Tự động tải file Excel
    const filename = `Co_So_Tri_Thuc_Y_Te_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
  }

  downloadExcelTemplate() {
    if (typeof XLSX === "undefined") {
      throw new Error("Thư viện SheetJS chưa được tải!");
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
    XLSX.utils.book_append_sheet(wb, wsRules, "TAP_LUAT");

    // Mẫu triệu chứng
    const sampleSyms = [
      {
        "Mã Triệu Chứng": "S99",
        "Mã Nhóm": "G01",
        "Tên Triệu Chứng": "Triệu chứng mẫu mới",
        "Câu Hỏi Truy Vấn (WHY)": "Bệnh nhân có biểu hiện triệu chứng mẫu này không?",
        "Mức Độ Cảnh Báo": "Bình thường"
      }
    ];
    const wsSyms = XLSX.utils.json_to_sheet(sampleSyms);
    XLSX.utils.book_append_sheet(wb, wsSyms, "TRIEU_CHUNG");

    // Mẫu hướng dẫn
    const guideRows = [
      { "Mục": "Quy tắc 1", "Nội dung": "Không đổi tên các Sheet: TAP_LUAT, TRIEU_CHUNG, DANH_MUC_BENH" },
      { "Mục": "Quy tắc 2", "Nội dung": "Cột 'Danh Sách Mã Triệu Chứng': nhập các mã triệu chứng cách nhau bằng dấu phẩy (Ví dụ: S01, S04, S05)" },
      { "Mục": "Quy tắc 3", "Nội dung": "Hệ số tin cậy CF là số thập phân từ 0.1 đến 1.0 (Ví dụ: 0.85 hoặc 0.9)" },
      { "Mục": "Quy tắc 4", "Nội dung": "Mã bệnh kết luận phải khớp với mã trong sheet DANH_MUC_BENH (Ví dụ: D01, D02, D03...)" }
    ];
    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide["!cols"] = [{ wch: 15 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, "HUONG_DAN");

    XLSX.writeFile(wb, "Mau_Nhap_Lieu_Tri_Thuc.xlsx");
  }

  async importExcel(arrayBuffer) {
    if (typeof XLSX === "undefined") {
      throw new Error("Thư viện SheetJS chưa sẵn sàng!");
    }

    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Tệp Excel không chứa bất kỳ trang tính nào!");
    }

    let importedRules = 0;
    let importedSyms = 0;
    let importedDiseases = 0;

    // Helper chuẩn hóa text key
    const normalizeKey = (str) => {
      return String(str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    };

    // 1. Phân tích Sheet Tập Luật
    const ruleSheetName = workbook.SheetNames.find(name => {
      const n = normalizeKey(name);
      return n.includes("luat") || n.includes("rule") || n.includes("tapluat");
    }) || workbook.SheetNames[0];

    if (ruleSheetName) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[ruleSheetName]);
      if (rows && rows.length > 0) {
        const existingRules = this.kb.rules || [];

        for (const row of rows) {
          // Tìm các trường linh hoạt
          let rId = null, rName = null, rConclusion = null, rCF = 0.85, rPremises = [], rDesc = "";

          for (const [k, v] of Object.entries(row)) {
            if (v === undefined || v === null || String(v).trim() === "") continue;
            const nk = normalizeKey(k);
            const strVal = String(v).trim();

            if (nk.includes("maluat") || nk === "id" || nk === "ma" || nk.includes("ruleid") || nk === "sttluat") {
              rId = strVal;
            } else if (nk.includes("tenluat") || nk === "name" || (nk.includes("ten") && !nk.includes("benh") && !nk.includes("trieuchung")) || nk.includes("rulename")) {
              rName = strVal;
            } else if (nk.includes("mabenh") || nk === "conclusion" || nk === "ketluan" || (nk.includes("ketluan") && !nk.includes("ten")) || nk.includes("then")) {
              rConclusion = strVal;
            } else if (nk.includes("cf") || nk.includes("tincay") || nk.includes("heso") || nk.includes("certainty")) {
              const val = strVal.replace("%", "").replace(",", ".");
              const parsed = parseFloat(val);
              if (!isNaN(parsed)) {
                rCF = parsed > 1.0 && parsed <= 100 ? parsed / 100 : parsed;
              }
            } else if (nk.includes("matrieuchung") || nk.includes("danhsach") || (nk.includes("tiende") && !nk.includes("ten")) || (nk.includes("trieuchung") && !nk.includes("ten")) || nk.includes("premises") || nk === "if") {
              rPremises = strVal.split(/[,;\n\r\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
            } else if (nk.includes("mota") || nk.includes("description") || nk.includes("ghichu") || nk.includes("note")) {
              rDesc = strVal;
            }
          }

          if (rConclusion) {
            const matchedDis = (this.kb.diseases || []).find(d => 
              d.id.toUpperCase() === rConclusion.toUpperCase() || 
              normalizeKey(d.name) === normalizeKey(rConclusion)
            );
            if (matchedDis) {
              rConclusion = matchedDis.id;
            }
          }

          if (rId && rConclusion) {
            const newRuleObj = {
              id: rId,
              name: rName || `Luật ${rId}`,
              conclusion: rConclusion,
              cf: isNaN(rCF) ? 0.85 : rCF,
              premises: rPremises,
              description: rDesc
            };

            const existIdx = existingRules.findIndex(r => r.id === rId);
            if (existIdx >= 0) {
              existingRules[existIdx] = newRuleObj;
            } else {
              existingRules.push(newRuleObj);
            }
            importedRules++;
          }
        }
        this.kb.rules = existingRules;
      }
    }

    // 2. Phân tích Sheet Triệu Chứng (nếu có)
    const symSheetName = workbook.SheetNames.find(name => /trieu_chung|symptom/i.test(name));
    if (symSheetName) {
      const symRows = XLSX.utils.sheet_to_json(workbook.Sheets[symSheetName]);
      const existingSyms = this.kb.symptoms || [];

      for (const row of symRows) {
        let sId = null, sGroupId = "G01", sName = null, sQuestion = null, sSeverity = "Bình thường";
        for (const [k, v] of Object.entries(row)) {
          const nk = norm(k);
          if (nk.includes("matrieuchung") || nk === "id") sId = String(v).trim();
          else if (nk.includes("manhom") || nk === "groupid") sGroupId = String(v).trim();
          else if (nk.includes("tentrieuchung") || nk === "name") sName = String(v).trim();
          else if (nk.includes("cauhoi") || nk.includes("question") || nk.includes("why")) sQuestion = String(v).trim();
          else if (nk.includes("canhbao") || nk.includes("mucdo") || nk.includes("severity")) sSeverity = String(v).trim();
        }

        if (sId && sName) {
          const sObj = {
            id: sId,
            groupId: sGroupId,
            name: sName,
            question: sQuestion || `Bệnh nhân có bị ${sName} không?`,
            severity: sSeverity
          };
          const existIdx = existingSyms.findIndex(s => s.id === sId);
          if (existIdx >= 0) existingSyms[existIdx] = sObj;
          else existingSyms.push(sObj);
          importedSyms++;
        }
      }
      this.kb.symptoms = existingSyms;
    }

    // 3. Phân tích Sheet Bệnh (nếu có)
    const disSheetName = workbook.SheetNames.find(name => /benh|disease/i.test(name));
    if (disSheetName) {
      const disRows = XLSX.utils.sheet_to_json(workbook.Sheets[disSheetName]);
      const existingDis = this.kb.diseases || [];

      for (const row of disRows) {
        let dId = null, dName = null, dSci = "", dCat = "", dSev = "Trung bình", dTreat = "", dWarn = "";
        for (const [k, v] of Object.entries(row)) {
          const nk = norm(k);
          if (nk.includes("mabenh") || nk === "id") dId = String(v).trim();
          else if (nk.includes("tenbenh") || nk === "name") dName = String(v).trim();
          else if (nk.includes("khoahoc") || nk.includes("scientific")) dSci = String(v).trim();
          else if (nk.includes("nhombenh") || nk.includes("category")) dCat = String(v).trim();
          else if (nk.includes("nguyhiem") || nk.includes("severity")) dSev = String(v).trim();
          else if (nk.includes("xutri") || nk.includes("treatment") || nk.includes("phacdo")) dTreat = String(v).trim();
          else if (nk.includes("canhbao") || nk.includes("warning")) dWarn = String(v).trim();
        }

        if (dId && dName) {
          const dObj = {
            id: dId,
            name: dName,
            scientificName: dSci,
            category: dCat,
            severity: dSev,
            treatment: dTreat,
            recommendation: dTreat,
            warningSigns: dWarn
          };
          const existIdx = existingDis.findIndex(d => d.id === dId);
          if (existIdx >= 0) existingDis[existIdx] = dObj;
          else existingDis.push(dObj);
          importedDiseases++;
        }
      }
      this.kb.diseases = existingDis;
    }

    // Lưu vĩnh viễn vào CSDL (SQLite / IndexedDB) và cập nhật giao diện
    await this.saveToStorage();
    return {
      importedRules,
      importedSyms,
      importedDiseases
    };
  }
}

if (typeof window !== "undefined") {
  window.KnowledgeBaseManager = KnowledgeBaseManager;
}
