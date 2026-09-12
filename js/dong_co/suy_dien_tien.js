/**
 * ĐỘNG CƠ SUY DIỄN TIẾN (FORWARD CHAINING INFERENCE ENGINE)
 * Lập luận dựa trên sự kiện ban đầu (Data-driven) và ghi nhật ký vết suy luận
 */

class ForwardChainingEngine {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
  }

  setKnowledgeBase(kb) {
    this.kb = kb;
  }

  infer(facts) {
    const workingMemory = { ...facts };
    const firedRules = [];
    const traceLogs = [];
    const diseaseRuleMatches = {};

    traceLogs.push({
      step: 1,
      type: "START",
      message: "Khởi tạo Bộ nhớ làm việc (Working Memory) với tập triệu chứng ban đầu",
      data: Object.entries(workingMemory).map(([id, cf]) => {
        const sym = (this.kb.symptoms || []).find(s => s.id === id);
        return { id, name: sym ? sym.name : id, cf };
      })
    });

    let ruleActivatedInCycle = true;
    let cycleCount = 0;
    const evaluatedRules = new Set();

    while (ruleActivatedInCycle) {
      cycleCount++;
      ruleActivatedInCycle = false;

      traceLogs.push({
        step: traceLogs.length + 1,
        type: "CYCLE_START",
        message: `Bắt đầu chu kỳ suy diễn số ${cycleCount}: Quét tập luật sinh...`
      });

      for (const rule of (this.kb.rules || [])) {
        if (evaluatedRules.has(rule.id)) continue;

        const premiseCFs = [];
        let allPremisesPresent = true;
        const missingPremises = [];

        for (const premiseId of (rule.premises || [])) {
          if (workingMemory[premiseId] !== undefined && workingMemory[premiseId] > 0) {
            premiseCFs.push(workingMemory[premiseId]);
          } else {
            allPremisesPresent = false;
            missingPremises.push(premiseId);
          }
        }

        if (allPremisesPresent && (rule.premises || []).length > 0) {
          evaluatedRules.add(rule.id);
          ruleActivatedInCycle = true;

          const premiseCF = window.CertaintyFactorEngine.and(premiseCFs);
          const ruleOutputCF = window.CertaintyFactorEngine.evaluateRule(premiseCF, rule.cf);

          const disease = (this.kb.diseases || []).find(d => d.id === rule.conclusion);
          const diseaseName = disease ? disease.name : rule.conclusion;

          const firedInfo = {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleDescription: rule.description,
            premises: rule.premises,
            premiseDetails: rule.premises.map((pId, idx) => ({
              id: pId,
              name: ((this.kb.symptoms || []).find(s => s.id === pId) || {}).name || pId,
              userCF: premiseCFs[idx]
            })),
            premiseCF,
            ruleBaseCF: rule.cf,
            outputCF: ruleOutputCF,
            conclusion: rule.conclusion,
            diseaseName,
            formulaStr: `CF(${rule.id}) = min(${premiseCFs.join(", ")}) × ${rule.cf} = ${premiseCF} × ${rule.cf} = ${ruleOutputCF}`
          };

          firedRules.push(firedInfo);

          if (!diseaseRuleMatches[rule.conclusion]) {
            diseaseRuleMatches[rule.conclusion] = [];
          }
          diseaseRuleMatches[rule.conclusion].push(firedInfo);

          traceLogs.push({
            step: traceLogs.length + 1,
            type: "RULE_FIRED",
            ruleId: rule.id,
            message: `KÍCH HOẠT THÀNH CÔNG [${rule.id}]: "${rule.name}"`,
            details: firedInfo
          });
        } else {
          traceLogs.push({
            step: traceLogs.length + 1,
            type: "RULE_SKIPPED",
            ruleId: rule.id,
            message: `Bỏ qua [${rule.id}]: Thiếu ${missingPremises.length} triệu chứng tiền đề`,
            missing: missingPremises.map(id => {
              const sym = (this.kb.symptoms || []).find(s => s.id === id);
              return { id, name: sym ? sym.name : id };
            })
          });
        }
      }
    }

    const results = [];

    for (const diseaseId in diseaseRuleMatches) {
      const matchRules = diseaseRuleMatches[diseaseId];
      const disease = (this.kb.diseases || []).find(d => d.id === diseaseId);
      const cfList = matchRules.map(r => r.outputCF);

      let finalCF = 0;
      let combinationSteps = [];

      if (cfList.length === 1) {
        finalCF = cfList[0];
        combinationSteps.push({
          step: 1,
          desc: `Chỉ có 1 luật [${matchRules[0].ruleId}] kích hoạt`,
          cf: finalCF
        });
      } else {
        let currentCF = cfList[0];
        combinationSteps.push({
          step: 1,
          desc: `Khởi tạo từ [${matchRules[0].ruleId}]: CF = ${currentCF}`,
          cf: currentCF
        });

        for (let i = 1; i < matchRules.length; i++) {
          const nextCF = cfList[i];
          const combined = window.CertaintyFactorEngine.combine(currentCF, nextCF);
          combinationSteps.push({
            step: i + 1,
            desc: `Kết hợp với [${matchRules[i].ruleId}] (CF = ${nextCF}): ${currentCF} + ${nextCF} - (${currentCF} × ${nextCF}) = ${combined}`,
            cf: combined
          });
          currentCF = combined;
        }
        finalCF = currentCF;
      }

      results.push({
        disease,
        diseaseId,
        diseaseName: disease ? disease.name : diseaseId,
        finalCF,
        interpretation: window.CertaintyFactorEngine.interpret(finalCF),
        firedRules: matchRules,
        combinationSteps
      });
    }

    results.sort((a, b) => b.finalCF - a.finalCF);

    traceLogs.push({
      step: traceLogs.length + 1,
      type: "FINISH",
      message: `Hoàn tất suy diễn tiến. Đã kích hoạt ${firedRules.length} luật, xác định được ${results.length} bệnh nghi vấn.`,
      topResult: results.length > 0 ? results[0] : null
    });

    return {
      results,
      firedRules,
      traceLogs,
      workingMemory
    };
  }
}

if (typeof window !== "undefined") {
  window.ForwardChainingEngine = ForwardChainingEngine;
}
