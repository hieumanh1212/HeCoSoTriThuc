/**
 * ĐỘNG CƠ SUY DIỄN TIẾN (FORWARD CHAINING INFERENCE ENGINE)
 * Lập luận dựa trên sự kiện ban đầu (Data-driven), hỗ trợ suy diễn đa tầng
 * (Multi-step Chaining: Tiền đề -> Hội chứng trung gian -> Bệnh đích)
 * Đảm bảo nguyên tắc Cognitive Complexity < 10 của SonarQube.
 */

class ForwardChainingEngine {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
  }

  setKnowledgeBase(kb) {
    this.kb = kb;
  }

  _evaluatePremises(rule, workingMemory) {
    const premises = rule.premises || [];
    if (premises.length === 0) {
      return { satisfied: false, premiseCFs: [], missing: [] };
    }

    const premiseCFs = [];
    const missing = [];

    for (const pId of premises) {
      const val = workingMemory[pId];
      if (val !== undefined && val > 0) {
        premiseCFs.push(val);
      } else {
        missing.push(pId);
      }
    }

    return {
      satisfied: missing.length === 0,
      premiseCFs,
      missing
    };
  }

  _getConclusionMeta(conclusionId) {
    const disease = (this.kb.diseases || []).find(d => d.id === conclusionId);
    if (disease) {
      return { id: conclusionId, name: disease.name, isDisease: true, item: disease };
    }
    const sym = (this.kb.symptoms || []).find(s => s.id === conclusionId);
    return {
      id: conclusionId,
      name: sym ? sym.name : conclusionId,
      isDisease: false,
      item: sym
    };
  }

  _updateWorkingMemory(workingMemory, conclusionId, outputCF) {
    if (workingMemory[conclusionId] !== undefined) {
      workingMemory[conclusionId] = window.CertaintyFactorEngine.combine(
        workingMemory[conclusionId],
        outputCF
      );
    } else {
      workingMemory[conclusionId] = outputCF;
    }
    return workingMemory[conclusionId];
  }

  _buildFiredInfo(rule, premiseCF, premiseCFs, outputCF, cycleCount) {
    const meta = this._getConclusionMeta(rule.conclusion);
    const premiseDetails = (rule.premises || []).map((pId, idx) => {
      const sym = (this.kb.symptoms || []).find(s => s.id === pId) || {};
      return {
        id: pId,
        name: sym.name || pId,
        userCF: premiseCFs[idx]
      };
    });

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleDescription: rule.description,
      premises: rule.premises,
      premiseDetails,
      premiseCF,
      ruleBaseCF: rule.cf,
      outputCF,
      conclusion: rule.conclusion,
      conclusionName: meta.name,
      isDisease: meta.isDisease,
      cycle: cycleCount,
      formulaStr: `CF(${rule.id}) = min(${premiseCFs.join(", ")}) × ${rule.cf} = ${premiseCF} × ${rule.cf} = ${outputCF}`
    };
  }

  _evaluateRule(rule, workingMemory, cycleCount, context) {
    const { evaluatedRules, firedRules, diseaseMatches, intermediateMatches, traceLogs } = context;
    const { satisfied, premiseCFs, missing } = this._evaluatePremises(rule, workingMemory);

    if (!satisfied) {
      traceLogs.push({
        step: traceLogs.length + 1,
        type: "RULE_SKIPPED",
        ruleId: rule.id,
        cycle: cycleCount,
        message: `Bỏ qua [${rule.id}]: Thiếu ${missing.length} tiền đề`,
        missing: missing.map(id => {
          const sym = (this.kb.symptoms || []).find(s => s.id === id);
          return { id, name: sym ? sym.name : id };
        })
      });
      return false;
    }

    evaluatedRules.add(rule.id);
    const premiseCF = window.CertaintyFactorEngine.and(premiseCFs);
    const outputCF = window.CertaintyFactorEngine.evaluateRule(premiseCF, rule.cf);

    this._updateWorkingMemory(workingMemory, rule.conclusion, outputCF);
    const firedInfo = this._buildFiredInfo(rule, premiseCF, premiseCFs, outputCF, cycleCount);

    firedRules.push(firedInfo);
    const targetMap = firedInfo.isDisease ? diseaseMatches : intermediateMatches;
    if (!targetMap[rule.conclusion]) {
      targetMap[rule.conclusion] = [];
    }
    targetMap[rule.conclusion].push(firedInfo);

    traceLogs.push({
      step: traceLogs.length + 1,
      type: "RULE_FIRED",
      ruleId: rule.id,
      cycle: cycleCount,
      message: `Chu kỳ ${cycleCount} - KÍCH HOẠT [${rule.id}]: "${rule.name}" -> ${firedInfo.conclusionName} (CF = ${outputCF})`,
      details: firedInfo
    });

    return true;
  }

  _runCycle(rules, workingMemory, evaluatedRules, cycleCount, context) {
    let activated = false;
    for (const rule of rules) {
      if (evaluatedRules.has(rule.id)) continue;
      const fired = this._evaluateRule(rule, workingMemory, cycleCount, context);
      if (fired) {
        activated = true;
      }
    }
    return activated;
  }

  _combineDiseaseGroup(diseaseId, matchRules) {
    const disease = (this.kb.diseases || []).find(d => d.id === diseaseId);
    const cfList = matchRules.map(r => r.outputCF);
    const combinationSteps = [];

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

    return {
      disease,
      diseaseId,
      diseaseName: disease ? disease.name : diseaseId,
      finalCF: currentCF,
      interpretation: window.CertaintyFactorEngine.interpret(currentCF),
      firedRules: matchRules,
      combinationSteps
    };
  }

  _combineIntermediateGroup(factId, matchRules) {
    const sym = (this.kb.symptoms || []).find(s => s.id === factId);
    const cfList = matchRules.map(r => r.outputCF);
    const finalCF = window.CertaintyFactorEngine.combineMultiple(cfList);

    return {
      id: factId,
      name: sym ? sym.name : factId,
      finalCF,
      interpretation: window.CertaintyFactorEngine.interpret(finalCF),
      firedRules: matchRules,
      cycles: [...new Set(matchRules.map(r => r.cycle))]
    };
  }

  infer(facts) {
    const workingMemory = { ...facts };
    const firedRules = [];
    const traceLogs = [];
    const diseaseMatches = {};
    const intermediateMatches = {};
    const evaluatedRules = new Set();

    traceLogs.push({
      step: 1,
      type: "START",
      message: "Khởi tạo Bộ nhớ làm việc (Working Memory) với tập sự kiện ban đầu",
      data: Object.entries(workingMemory).map(([id, cf]) => {
        const sym = (this.kb.symptoms || []).find(s => s.id === id);
        return { id, name: sym ? sym.name : id, cf };
      })
    });

    let ruleActivated = true;
    let cycleCount = 0;
    const context = { evaluatedRules, firedRules, diseaseMatches, intermediateMatches, traceLogs };

    while (ruleActivated && cycleCount < 10) {
      cycleCount++;
      traceLogs.push({
        step: traceLogs.length + 1,
        type: "CYCLE_START",
        cycle: cycleCount,
        message: `Bắt đầu chu kỳ suy diễn số ${cycleCount}: Quét tập luật sinh...`
      });

      ruleActivated = this._runCycle(this.kb.rules || [], workingMemory, evaluatedRules, cycleCount, context);
    }

    const results = Object.keys(diseaseMatches)
      .map(dId => this._combineDiseaseGroup(dId, diseaseMatches[dId]))
      .sort((a, b) => b.finalCF - a.finalCF);

    const intermediateResults = Object.keys(intermediateMatches)
      .map(fId => this._combineIntermediateGroup(fId, intermediateMatches[fId]))
      .sort((a, b) => b.finalCF - a.finalCF);

    traceLogs.push({
      step: traceLogs.length + 1,
      type: "FINISH",
      cycleCount,
      message: `Hoàn tất suy diễn tiến qua ${cycleCount} chu kỳ. Kích hoạt ${firedRules.length} luật, xác định ${intermediateResults.length} hội chứng trung gian và ${results.length} bệnh đích.`,
      topResult: results.length > 0 ? results[0] : null
    });

    return {
      results,
      intermediateResults,
      firedRules,
      traceLogs,
      workingMemory,
      totalCycles: cycleCount
    };
  }
}

if (typeof window !== "undefined") {
  window.ForwardChainingEngine = ForwardChainingEngine;
}
