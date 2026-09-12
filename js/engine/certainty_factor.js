/**
 * MODULE XỬ LÝ ĐỘ TIN CẬY (CERTAINTY FACTOR - CF)
 * Dựa trên mô hình toán học của hệ chuyên gia y tế MYCIN (Shortliffe & Buchanan)
 */

const CertaintyFactorEngine = {
  /**
   * Tính CF của vế tiền đề khi kết hợp phép VÀ (AND): min(CF_1, CF_2, ...)
   * @param {number[]} cfList Danh sách các hệ số CF của từng sự kiện tiền đề
   * @returns {number}
   */
  and(cfList) {
    if (!cfList || cfList.length === 0) return 0;
    return Math.min(...cfList);
  },

  /**
   * Tính CF của vế tiền đề khi kết hợp phép HOẶC (OR): max(CF_1, CF_2, ...)
   * @param {number[]} cfList Danh sách các hệ số CF
   * @returns {number}
   */
  or(cfList) {
    if (!cfList || cfList.length === 0) return 0;
    return Math.max(...cfList);
  },

  /**
   * Tính CF của một luật đơn: CF(Rule) = CF(Premise) * CF(Rule_Weight)
   * Chỉ kích hoạt nếu CF(Premise) > 0 (người dùng có triệu chứng)
   * @param {number} premiseCF Hệ số CF của vế tiền đề
   * @param {number} ruleWeight Trọng số độ tin cậy của luật do chuyên gia đặt
   * @returns {number}
   */
  evaluateRule(premiseCF, ruleWeight) {
    if (premiseCF <= 0) return 0;
    return Number((premiseCF * ruleWeight).toFixed(4));
  },

  /**
   * Kết hợp 2 nguồn bằng chứng độc lập cùng dẫn tới một kết luận (MYCIN Combination Function)
   * @param {number} cf1 Hệ số CF tích lũy hiện tại [-1, 1]
   * @param {number} cf2 Hệ số CF của luật mới kích hoạt [-1, 1]
   * @returns {number}
   */
  combine(cf1, cf2) {
    let result = 0;
    if (cf1 >= 0 && cf2 >= 0) {
      result = cf1 + cf2 - (cf1 * cf2);
    } else if (cf1 < 0 && cf2 < 0) {
      result = cf1 + cf2 + (cf1 * cf2);
    } else {
      const minAbs = Math.min(Math.abs(cf1), Math.abs(cf2));
      if (minAbs === 1) {
        result = 1; // Tránh chia cho 0
      } else {
        result = (cf1 + cf2) / (1 - minAbs);
      }
    }
    return Number(Math.max(-1, Math.min(1, result)).toFixed(4));
  },

  /**
   * Kết hợp một mảng nhiều hệ số CF của các luật cùng suy ra 1 bệnh
   * @param {number[]} cfList Mảng các hệ số CF của các luật
   * @returns {number}
   */
  combineMultiple(cfList) {
    if (!cfList || cfList.length === 0) return 0;
    let accumulatedCF = cfList[0];
    for (let i = 1; i < cfList.length; i++) {
      accumulatedCF = this.combine(accumulatedCF, cfList[i]);
    }
    return accumulatedCF;
  },

  /**
   * Chuyển đổi giá trị số CF sang nhãn ngôn ngữ tự nhiên (Linguistic Interpretation)
   * @param {number} cf Giá trị CF trong khoảng [0, 1]
   * @returns {{ label: string, badgeClass: string, percentage: number }}
   */
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
