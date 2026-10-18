/**
 * ============================================================================
 * MODULE MẪU PHIẾU BÁO CÁO Y TẾ & XUẤT PDF CHUẨN IN ẤN (MED-EXPERT)
 * ============================================================================
 * Định dạng phiếu kết quả chẩn đoán lâm sàng chuẩn Bộ Y Tế / WHO
 * Hỗ trợ in ấn và xuất PDF sắc nét qua trình duyệt (Zero External Dependencies)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MauBaoCaoYTe = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  function dinhDangNgayGio(isoString) {
    if (!isoString) return new Date().toLocaleString('vi-VN');
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  }

  function taoBaoCaoHTML(session, kb) {
    kb = kb || (typeof window !== 'undefined' && window.DEFAULT_KNOWLEDGE_BASE) || {};
    const symptomsKB = kb.symptoms || [];
    const diseasesKB = kb.diseases || [];
    const groupsKB = kb.symptomGroups || [];

    const sessionId = session.id || session.ma_phien || 'PHIEN_' + Date.now();
    const thoiGian = dinhDangNgayGio(session.timestamp || session.thoi_gian);
    const inputSymptoms = session.inputSymptoms || session.cac_trieu_chung_dau_vao || {};

    const results = session.results || session.resultsSummary || [];
    const topResult = results.length > 0 ? results[0] : null;
    const topCF = session.topCF !== undefined ? session.topCF : (topResult ? (topResult.cf || topResult.finalCF || 0) : 0);
    const topCFPercent = Math.round(topCF * 100);

    const topDiseaseName = session.topDiseaseName || (topResult ? (topResult.name || topResult.diseaseName) : 'Không xác định');
    const topDiseaseInfo = diseasesKB.find(d => d.name === topDiseaseName || d.id === (topResult && (topResult.diseaseId || topResult.id)));

    // 1. Phân tích triệu chứng đầu vào
    const symptomRows = Object.entries(inputSymptoms).map(([sId, cf], idx) => {
      const sym = symptomsKB.find(s => s.id === sId) || { id: sId, name: sId, groupId: '' };
      const grp = groupsKB.find(g => g.id === sym.groupId) || { name: 'Triệu chứng chung' };
      const cfNum = Number(cf);
      let mucDo = 'Không chắc';
      if (cfNum >= 1.0) mucDo = 'Chắc chắn có (1.0)';
      else if (cfNum >= 0.7) mucDo = 'Khả năng cao (0.7)';
      else if (cfNum >= 0.4) mucDo = 'Nghi ngờ có (0.4)';
      else mucDo = 'Không có (0.0)';

      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold; color: #0284c7;">${sym.id}</td>
          <td><strong>${sym.name}</strong></td>
          <td style="color: #64748b;">${grp.name}</td>
          <td style="text-align: center;"><span class="pdf-tag">${mucDo}</span></td>
        </tr>
      `;
    }).join('');

    // 2. Chẩn đoán phân biệt (các bệnh khác)
    let differentialDiagnosisRows = '';
    if (results.length > 1) {
      differentialDiagnosisRows = results.slice(1).map((r, idx) => {
        const dName = r.name || r.diseaseName || r.diseaseId || 'Bệnh khác';
        const dCF = r.cf !== undefined ? r.cf : (r.finalCF || 0);
        const dPercent = Math.round(dCF * 100);
        return `
          <tr>
            <td style="text-align: center;">${idx + 2}</td>
            <td><strong>${dName}</strong></td>
            <td style="text-align: center; font-weight: bold; color: #d97706;">${dPercent}% (CF = ${dCF})</td>
            <td>${dPercent >= 70 ? 'Khả năng rất cao' : (dPercent >= 40 ? 'Khả năng trung bình' : 'Nghi ngờ thấp')}</td>
          </tr>
        `;
      }).join('');
    }

    // 3. Quy tắc đã kích hoạt (Fired Rules)
    const firedRules = (topResult && topResult.firedRules) || [];
    let firedRulesHtml = '';
    if (firedRules.length > 0) {
      firedRulesHtml = `
        <div class="pdf-section">
          <div class="pdf-section-title">QUY TẮC LUẬT ĐÃ KÍCH HOẠT & CƠ CHẾ KẾT HỢP MYCIN</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th style="width: 10%;">Mã Luật</th>
                <th style="width: 25%;">Tên Luật</th>
                <th style="width: 20%;">Tiền đề lâm sàng</th>
                <th style="width: 15%;">CF Luật</th>
                <th style="width: 30%;">Công thức tính</th>
              </tr>
            </thead>
            <tbody>
              ${firedRules.map(r => `
                <tr>
                  <td style="font-family: monospace; font-weight: bold; color: #0f766e;">${r.ruleId || r.id}</td>
                  <td>${r.ruleName || r.name || ''}</td>
                  <td>${(r.premises || []).join(' ∧ ')}</td>
                  <td style="text-align: center; font-weight: bold;">${r.ruleBaseCF !== undefined ? r.ruleBaseCF : (r.cf || '')}</td>
                  <td style="font-size: 11px; font-family: monospace; color: #334155;">${r.formulaStr || `min(CF) × CF_rule = ${r.outputCF || ''}`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Mức độ tin cậy nhãn
    let statusLabel = 'Đã xác định bệnh';
    let statusBadgeColor = '#059669';
    let statusBgColor = '#ecfdf5';
    if (topCF <= 0 || topDiseaseName === 'Không xác định') {
      statusLabel = 'Chưa xác định được bệnh';
      statusBadgeColor = '#dc2626';
      statusBgColor = '#fef2f2';
    } else if (topCF < 0.4) {
      statusLabel = 'Nghi ngờ mức độ thấp';
      statusBadgeColor = '#d97706';
      statusBgColor = '#fffbeb';
    }

    return `
      <div class="medical-report-sheet">
        <!-- HEADER PHIẾU Y TẾ -->
        <div class="pdf-header">
          <div class="pdf-header-left">
            <div class="pdf-hospital-name">BỘ Y TẾ • HỆ CƠ SỞ TRI THỨC Y TẾ (MED-EXPERT)</div>
            <div class="pdf-subtext">Hệ chuyên gia Chẩn đoán Bệnh Truyền nhiễm & Sốt cấp tính</div>
            <div class="pdf-subtext">Khoa CNTT - Học phần Hệ cơ sở tri thức (Thạc sĩ CNTT)</div>
          </div>
          <div class="pdf-header-right">
            <div class="pdf-meta-line"><strong>Mã phiên:</strong> ${sessionId}</div>
            <div class="pdf-meta-line"><strong>Ngày lập:</strong> ${thoiGian}</div>
            <div class="pdf-meta-line"><strong>Mô hình:</strong> MYCIN Certainty Factor</div>
          </div>
        </div>

        <div class="pdf-divider"></div>

        <div class="pdf-doc-title">
          <h1>PHIẾU KẾT QUẢ SUY DIỄN CHẨN ĐOÁN LÂM SÀNG</h1>
          <p>Hệ thống tự động phân tích logic luật sinh & lượng giá xác suất tin cậy</p>
        </div>

        <!-- THÔNG TIN TỔNG QUAN -->
        <div class="pdf-summary-grid">
          <div class="pdf-summary-item">
            <span class="pdf-lbl">Kết luận chẩn đoán:</span>
            <span class="pdf-val pdf-highlight" style="color: ${topCF >= 0.4 ? '#0f766e' : '#dc2626'};">${topDiseaseName}</span>
          </div>
          <div class="pdf-summary-item">
            <span class="pdf-lbl">Độ tin cậy MYCIN:</span>
            <span class="pdf-val">${topCFPercent}% (CF = ${topCF})</span>
          </div>
          <div class="pdf-summary-item">
            <span class="pdf-lbl">Trạng thái kết luận:</span>
            <span class="pdf-status-pill" style="background: ${statusBgColor}; color: ${statusBadgeColor};">${statusLabel}</span>
          </div>
          <div class="pdf-summary-item">
            <span class="pdf-lbl">Số triệu chứng ghi nhận:</span>
            <span class="pdf-val">${Object.keys(inputSymptoms).length} triệu chứng</span>
          </div>
        </div>

        <!-- MỤC 1: TRIỆU CHỨNG ĐÃ GHI NHẬN -->
        <div class="pdf-section">
          <div class="pdf-section-title">1. CÁC DẤU HIỆU LÂM SÀNG BỆNH NHÂN KHAI BÁO</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th style="width: 6%;">STT</th>
                <th style="width: 12%;">Mã TC</th>
                <th style="width: 42%;">Tên triệu chứng lâm sàng</th>
                <th style="width: 20%;">Nhóm triệu chứng</th>
                <th style="width: 20%; text-align: center;">Mức độ tin cậy</th>
              </tr>
            </thead>
            <tbody>
              ${symptomRows || '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">Không có triệu chứng nào được chọn.</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- MỤC 2: KẾT QUẢ SUY DIỄN LÂM SÀNG -->
        <div class="pdf-section">
          <div class="pdf-section-title">2. PHÂN TÍCH CHUYÊN MÔN & HƯỚNG XỬ TRÍ Y KHOA</div>
          
          <div class="pdf-diagnosis-box">
            <div class="pdf-diag-title">
              <strong>${topDiseaseName}</strong>
              ${topDiseaseInfo && topDiseaseInfo.scientificName ? `<span class="pdf-sci-name">(${topDiseaseInfo.scientificName})</span>` : ''}
            </div>
            
            ${topDiseaseInfo && topDiseaseInfo.severity ? `
              <div class="pdf-info-row">
                <span class="pdf-label-bold">Mức độ nguy hiểm:</span>
                <span class="pdf-warn-text">${topDiseaseInfo.severity}</span>
              </div>
            ` : ''}

            ${topDiseaseInfo && topDiseaseInfo.warningSigns ? `
              <div class="pdf-info-row" style="margin-top: 6px;">
                <span class="pdf-label-bold" style="color: #dc2626;">Dấu hiệu cảnh báo nguy hiểm:</span>
                <span style="color: #b91c1c; font-weight: 500;">${topDiseaseInfo.warningSigns}</span>
              </div>
            ` : ''}

            ${topDiseaseInfo && topDiseaseInfo.recommendation ? `
              <div class="pdf-info-row" style="margin-top: 6px;">
                <span class="pdf-label-bold" style="color: #047857;">Hướng xử trí & Khuyến nghị điều trị:</span>
                <span style="color: #065f46;">${topDiseaseInfo.recommendation}</span>
              </div>
            ` : ''}
          </div>

          <!-- BẢNG CHẨN ĐOÁN PHÂN BIỆT -->
          ${differentialDiagnosisRows ? `
            <div style="margin-top: 14px;">
              <div style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 6px; text-transform: uppercase;">
                Chẩn đoán phân biệt với các bệnh nghi vấn khác:
              </div>
              <table class="pdf-table">
                <thead>
                  <tr>
                    <th style="width: 8%;">Xếp hạng</th>
                    <th style="width: 45%;">Bệnh nghi vấn</th>
                    <th style="width: 25%; text-align: center;">Độ tin cậy MYCIN</th>
                    <th style="width: 22%;">Đánh giá lâm sàng</th>
                  </tr>
                </thead>
                <tbody>
                  ${differentialDiagnosisRows}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>

        <!-- MỤC 3: CÁC LUẬT KÍCH HOẠT (NẾU CÓ) -->
        ${firedRulesHtml}

        <!-- CHÂN TRANG & CHỮ KÝ -->
        <div class="pdf-footer-section">
          <div class="pdf-disclaimer">
            * <strong>Lưu ý y khoa:</strong> Phiếu kết quả này được tạo tự động bởi Hệ chuyên gia hỗ trợ chẩn đoán dựa trên Hệ cơ sở tri thức & Hệ số tin cậy MYCIN. Kết quả chỉ mang tính chất tham vấn chuyên môn, không thay thế việc khám chữa bệnh trực tiếp tại các cơ sở y tế.
          </div>

          <div class="pdf-signatures-grid">
            <div class="pdf-sig-box">
              <div class="pdf-sig-title">NGƯỜI LẬP PHIẾU</div>
              <div class="pdf-sig-sub">(Ký và ghi rõ họ tên)</div>
              <div class="pdf-sig-space"></div>
              <div class="pdf-sig-name">Hệ Chuyên Gia MED-EXPERT</div>
            </div>
            <div class="pdf-sig-box">
              <div class="pdf-sig-title">BÁC SĨ / CHUYÊN VIÊN LÂM SÀNG</div>
              <div class="pdf-sig-sub">(Xác nhận chuyên môn)</div>
              <div class="pdf-sig-space"></div>
              <div class="pdf-sig-name">...................................................</div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  function getReportPrintStyles() {
    return `
      @page {
        size: A4;
        margin: 12mm 15mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: 'Times New Roman', 'Segoe UI', Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .medical-report-sheet {
        max-width: 800px;
        margin: 0 auto;
        padding: 10px;
        background: #fff;
      }
      .pdf-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
      }
      .pdf-hospital-name {
        font-size: 14px;
        font-weight: 800;
        color: #0f766e;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .pdf-subtext {
        font-size: 11px;
        color: #475569;
        margin-top: 2px;
      }
      .pdf-header-right {
        text-align: right;
        font-size: 11px;
        color: #334155;
      }
      .pdf-meta-line {
        margin-bottom: 2px;
      }
      .pdf-divider {
        border-bottom: 2px solid #0f766e;
        margin: 8px 0 14px 0;
      }
      .pdf-doc-title {
        text-align: center;
        margin-bottom: 16px;
      }
      .pdf-doc-title h1 {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .pdf-doc-title p {
        font-size: 12px;
        color: #64748b;
        margin: 4px 0 0 0;
        font-style: italic;
      }
      .pdf-summary-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 14px;
      }
      .pdf-summary-item {
        font-size: 12px;
      }
      .pdf-lbl {
        color: #64748b;
        font-weight: 600;
        margin-right: 6px;
      }
      .pdf-val {
        font-weight: 700;
        color: #0f172a;
      }
      .pdf-highlight {
        font-size: 14px;
      }
      .pdf-status-pill {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        font-weight: 800;
        font-size: 11px;
      }
      .pdf-section {
        margin-bottom: 16px;
        page-break-inside: avoid;
      }
      .pdf-section-title {
        font-size: 13px;
        font-weight: 800;
        color: #0f766e;
        text-transform: uppercase;
        border-bottom: 1px solid #94a3b8;
        padding-bottom: 4px;
        margin-bottom: 8px;
      }
      .pdf-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      .pdf-table th, .pdf-table td {
        border: 1px solid #cbd5e1;
        padding: 6px 8px;
        vertical-align: middle;
      }
      .pdf-table th {
        background: #f1f5f9;
        font-weight: 700;
        color: #1e293b;
        text-transform: uppercase;
        font-size: 10.5px;
      }
      .pdf-tag {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        background: #e0f2fe;
        color: #0369a1;
        font-weight: 600;
        font-size: 10px;
      }
      .pdf-diagnosis-box {
        border: 1px solid #99f6e4;
        background: #f0fdfa;
        border-radius: 6px;
        padding: 10px 12px;
      }
      .pdf-diag-title {
        font-size: 15px;
        font-weight: 800;
        color: #0f766e;
      }
      .pdf-sci-name {
        font-size: 13px;
        font-weight: 500;
        font-style: italic;
        color: #475569;
        margin-left: 6px;
      }
      .pdf-info-row {
        font-size: 11.5px;
        line-height: 1.45;
      }
      .pdf-label-bold {
        font-weight: 700;
        margin-right: 4px;
      }
      .pdf-warn-text {
        font-weight: 600;
        color: #b91c1c;
      }
      .pdf-footer-section {
        margin-top: 18px;
        page-break-inside: avoid;
      }
      .pdf-disclaimer {
        font-size: 10px;
        color: #64748b;
        font-style: italic;
        line-height: 1.4;
        border-top: 1px dashed #cbd5e1;
        padding-top: 6px;
      }
      .pdf-signatures-grid {
        display: flex;
        justify-content: space-between;
        margin-top: 24px;
        text-align: center;
      }
      .pdf-sig-box {
        width: 42%;
      }
      .pdf-sig-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .pdf-sig-sub {
        font-size: 10px;
        color: #64748b;
        font-style: italic;
      }
      .pdf-sig-space {
        height: 50px;
      }
      .pdf-sig-name {
        font-size: 12px;
        font-weight: 700;
      }
    `;
  }

  function xuatBaoCaoPDF(session, kb) {
    const reportHtml = taoBaoCaoHTML(session, kb);
    const styles = getReportPrintStyles();

    // Tạo iframe ẩn để in tài liệu chuẩn mực không ảnh hưởng UI
    let printIframe = document.getElementById('medExpertPrintIframe');
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'medExpertPrintIframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Phiếu Chẩn Đoán - ${session.id || 'MED-EXPERT'}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${reportHtml}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow.focus();
      printIframe.contentWindow.print();
    }, 250);
  }

  return {
    taoBaoCaoHTML,
    xuatBaoCaoPDF,
    dinhDangNgayGio
  };

}));
