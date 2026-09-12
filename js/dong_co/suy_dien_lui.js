/**
 * ĐỘNG CƠ SUY DIỄN LÙI (BACKWARD CHAINING INFERENCE ENGINE)
 * Lập luận hướng mục tiêu (Goal-driven) & sinh câu hỏi khu biệt (WHY Inquiry)
 */

class BackwardChainingEngine {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
  }

  setKnowledgeBase(kb) {
    this.kb = kb;
  }

  evaluateHypothesis(targetDiseaseId, currentFacts) {
    const disease = (this.kb.diseases || []).find(d => d.id === targetDiseaseId);
    if (!disease) return null;

    const relatedRules = (this.kb.rules || []).filter(r => r.conclusion === targetDiseaseId);
    const missingSymptomsMap = new Map();
    const candidateRulesInfo = [];

    let highestSatisfiedCF = 0;

    for (const rule of relatedRules) {
      const knownPremises = [];
      const missingPremises = [];

      for (const pId of (rule.premises || [])) {
        if (currentFacts[pId] !== undefined && currentFacts[pId] > 0) {
          knownPremises.push({ id: pId, cf: currentFacts[pId] });
        } else {
          missingPremises.push(pId);
        }
      }

      const isFullySatisfied = missingPremises.length === 0 && (rule.premises || []).length > 0;
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

      for (const mId of missingPremises) {
        if (!missingSymptomsMap.has(mId)) {
          const symptom = (this.kb.symptoms || []).find(s => s.id === mId);
          if (symptom) {
            missingSymptomsMap.set(mId, {
              symptom,
              rule,
              knownCount: knownPremises.length,
              totalCount: (rule.premises || []).length,
              whyReason: `Hệ thống cần kiểm tra triệu chứng "${symptom.name}" vì đây là điều kiện tiền đề trong luật [${rule.id}]: "${rule.name}" để xác nhận bệnh "${disease.name}".`
            });
          }
        }
      }
    }

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
