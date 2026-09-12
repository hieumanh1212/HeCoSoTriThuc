/**
 * MODULE ĐỘNG CƠ SUY DIỄN LÙI (BACKWARD CHAINING INFERENCE ENGINE)
 * Cơ chế: Mục tiêu dẫn dắt (Goal-driven).
 * Nhận diện bệnh nghi vấn -> Truy ngược cây luật -> Tìm triệu chứng còn thiếu -> Đặt câu hỏi có giải thích (WHY)
 */

class BackwardChainingEngine {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
  }

  setKnowledgeBase(kb) {
    this.kb = kb;
  }

  /**
   * Phân tích một bệnh mục tiêu (Target Disease) xem cần thêm triệu chứng nào để khẳng định
   * @param {string} targetDiseaseId Mã bệnh cần chứng minh (ví dụ: 'D01')
   * @param {Object.<string, number>} currentFacts Map { symptomId: userCF } các triệu chứng đã biết
   * @returns {{
   *    targetDisease: Object,
   *    candidateRules: Array<Object>,
   *    missingSymptoms: Array<{ symptom: Object, rule: Object, potentialCFGain: number, whyReason: string }>,
   *    status: 'CONFIRMED' | 'REFUTED' | 'NEED_MORE_DATA',
   *    bestNextQuestion: Object | null
   * }}
   */
  evaluateHypothesis(targetDiseaseId, currentFacts) {
    const disease = this.kb.diseases.find(d => d.id === targetDiseaseId);
    if (!disease) return null;

    // Tìm tất cả các luật dẫn đến bệnh này
    const relatedRules = this.kb.rules.filter(r => r.conclusion === targetDiseaseId);
    const missingSymptomsMap = new Map();
    const candidateRulesInfo = [];

    let highestSatisfiedCF = 0;

    for (const rule of relatedRules) {
      const knownPremises = [];
      const missingPremises = [];

      for (const pId of rule.premises) {
        if (currentFacts[pId] !== undefined && currentFacts[pId] > 0) {
          knownPremises.push({ id: pId, cf: currentFacts[pId] });
        } else {
          missingPremises.push(pId);
        }
      }

      const isFullySatisfied = missingPremises.length === 0;
      let calculatedCF = 0;

      if (isFullySatisfied) {
        const minCF = window.CertaintyFactorEngine.and(knownPremises.map(p => p.cf));
        calculatedCF = window.CertaintyFactorEngine.evaluateRule(minCF, rule.cf);
        highestSatisfiedCF = Math.max(highestSatisfiedCF, calculatedCF);
      }

      candidateRulesInfo.push({
        rule,
        knownPremises,
        missingPremises,
        isFullySatisfied,
        calculatedCF
      });

      // Nếu luật chưa thỏa hoàn toàn nhưng đã có ít nhất 1 triệu chứng đúng, ưu tiên hỏi tiếp các triệu chứng còn lại của luật đó
      for (const mId of missingPremises) {
        if (!missingSymptomsMap.has(mId)) {
          const symptom = this.kb.symptoms.find(s => s.id === mId);
          if (symptom) {
            missingSymptomsMap.set(mId, {
              symptom,
              rule,
              knownCount: knownPremises.length,
              totalCount: rule.premises.length,
              whyReason: `Hệ thống cần kiểm tra triệu chứng "${symptom.name}" vì đây là điều kiện tiền đề trong luật [${rule.id}]: "${rule.name}" để xác nhận bệnh "${disease.name}".`
            });
          }
        }
      }
    }

    // Chuyển map sang danh sách và sắp xếp theo độ ưu tiên (ưu tiên triệu chứng thuộc luật đã có nhiều sự kiện biết trước nhất)
    const missingSymptomsList = Array.from(missingSymptomsMap.values()).sort(
      (a, b) => b.knownCount - a.knownCount
    );

    let status = "NEED_MORE_DATA";
    if (highestSatisfiedCF >= 0.85) {
      status = "CONFIRMED";
    } else if (missingSymptomsList.length === 0 && highestSatisfiedCF === 0) {
      status = "REFUTED";
    }

    const bestNextQuestion = missingSymptomsList.length > 0 ? missingSymptomsList[0] : null;

    return {
      targetDisease: disease,
      targetDiseaseId,
      candidateRules: candidateRulesInfo,
      missingSymptoms: missingSymptomsList,
      status,
      currentCF: highestSatisfiedCF,
      bestNextQuestion
    };
  }

  /**
   * Tự động đề xuất câu hỏi phân biệt tốt nhất khi có nhiều bệnh cạnh tranh
   * @param {Array<string>} topDiseaseIds Danh sách mã bệnh cần phân biệt
   * @param {Object.<string, number>} currentFacts Tập sự kiện hiện có
   */
  getDiscriminativeQuestion(topDiseaseIds, currentFacts) {
    for (const diseaseId of topDiseaseIds) {
      const evaluation = this.evaluateHypothesis(diseaseId, currentFacts);
      if (evaluation && evaluation.bestNextQuestion) {
        return evaluation.bestNextQuestion;
      }
    }
    return null;
  }
}

if (typeof window !== "undefined") {
  window.BackwardChainingEngine = BackwardChainingEngine;
}
