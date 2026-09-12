/**
 * ============================================================================
 * HỆ CƠ SỞ TRI THỨC Y TẾ (MED-EXPERT) - MÁY CHỦ BACKEND SQLITE
 * ============================================================================
 * Sử dụng Node.js Built-in (node:http, node:fs, node:sqlite) - Zero External Dependencies
 * Đồng bộ thời gian thực 2 chiều giữa Giao diện Web và Phần mềm DBeaver qua file co_so_du_lieu_y_te.db
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'co_so_du_lieu_y_te.db');
const SQL_INIT_PATH = path.join(__dirname, 'js', 'co_so_du_lieu', 'co_so_du_lieu_y_te.sql');

// 1. Khởi tạo / Kết nối Database SQLite
let db;
try {
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  console.log(`[SQLITE] Đã kết nối thành công tới file CSDL: ${DB_PATH}`);
  
  // Kiểm tra nếu database chưa có bảng thì tự động nạp từ file SQL
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tap_luat';").all();
  if (tables.length === 0) {
    console.log("[SQLITE] Database trống, đang khởi tạo từ co_so_du_lieu_y_te.sql...");
    if (fs.existsSync(SQL_INIT_PATH)) {
      const initSql = fs.readFileSync(SQL_INIT_PATH, 'utf8');
      db.exec(initSql);
      console.log("[SQLITE] Khởi tạo thành công 7 bảng và dữ liệu mẫu chuẩn y tế.");
    }
  }
} catch (err) {
  console.error("[SQLITE ERROR] Không thể khởi tạo database:", err);
}

// 2. MIME Types cho Static Web Server
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.sql': 'text/plain; charset=UTF-8',
  '.md': 'text/markdown; charset=UTF-8'
};

// Hàm hỗ trợ gửi JSON
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Hàm đọc Body từ Request
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

// 3. Khởi tạo HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Xử lý CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // ==================== API ENDPOINTS ====================
  
  // 1. Kiểm tra trạng thái máy chủ & CSDL SQLite
  if (pathname === '/api/trang_thai' && req.method === 'GET') {
    try {
      const counts = {
        nhom_trieu_chung: db.prepare("SELECT count(*) as c FROM nhom_trieu_chung;").get().c,
        trieu_chung: db.prepare("SELECT count(*) as c FROM trieu_chung;").get().c,
        danh_muc_benh: db.prepare("SELECT count(*) as c FROM danh_muc_benh;").get().c,
        tap_luat: db.prepare("SELECT count(*) as c FROM tap_luat;").get().c,
        tien_de_luat: db.prepare("SELECT count(*) as c FROM tien_de_luat;").get().c,
        lich_su_chan_doan: db.prepare("SELECT count(*) as c FROM lich_su_chan_doan;").get().c,
        nhat_ky_csdl: db.prepare("SELECT count(*) as c FROM nhat_ky_csdl;").get().c
      };
      return sendJSON(res, 200, {
        ok: true,
        mode: "SQLite_Realtime_Sync",
        dbFile: DB_PATH,
        counts,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      return sendJSON(res, 500, { ok: false, error: e.message });
    }
  }

  // 2. Lấy toàn bộ Cơ sở Tri thức từ SQLite để Web nạp vào Động cơ suy diễn
  if (pathname === '/api/kb' && req.method === 'GET') {
    try {
      const symptomGroups = db.prepare("SELECT ma_nhom as id, ten_nhom as name, bieu_tuong as icon, mo_ta as description FROM nhom_trieu_chung ORDER BY ma_nhom;").all();
      const symptoms = db.prepare("SELECT ma_trieu_chung as id, ma_nhom as groupId, ten_trieu_chung as name, cau_hoi_suy_dien_lui as question, muc_do_canh_bao as severity FROM trieu_chung ORDER BY ma_trieu_chung;").all();
      const diseases = db.prepare("SELECT ma_benh as id, ten_benh as name, ten_khoa_hoc as scientificName, nhom_benh as category, muc_do_nguy_hiem as severity, huong_xu_tri as treatment, trieu_chung_canh_bao as warningSigns FROM danh_muc_benh ORDER BY ma_benh;").all();
      
      const rawRules = db.prepare("SELECT ma_luat as id, ten_luat as name, ma_benh_ket_luan as conclusion, he_so_tin_cay_luat as cf, mo_ta as description FROM tap_luat ORDER BY ma_luat;").all();
      const rawPremises = db.prepare("SELECT ma_luat as ruleId, ma_trieu_chung as symptomId FROM tien_de_luat;").all();

      const rules = rawRules.map(r => {
        const prems = rawPremises.filter(p => p.ruleId === r.id).map(p => p.symptomId);
        return {
          ...r,
          premises: prems
        };
      });

      return sendJSON(res, 200, {
        ok: true,
        symptomGroups,
        symptoms,
        diseases,
        rules
      });
    } catch (e) {
      return sendJSON(res, 500, { ok: false, error: e.message });
    }
  }

  // 3. Thực thi SQL Console tương tác trực tiếp trên SQLite
  if (pathname === '/api/sql' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const sql = (body.query || body.sql || '').trim();
      if (!sql) {
        return sendJSON(res, 400, { ok: false, error: 'Câu lệnh SQL không được để trống.' });
      }

      const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN)\b/i.test(sql);
      if (isSelect) {
        const stmt = db.prepare(sql);
        const rows = stmt.all();
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return sendJSON(res, 200, {
          ok: true,
          isSelect: true,
          columns,
          rows,
          rowCount: rows.length
        });
      } else {
        // Thực thi các câu lệnh INSERT, UPDATE, DELETE, CREATE, DROP
        db.exec(sql);
        return sendJSON(res, 200, {
          ok: true,
          isSelect: false,
          message: "Thực thi câu lệnh SQL thành công trên file SQLite co_so_du_lieu_y_te.db."
        });
      }
    } catch (e) {
      return sendJSON(res, 200, { ok: false, error: e.message });
    }
  }

  // 4. CRUD Luật sinh - Thêm luật mới (Ghi vào tap_luat & tien_de_luat)
  if (pathname === '/api/luat' && req.method === 'POST') {
    try {
      const rule = await parseRequestBody(req);
      if (!rule.id || !rule.conclusion || !rule.cf) {
        return sendJSON(res, 400, { ok: false, error: 'Dữ liệu luật không hợp lệ.' });
      }

      // Thêm luật
      db.prepare(`
        INSERT OR REPLACE INTO tap_luat (ma_luat, ten_luat, ma_benh_ket_luan, he_so_tin_cay_luat, mo_ta)
        VALUES (?, ?, ?, ?, ?);
      `).run(rule.id, rule.name || `Luật ${rule.id}`, rule.conclusion, Number(rule.cf), rule.description || '');

      // Xóa tiền đề cũ và thêm tiền đề mới
      db.prepare("DELETE FROM tien_de_luat WHERE ma_luat = ?;").run(rule.id);
      if (Array.isArray(rule.premises)) {
        const insertPrem = db.prepare("INSERT INTO tien_de_luat (ma_luat, ma_trieu_chung, toan_tu_logic) VALUES (?, ?, 'AND');");
        for (const sId of rule.premises) {
          insertPrem.run(rule.id, sId);
        }
      }

      // Ghi audit log
      db.prepare("INSERT INTO nhat_ky_csdl (loai_thao_tac, ten_bang, chi_tiet) VALUES ('LƯU_LUẬT', 'tap_luat', ?);")
        .run(`Cập nhật luật ${rule.id} (Kết luận: ${rule.conclusion}, CF: ${rule.cf})`);

      return sendJSON(res, 200, { ok: true, message: `Đã lưu luật ${rule.id} vào SQLite thành công.` });
    } catch (e) {
      return sendJSON(res, 500, { ok: false, error: e.message });
    }
  }

  // 5. CRUD Luật sinh - Xóa luật
  if (pathname.startsWith('/api/luat/') && req.method === 'DELETE') {
    try {
      const ruleId = pathname.replace('/api/luat/', '').trim();
      db.prepare("DELETE FROM tien_de_luat WHERE ma_luat = ?;").run(ruleId);
      db.prepare("DELETE FROM tap_luat WHERE ma_luat = ?;").run(ruleId);
      db.prepare("INSERT INTO nhat_ky_csdl (loai_thao_tac, ten_bang, chi_tiet) VALUES ('XÓA_LUẬT', 'tap_luat', ?);")
        .run(`Xóa luật ${ruleId} khỏi cơ sở tri thức`);

      return sendJSON(res, 200, { ok: true, message: `Đã xóa luật ${ruleId} khỏi SQLite.` });
    } catch (e) {
      return sendJSON(res, 500, { ok: false, error: e.message });
    }
  }

  // 6. Lưu phiên chẩn đoán vào SQLite
  if (pathname === '/api/lich_su' && req.method === 'POST') {
    try {
      const session = await parseRequestBody(req);
      db.prepare(`
        INSERT INTO lich_su_chan_doan (ma_phien, cac_trieu_chung_dau_vao, benh_chinh, he_so_tin_cay_chinh, chi_tiet_ket_qua_json)
        VALUES (?, ?, ?, ?, ?);
      `).run(
        session.id || `PHIEN_${Date.now()}`,
        JSON.stringify(session.inputSymptoms || {}),
        session.topDiseaseName || 'Không xác định',
        Number(session.topCF || 0),
        JSON.stringify(session.resultsSummary || [])
      );

      return sendJSON(res, 200, { ok: true, message: 'Đã lưu lịch sử chẩn đoán vào SQLite.' });
    } catch (e) {
      return sendJSON(res, 500, { ok: false, error: e.message });
    }
  }

  // 7. Khôi phục CSDL mặc định từ file SQL
  if (pathname === '/api/khoi_phuc' && req.method === 'POST') {
    try {
      if (fs.existsSync(SQL_INIT_PATH)) {
        const initSql = fs.readFileSync(SQL_INIT_PATH, 'utf8');
        db.exec(initSql);
        return sendJSON(res, 200, { ok: true, message: 'Đã khôi phục CSDL SQLite về trạng thái chuẩn ban đầu.' });
      } else {
        return sendJSON(res, 404, { ok: false, error: 'Không tìm thấy tệp co_so_du_lieu_y_te.sql' });
      }
    } catch (e) {
      return sendJSON(res, 500, { ok: false, error: e.message });
    }
  }

  // ==================== STATIC FILE SERVER ====================
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = 'index.html';
  } else if (safePath.startsWith('/') || safePath.startsWith('\\')) {
    safePath = safePath.slice(1);
  }

  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      return res.end(`404 Không tìm thấy tài nguyên: ${pathname}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

// Khởi chạy server
server.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 MÁY CHỦ HỆ CƠ SỞ TRI THỨC ĐANG CHẠY TẠI: http://localhost:${PORT}`);
  console.log(`📁 File SQLite vật lý kết nối trực tiếp: ${DB_PATH}`);
  console.log('💡 DBeaver có thể mở file trên để xem thay đổi ngay lập tức!');
  console.log('================================================================');
});
