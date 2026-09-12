/**
 * ĐỘNG CƠ TÍNH TOÁN HỆ SỐ TIN CẬY (CERTAINTY FACTOR - MYCIN)
 * Quản lý các phép toán hội (AND), tuyển (OR), đánh giá luật và kết hợp bằng chứng
 */

const CertaintyFactorEngine = {
  // Phép hội (AND) các tiền đề: CF = min(CF1, CF2, ...)
  and(cfList) {
    if (!cfList || cfList.length === 0) return 0;
    return Math.min(...cfList);
  },

  // Phép tuyển (OR) các tiền đề: CF = max(CF1, CF2, ...)
  or(cfList) {
    if (!cfList || cfList.length === 0) return 0;
    return Math.max(...cfList);
  },

  // Đánh giá luật kích hoạt: CF(Rule) = CF(Premise) * CF(Rule_Base)
  evaluateRule(premiseCF, ruleWeight) {
    if (premiseCF <= 0) return 0;
    return Number((premiseCF * ruleWeight).toFixed(4));
  },

  // Kết hợp 2 nguồn bằng chứng cùng suy ra một kết luận (Hàm kết hợp MYCIN)
  combine(cf1, cf2) {
    let result = 0;
    if (cf1 >= 0 && cf2 >= 0) {
      result = cf1 + cf2 - (cf1 * cf2);
    } else if (cf1 < 0 && cf2 < 0) {
      result = cf1 + cf2 + (cf1 * cf2);
    } else {
      const minAbs = Math.min(Math.abs(cf1), Math.abs(cf2));
      if (minAbs === 1) {
        result = 1;
      } else {
        result = (cf1 + cf2) / (1 - minAbs);
      }
    }
    return Number(Math.max(-1, Math.min(1, result)).toFixed(4));
  },

  // Kết hợp danh sách nhiều luật
  combineMultiple(cfList) {
    if (!cfList || cfList.length === 0) return 0;
    let accumulatedCF = cfList[0];
    for (let i = 1; i < cfList.length; i++) {
      accumulatedCF = this.combine(accumulatedCF, cfList[i]);
    }
    return accumulatedCF;
  },

  // Diễn giải ngôn ngữ học mức độ tin cậy
  interpret(cf) {
    const percentage = Math.round(cf * 100);
    if (cf >= 0.90) {
      return { label: "Gần như chắc chắn", badgeClass: "badge-critical", percentage };
    }
    if (cf >= 0.75) {
      return { label: "Khả năng rất cao", badgeClass: "badge-high", percentage };
    }
    if (cf >= 0.50) {
      return { label: "Khả năng cao", badgeClass: "badge-medium", percentage };
    }
    if (cf >= 0.30) {
      return { label: "Có khả năng", badgeClass: "badge-low", percentage };
    }
    return { label: "Ít có khả năng", badgeClass: "badge-none", percentage };
  }
};

if (typeof window !== "undefined") {
  window.CertaintyFactorEngine = CertaintyFactorEngine;
}
