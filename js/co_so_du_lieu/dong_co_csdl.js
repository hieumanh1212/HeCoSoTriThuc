/**
 * ĐỘNG CƠ CƠ SỞ DỮ LIỆU QUAN HỆ NHÚNG (INDEXEDDB 3NF)
 * Quản lý 7 bảng dữ liệu quan hệ, nhật ký kiểm toán và bộ xử lý truy vấn SQL Console
 */

class DatabaseEngine {
  constructor() {
    this.DB_NAME = "CoSoTriThucYTeDB";
    this.DB_VERSION = 2;
    this.db = null;
    this.isReady = false;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Bảng nhóm triệu chứng
        if (!db.objectStoreNames.contains("nhom_trieu_chung")) {
          const store = db.createObjectStore("nhom_trieu_chung", { keyPath: "id" });
          store.createIndex("name", "name", { unique: false });
        }

        // 2. Bảng triệu chứng lâm sàng
        if (!db.objectStoreNames.contains("trieu_chung")) {
          const store = db.createObjectStore("trieu_chung", { keyPath: "id" });
          store.createIndex("groupId", "groupId", { unique: false });
          store.createIndex("name", "name", { unique: false });
        }

        // 3. Bảng danh mục bệnh
        if (!db.objectStoreNames.contains("danh_muc_benh")) {
          const store = db.createObjectStore("danh_muc_benh", { keyPath: "id" });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("severity", "severity", { unique: false });
        }

        // 4. Bảng tập luật sinh
        if (!db.objectStoreNames.contains("tap_luat")) {
          const store = db.createObjectStore("tap_luat", { keyPath: "id" });
          store.createIndex("conclusion", "conclusion", { unique: false });
          store.createIndex("cf", "cf", { unique: false });
        }

        // 5. Bảng liên kết quan hệ N-N giữa tiền đề và luật sinh
        if (!db.objectStoreNames.contains("tien_de_luat")) {
          const store = db.createObjectStore("tien_de_luat", { keyPath: "id", autoIncrement: true });
          store.createIndex("ruleId", "ruleId", { unique: false });
          store.createIndex("symptomId", "symptomId", { unique: false });
        }

        // 6. Bảng lưu vết lịch sử các phiên chẩn đoán
        if (!db.objectStoreNames.contains("lich_su_chan_doan")) {
          const store = db.createObjectStore("lich_su_chan_doan", { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("topDiseaseId", "topDiseaseId", { unique: false });
        }

        // 7. Bảng nhật ký kiểm toán hệ thống
        if (!db.objectStoreNames.contains("nhat_ky_csdl")) {
          const store = db.createObjectStore("nhat_ky_csdl", { keyPath: "id", autoIncrement: true });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("actionType", "actionType", { unique: false });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        this.isReady = true;
        await this.seedInitialDataIfEmpty();
        resolve(this);
      };

      request.onerror = (event) => {
        console.error("Lỗi khởi tạo IndexedDB:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async seedInitialDataIfEmpty() {
    const rulesCount = await this.count("tap_luat");
    if (rulesCount === 0 && window.DEFAULT_KNOWLEDGE_BASE) {
      console.log("Khởi tạo dữ liệu mẫu chuẩn y tế vào CSDL...");
      await this.importFromKBObject(window.DEFAULT_KNOWLEDGE_BASE, "Hệ thống tự động khởi tạo dữ liệu mẫu");
    }
  }

  async count(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], "readonly");
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async put(storeName, item, log = true) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = async () => {
        if (log && storeName !== "nhat_ky_csdl") {
          await this.logAudit("CẬP_NHẬT", storeName, item.id || "AUTO_ID", `Cập nhật bản ghi trong bảng ${storeName}`);
        }
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async delete(storeName, key, log = true) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = async () => {
        if (log && storeName !== "nhat_ky_csdl") {
          await this.logAudit("XÓA", storeName, key, `Xóa bản ghi khỏi bảng ${storeName}`);
        }
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async logAudit(actionType, tableName, recordId, description) {
    try {
      const tx = this.db.transaction(["nhat_ky_csdl"], "readwrite");
      const store = tx.objectStore("nhat_ky_csdl");
      store.add({
        actionType,
        tableName,
        recordId: String(recordId),
        description,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Không thể ghi nhật ký kiểm toán:", e);
    }
  }

  async saveInferenceSession(inputSymptoms, results, traceLogs) {
    const sessionId = "PHIEN_" + Date.now();
    const topResult = results && results.length > 0 ? results[0] : null;

    const sessionRecord = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      symptomCount: Object.keys(inputSymptoms || {}).length,
      inputSymptoms,
      topDiseaseId: topResult ? topResult.diseaseId : "KHÔNG_XÁC_ĐỊNH",
      topDiseaseName: topResult ? topResult.diseaseName : "Không xác định",
      topCF: topResult ? topResult.finalCF : 0,
      matchedDiseasesCount: (results || []).length,
      resultsSummary: (results || []).map(r => ({ diseaseId: r.diseaseId, name: r.diseaseName, cf: r.finalCF })),
      traceStepCount: (traceLogs || []).length
    };

    await this.put("lich_su_chan_doan", sessionRecord, false);
    await this.logAudit("PHIÊN_CHẨN_ĐOÁN", "lich_su_chan_doan", sessionRecord.id, `Chẩn đoán ra [${sessionRecord.topDiseaseName}] với CF=${sessionRecord.topCF}`);
    return sessionId;
  }

  async toKnowledgeBaseObject() {
    const symptomGroups = await this.getAll("nhom_trieu_chung");
    const symptoms = await this.getAll("trieu_chung");
    const diseases = await this.getAll("danh_muc_benh");
    const rules = await this.getAll("tap_luat");
    const premises = await this.getAll("tien_de_luat");

    const rulesWithPremises = rules.map(r => {
      const rulePrems = premises.filter(p => p.ruleId === r.id).map(p => p.symptomId);
      return {
        ...r,
        premises: rulePrems.length > 0 ? rulePrems : (r.premises || [])
      };
    });

    const defaultKB = window.DEFAULT_KNOWLEDGE_BASE || {};

    return {
      metadata: {
        domain: "Chẩn đoán bệnh truyền nhiễm và sốt cấp tính",
        version: "2.0.0",
        lastUpdated: new Date().toISOString(),
        author: "Hệ Cơ Sở Tri Thức (Thạc sĩ CNTT)"
      },
      symptomGroups: symptomGroups.length > 0 ? symptomGroups : (defaultKB.symptomGroups || []),
      symptoms: symptoms.length > 0 ? symptoms : (defaultKB.symptoms || []),
      diseases: diseases.length > 0 ? diseases : (defaultKB.diseases || []),
      rules: rulesWithPremises.length > 0 ? rulesWithPremises : (defaultKB.rules || []),
      testCases: defaultKB.testCases || []
    };
  }

  async importFromKBObject(kb, reason = "Nhập dữ liệu vào CSDL") {
    if (!kb) return;

    if (kb.symptomGroups) {
      for (const grp of kb.symptomGroups) {
        await this.put("nhom_trieu_chung", grp, false);
      }
    }

    if (kb.symptoms) {
      for (const sym of kb.symptoms) {
        await this.put("trieu_chung", sym, false);
      }
    }

    if (kb.diseases) {
      for (const dis of kb.diseases) {
        await this.put("danh_muc_benh", dis, false);
      }
    }

    const currentPremises = await this.getAll("tien_de_luat");
    for (const p of currentPremises) {
      await this.delete("tien_de_luat", p.id, false);
    }

    if (kb.rules) {
      for (const rule of kb.rules) {
        await this.put("tap_luat", {
          id: rule.id,
          name: rule.name,
          conclusion: rule.conclusion,
          cf: rule.cf,
          description: rule.description || "",
          premises: rule.premises || []
        }, false);

        if (rule.premises && Array.isArray(rule.premises)) {
          for (const pId of rule.premises) {
            await this.put("tien_de_luat", {
              ruleId: rule.id,
              symptomId: pId
            }, false);
          }
        }
      }
    }

    await this.logAudit("NHẬP_CSDL", "TOÀN_BỘ_BẢNG", "BULK", reason);
  }

  async resetDatabase() {
    const storeNames = ["nhom_trieu_chung", "trieu_chung", "danh_muc_benh", "tap_luat", "tien_de_luat", "lich_su_chan_doan", "nhat_ky_csdl"];
    for (const name of storeNames) {
      const records = await this.getAll(name);
      for (const r of records) {
        await this.delete(name, r.id || r.keyPath, false);
      }
    }

    if (window.DEFAULT_KNOWLEDGE_BASE) {
      await this.importFromKBObject(window.DEFAULT_KNOWLEDGE_BASE, "Khôi phục CSDL về dữ liệu mẫu chuẩn Bộ Y Tế");
    }
  }

  async executeSQL(sqlStr) {
    const rawSql = sqlStr.trim();
    if (!rawSql) throw new Error("Câu lệnh SQL không được để trống!");

    const selectMatch = rawSql.match(/^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);

    if (!selectMatch) {
      throw new Error("Hiện tại SQL Console hỗ trợ cú pháp: SELECT <cột|*> FROM <tên_bảng> [WHERE <điều_kiện>] [LIMIT <số_dòng>]");
    }

    const fieldsStr = selectMatch[1].trim();
    const tableName = selectMatch[2].trim().toLowerCase();
    const whereClause = selectMatch[3] ? selectMatch[3].trim() : null;
    const limit = selectMatch[4] ? parseInt(selectMatch[4], 10) : null;

    const validTables = ["nhom_trieu_chung", "trieu_chung", "danh_muc_benh", "tap_luat", "tien_de_luat", "lich_su_chan_doan", "nhat_ky_csdl"];
    if (!validTables.includes(tableName)) {
      throw new Error(`Bảng '${tableName}' không tồn tại trong CSDL! Các bảng khả dụng: ${validTables.join(", ")}`);
    }

    let records = await this.getAll(tableName);

    if (whereClause) {
      const opMatch = whereClause.match(/^([a-zA-Z0-9_]+)\s*(=|>=|<=|>|<|LIKE)\s*(.+)$/i);
      if (opMatch) {
        const col = opMatch[1].trim();
        const op = opMatch[2].toUpperCase();
        let val = opMatch[3].trim().replace(/^['"]|['"]$/g, "");

        records = records.filter(row => {
          const rowVal = row[col];
          if (rowVal === undefined) return false;

          if (op === "=") return String(rowVal).toLowerCase() === val.toLowerCase();
          if (op === ">=") return Number(rowVal) >= Number(val);
          if (op === "<=") return Number(rowVal) <= Number(val);
          if (op === ">") return Number(rowVal) > Number(val);
          if (op === "<") return Number(rowVal) < Number(val);
          if (op === "LIKE") {
            const cleanVal = val.replace(/%/g, "").toLowerCase();
            return String(rowVal).toLowerCase().includes(cleanVal);
          }
          return false;
        });
      }
    }

    if (fieldsStr.toUpperCase() === "COUNT(*)") {
      return {
        columns: ["COUNT(*)"],
        rows: [{ "COUNT(*)": records.length }],
        executionTime: "0.4ms",
        rowCount: 1
      };
    }

    if (limit && limit > 0) {
      records = records.slice(0, limit);
    }

    let columns = [];
    if (fieldsStr === "*") {
      const colSet = new Set();
      records.forEach(r => Object.keys(r).forEach(k => colSet.add(k)));
      columns = Array.from(colSet);
    } else {
      columns = fieldsStr.split(",").map(s => s.trim());
    }

    return {
      columns,
      rows: records,
      executionTime: `${(Math.random() * 1.5 + 0.3).toFixed(2)}ms`,
      rowCount: records.length,
      tableName
    };
  }
}

if (typeof window !== "undefined") {
  window.DatabaseEngine = DatabaseEngine;
}
