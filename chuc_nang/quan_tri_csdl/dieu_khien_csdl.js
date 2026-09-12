/**
 * ĐIỀU KHIỂN QUẢN TRỊ CƠ SỞ DỮ LIỆU & SQL CONSOLE
 * Điều phối thống kê số lượng, thực thi truy vấn SQL và trình duyệt các bảng dữ liệu
 */

class DatabaseController {
  constructor({ dbEngine, kbManager, onResetComplete }) {
    this.dbEngine = dbEngine;
    this.kbManager = kbManager;
    this.onResetComplete = onResetComplete;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.statRules = document.getElementById("dbStatRules");
    this.statSymptoms = document.getElementById("dbStatSymptoms");
    this.statDiseases = document.getElementById("dbStatDiseases");
    this.statSessions = document.getElementById("dbStatSessions");

    this.sqlQueryInput = document.getElementById("sqlQueryInput");
    this.btnExecuteSQL = document.getElementById("btnExecuteSQL");
    this.sqlResultContainer = document.getElementById("sqlResultContainer");
    this.sqlResultThead = document.getElementById("sqlResultThead");
    this.sqlResultTbody = document.getElementById("sqlResultTbody");
    this.sqlRowCount = document.getElementById("sqlRowCount");
    this.sqlExecTime = document.getElementById("sqlExecTime");

    this.dbTableSelector = document.getElementById("dbTableSelector");
    this.dbExplorerThead = document.getElementById("dbExplorerThead");
    this.dbExplorerTbody = document.getElementById("dbExplorerTbody");

    this.btnRefreshStats = document.getElementById("btnRefreshDBStats");
    this.btnResetAll = document.getElementById("btnResetDatabaseAll");
  }

