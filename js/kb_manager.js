/**
 * MODULE QUẢN LÝ CƠ SỞ TRI THỨC (KNOWLEDGE BASE MANAGER)
 * Quản lý CRUD Luật, Triệu chứng, Bệnh, Import/Export JSON, LocalStorage
 */

class KnowledgeBaseManager {
  constructor() {
    this.STORAGE_KEY = "HE_CO_SO_TRI_THUC_KB_DATA";
    this.kb = this.loadFromStorage();
    this.listeners = [];
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
    // Nhân bản sâu dữ liệu mặc định
    return JSON.parse(JSON.stringify(window.DEFAULT_KNOWLEDGE_BASE || {}));
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.kb));
      this.notifyListeners();
    } catch (e) {
      console.error("Lỗi lưu LocalStorage:", e);
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

  // --- QUẢN LÝ TẬP LUẬT (RULES CRUD) ---
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

    // Kiểm tra trùng ID
    if (this.getRuleById(ruleData.id)) {
      throw new Error(`Mã luật ${ruleData.id} đã tồn tại!`);
    }

    this.kb.rules.push({
      id: ruleData.id,
      name: ruleData.name || `Luật ${ruleData.id}`,
      premises: Array.isArray(ruleData.premises) ? ruleData.premises : [],
      conclusion: ruleData.conclusion,
      cf: Number(ruleData.cf) || 0.8,
      description: ruleData.description || ""
    });

    this.saveToStorage();
    return ruleData;
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

    this.saveToStorage();
    return this.kb.rules[idx];
  }

  deleteRule(id) {
    this.kb.rules = (this.kb.rules || []).filter(r => r.id !== id);
    this.saveToStorage();
  }

  // --- QUẢN LÝ TRIỆU CHỨNG (SYMPTOMS CRUD) ---
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

  // --- QUẢN LÝ BỆNH KẾT LUẬN (DISEASES CRUD) ---
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

  // --- IMPORT / EXPORT JSON ---
  exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.kb, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `co_so_tri_thuc_y_te_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.symptoms || !parsed.diseases || !parsed.rules) {
        throw new Error("File JSON không đúng cấu trúc (thiếu symptoms, diseases hoặc rules)");
      }
      this.kb = parsed;
      this.saveToStorage();
      return true;
    } catch (e) {
      throw new Error(`Import thất bại: ${e.message}`);
    }
  }
}

if (typeof window !== "undefined") {
  window.KnowledgeBaseManager = KnowledgeBaseManager;
}
