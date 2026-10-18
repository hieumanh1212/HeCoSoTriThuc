/**
 * BIỂU DIỄN TRI THỨC DẠNG FRAME CHO KHÁI NIỆM BỆNH
 * Một Frame gồm tên khái niệm và các slot mô tả thuộc tính của bệnh.
 */

class DiseaseFrame {
  static fromDisease(disease, knowledgeBase = {}) {
    const source = disease || {};
    const rules = (knowledgeBase.rules || [])
      .filter(rule => rule.conclusion === source.id)
      .map(rule => ({
        id: rule.id,
        name: rule.name,
        premises: [...(rule.premises || [])],
        cf: Number(rule.cf) || 0,
        description: rule.description || ""
      }));

    const slots = {
      maBenh: source.id || "",
      tenBenh: source.name || source.id || "Chưa xác định",
      tenKhoaHoc: source.scientificName || "Chưa cập nhật",
      nhomBenh: source.category || "Chưa phân loại",
      mucDoNguyHiem: source.severity || "Chưa đánh giá",
      moTa: source.description || "Chưa có mô tả",
      dauHieuCanhBao: source.warningSigns || "Chưa cập nhật",
      huongXuTri: source.recommendation || source.treatment || "Chưa cập nhật",
      nguonThamKhao: source.reference || "Chưa cập nhật",
      luatSuyDien: rules
    };

    return {
      frameName: "Bệnh",
      frameType: "DISEASE",
      slots,
      source: source
    };
  }

  static normalizeDisease(disease, knowledgeBase = {}) {
    if (!disease) return disease;
    const normalized = {
      ...disease,
      recommendation: disease.recommendation || disease.treatment || "",
      treatment: disease.treatment || disease.recommendation || ""
    };
    normalized.frame = disease.frame || DiseaseFrame.fromDisease(normalized, knowledgeBase);
    return normalized;
  }
}

if (typeof window !== "undefined") {
  window.DiseaseFrame = DiseaseFrame;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DiseaseFrame;
}