  bindEvents() {
    if (this.btnExecuteSQL && this.sqlQueryInput) {
      this.btnExecuteSQL.addEventListener("click", () => {
        this.executeSQL(this.sqlQueryInput.value);
      });
    }

    document.querySelectorAll(".sql-pill").forEach(pill => {
      pill.addEventListener("click", (e) => {
        const query = e.currentTarget.getAttribute("data-query");
        if (this.sqlQueryInput) {
          this.sqlQueryInput.value = query;
          this.executeSQL(query);
        }
      });
    });

    if (this.dbTableSelector) {
      this.dbTableSelector.addEventListener("change", (e) => {
        this.renderTableExplorer(e.target.value);
      });
    }

    if (this.btnRefreshStats) {
      this.btnRefreshStats.addEventListener("click", () => {
        this.updateStats();
        if (this.dbTableSelector) this.renderTableExplorer(this.dbTableSelector.value);
        ThongBao.thongTin("Đã làm mới thông tin và cấu trúc bảng CSDL!");
      });
    }

    if (this.btnResetAll) {
      this.btnResetAll.addEventListener("click", async () => {
        const isConfirmed = await (window.XacNhan ? window.XacNhan.hienThi({
          title: "Tái tạo & Khôi phục CSDL",
          message: "Bạn có chắc chắn muốn <strong style=\"color: #ef4444;\">tái tạo và xóa toàn bộ CSDL</strong> để khôi phục về trạng thái chuẩn ban đầu của Bộ Y Tế?",
          detail: "Hành động này sẽ xóa sạch các bản ghi hiện tại và nạp lại toàn bộ danh mục triệu chứng, bệnh và tập luật gốc.",
          type: "danger",
          confirmText: "Tái tạo CSDL",
          cancelText: "Hủy bỏ",
          icon: "fa-trash-can"
        }) : confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ CSDL và khôi phục về trạng thái chuẩn ban đầu của Bộ Y Tế?"));

        if (isConfirmed) {
          await this.dbEngine.resetDatabase();
          await this.kbManager.syncFromDatabase();
          this.updateStats();
          if (this.dbTableSelector) this.renderTableExplorer(this.dbTableSelector.value);
          if (this.onResetComplete) this.onResetComplete();
          ThongBao.thanhCong("Đã khôi phục toàn bộ CSDL về mặc định thành công!");
        }
      });
    }
  }

  async updateStats() {
    if (!this.dbEngine || !this.dbEngine.isReady) return;
    try {
      const rulesCount = await this.dbEngine.count("tap_luat");
      const symptomsCount = await this.dbEngine.count("trieu_chung");
      const diseasesCount = await this.dbEngine.count("danh_muc_benh");
      const sessionsCount = await this.dbEngine.count("lich_su_chan_doan");

      if (this.statRules) this.statRules.textContent = rulesCount;
      if (this.statSymptoms) this.statSymptoms.textContent = symptomsCount;
      if (this.statDiseases) this.statDiseases.textContent = diseasesCount;
      if (this.statSessions) this.statSessions.textContent = sessionsCount;
    } catch (e) {
      console.warn("Lỗi đọc thống kê CSDL:", e);
    }
  }

  async executeSQL(sqlQuery) {
    if (!this.dbEngine || !this.dbEngine.isReady) {
      ThongBao.canhBao("Động cơ CSDL chưa sẵn sàng!");
      return;
    }

    try {
      const res = await this.dbEngine.executeSQL(sqlQuery);
      if (!this.sqlResultContainer || !this.sqlResultThead || !this.sqlResultTbody) return;

      this.sqlResultContainer.style.display = "block";
      if (this.sqlRowCount) this.sqlRowCount.textContent = res.rowCount;
      if (this.sqlExecTime) this.sqlExecTime.textContent = res.executionTime;

      this.sqlResultThead.innerHTML = `<tr>${res.columns.map(c => `<th>${c}</th>`).join("")}</tr>`;

      if (res.rows.length === 0) {
        this.sqlResultTbody.innerHTML = `<tr><td colspan="${res.columns.length}" style="text-align: center; color: var(--text-muted);">Không tìm thấy bản ghi nào thỏa mãn điều kiện.</td></tr>`;
      } else {
        this.sqlResultTbody.innerHTML = res.rows.map(row => {
          return `<tr>${res.columns.map(c => {
            let val = row[c];
            if (typeof val === "object") val = JSON.stringify(val);
            return `<td>${val !== undefined ? String(val) : 'NULL'}</td>`;
          }).join("")}</tr>`;
        }).join("");
      }
      ThongBao.thanhCong(`Truy vấn SQL thành công (${res.rowCount} dòng, ${res.executionTime}ms)!`);
    } catch (err) {
      ThongBao.thatBai(`Lỗi thực thi SQL: ${err.message}`);
    }
  }

  async renderTableExplorer(tableName) {
    if (!this.dbEngine || !this.dbEngine.isReady) return;
    if (!this.dbExplorerThead || !this.dbExplorerTbody) return;

    try {
      const records = await this.dbEngine.getAll(tableName);
      if (records.length === 0) {
        this.dbExplorerThead.innerHTML = `<tr><th>Thông báo</th></tr>`;
        this.dbExplorerTbody.innerHTML = `<tr><td style="text-align: center; color: var(--text-muted);">Bảng '${tableName}' hiện chưa có dữ liệu.</td></tr>`;
        return;
      }

      const colSet = new Set();
      records.forEach(r => Object.keys(r).forEach(k => colSet.add(k)));
      const cols = Array.from(colSet);

      this.dbExplorerThead.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>`;
      this.dbExplorerTbody.innerHTML = records.map(r => {
        return `<tr>${cols.map(c => {
          let val = r[c];
          if (typeof val === "object") val = JSON.stringify(val);
          return `<td>${val !== undefined ? String(val) : 'NULL'}</td>`;
        }).join("")}</tr>`;
      }).join("");
    } catch (e) {
      console.warn("Lỗi load table explorer:", e);
    }
  }
}

if (typeof window !== "undefined") {
  window.DatabaseController = DatabaseController;
}
