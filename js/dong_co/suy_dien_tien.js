/**
 * ĐỘNG CƠ SUY DIỄN TIẾN (FORWARD CHAINING INFERENCE ENGINE)
 * Chuẩn hóa lý thuyết theo tài liệu bài giảng: "Mô tơ suy diễn" - TS. Nguyễn Quốc Tuấn (Bm. Mạng & Các HTTT)
 * 
 * I. MÔ HÌNH TOÁN HỌC SUY DIỄN TIẾN (Slide 3 & 8)
 * - Input:
 *     + GT = {f1, f2, ..., fn}: Tập các giả thiết (sự kiện ban đầu)
 *     + R = {r1, r2, ..., rm}: Tập các luật Horn (ri: left_i -> qi)
 *     + KL = {q1, q2, ..., qk}: Tập các kết luận cần chứng minh / tìm kiếm
 * - Biến trạng thái:
 *     + TG: Tập sự kiện đã biết (Working Memory), khởi tạo TG = GT
 *     + VET: Vết suy diễn (danh sách luật đã kích hoạt theo thứ tự), khởi tạo VET = ∅
 *     + THOA: Tập các luật thỏa mãn điều kiện tiền đề: THOA = LOC(TG, R) = { ri ∈ R | left_i ⊆ TG }
 * - Vòng lặp suy diễn:
 *     while (THOA ≠ ∅) and (KL ⊄ TG) do
 *     {
 *         r <- get(THOA);              // Chọn 1 luật từ THOA theo chiến lược giải quyết xung đột 
 *         VET = VET ∪ {r};
 *         R = R \ {r};
 *         TG = TG ∪ {q};
 *         THOA = LOC(TG, R);
 *     }
 * - Output:
 *     if (KL ⊆ TG) exit("Đúng");
 *     else exit("Sai");
 * 
 * II. CÁC CHIẾN LƯỢC GIẢI QUYẾT XUNG ĐỘT KHI #THOA >= 2 (Slide 16 & 17)
 * 1. Queue (Hàng đợi - FIFO): Luật đưa vào THOA trước được chọn trước (Slide 10, 16)
 * 2. Stack (Ngăn xếp - LIFO): Luật đưa vào THOA sau được chọn trước (Slide 9, 16)
 * 3. csmin (Chỉ số nhỏ nhất): Luật có chỉ số/mã định danh nhỏ nhất được chọn (Slide 16, 17)
 * 4. csmax (Chỉ số lớn nhất): Luật có chỉ số/mã định danh lớn nhất được chọn (Slide 16, 17)
 * 5. Heuristics (FPG, RPG, hàm lượng giá): h^(r) -> min, kết hợp tie-break csmin (Slide 17, 18, 22)
 * 
 * III. TÍNH KẾ THỪA & MỞ RỘNG
 * - Lớp cơ sở ForwardChainingEngine cung cấp khung giải thuật chuẩn (Template Method / Strategy).
 * - Các lớp con FPGForwardChainingEngine và RPGForwardChainingEngine ghi đè hàm lượng giá calculateHeuristic.
 * - Hỗ trợ tương thích ngược đầy đủ phương thức infer(facts) tính hệ số tin cậy CF cho module chẩn đoán lâm sàng.
 */

class ForwardChainingEngine {
  constructor(knowledgeBase = {}, options = {}) {
    this.kb = knowledgeBase;
    this.options = {
      conflictStrategy: "heuristic", // 'heuristic' | 'csmin' | 'csmax' | 'queue' | 'stack'
      maxCycles: 100,
      ...options
    };
  }

  setKnowledgeBase(kb) {
    this.kb = kb || {};
  }

  // =========================================================================
  // 1. CÁC HÀM CƠ SỞ THEO LÝ THUYẾT GIẢI THUẬT SUY DIỄN TIẾN (SLIDE 8)
  // =========================================================================

  /**
   * Hàm lọc tập luật thỏa mãn tiền đề: THOA = LOC(TG, R) (Slide 8)
   * Tìm các luật ri: p1 ∧ p2 ∧ ... ∧ pn -> q mà left_i = {p1, p2, ..., pn} ⊆ TG
   * @param {Set<string>} tgSet - Tập sự kiện hiện tại
   * @param {Array<Object>} rules - Tập luật cần xét R
   * @returns {Array<Object>} Tập các luật thỏa mãn
   */
  loc(tgSet, rules) {
    if (!rules || !Array.isArray(rules)) return [];
    return rules.filter(r => {
      const premises = r.premises || r.left || [];
      if (premises.length === 0) return false;
      return premises.every(p => tgSet.has(p));
    });
  }

  /**
   * Kiểm tra điều kiện dừng: KL ⊆ TG (Slide 8)
   * @param {Set<string>} tgSet - Tập sự kiện đã biết
   * @param {Set<string>} klSet - Tập kết luận mục tiêu
   * @returns {boolean}
   */
  isGoalReached(tgSet, klSet) {
    if (!klSet || klSet.size === 0) return false;
    for (const k of klSet) {
      if (!tgSet.has(k)) return false;
    }
    return true;
  }

  /**
   * Hàm lượng giá Heuristic h^(r) đối với luật r (Slide 17, 18, 22)
   * Mặc định trả về null. Các lớp con kế thừa (FPG, RPG) sẽ ghi đè phương thức này.
   * @param {Object} rule - Luật cần lượng giá
   * @param {Object} context - Ngữ cảnh (KL, TG, R, graph, ...)
   * @returns {number|null} Giá trị hàm lượng giá (kc ngắn nhất tới KL)
   */
  calculateHeuristic(rule, context) {
    return null;
  }

  /**
   * Lượng giá toàn bộ tập luật thỏa mãn trong THOA (Slide 16 & 17)
   * @param {Array<Object>} thoa - Danh sách luật thỏa mãn
   * @param {Object} context - Ngữ cảnh
   * @returns {Array<Object>} Danh sách đối tượng lượng giá
   */
  evaluateConflictRules(thoa, context) {
    return (thoa || []).map(r => {
      const kc = this.calculateHeuristic(r, context);
      const klArr = context.klSet ? Array.from(context.klSet) : [];
      let formulaStr = `Luật [${r.id}]`;
      if (kc !== null && kc !== undefined) {
        formulaStr = `h^(${r.id}) = KC(${r.conclusion || r.id}, {${klArr.join(",")}}) = ${kc === Infinity ? "∞" : kc}`;
      }
      return {
        rule: r,
        ruleId: r.id,
        ruleName: r.name || r.id,
        conclusion: r.conclusion,
        kc,
        formulaStr
      };
    });
  }

  /**
   * Chọn luật tối ưu r <- get(THOA) khi xảy ra xung đột (#THOA >= 2) (Slide 16, 17)
   * @param {Array<Object>} thoa - Tập luật thỏa mãn
   * @param {Array<Object>} evaluations - Danh sách đánh giá
   * @param {Object} context - Ngữ cảnh
   * @returns {Object} Đối tượng đánh giá của luật được chọn { rule, ruleId, ... }
   */
  selectConflictRule(thoa, evaluations, context) {
    if (!evaluations || evaluations.length === 0) return null;
    const strategy = context.strategy || this.options.conflictStrategy || "heuristic";

    // 1. Tập THOA là một hàng đợi (Queue - FIFO) (Slide 10, 16)
    if (strategy === "queue") {
      return evaluations[0];
    }

    // 2. Tập THOA là một ngăn xếp (Stack - LIFO) (Slide 9, 16)
    if (strategy === "stack") {
      return evaluations[evaluations.length - 1];
    }

    // 3. Chỉ số lớn nhất (csmax) (Slide 16, 17)
    if (strategy === "csmax") {
      const sorted = [...evaluations].sort((a, b) =>
        b.ruleId.localeCompare(a.ruleId, undefined, { numeric: true })
      );
      return sorted[0];
    }

    // 4. Chỉ số nhỏ nhất (csmin) (Slide 16, 17)
    if (strategy === "csmin") {
      const sorted = [...evaluations].sort((a, b) =>
        a.ruleId.localeCompare(b.ruleId, undefined, { numeric: true })
      );
      return sorted[0];
    }

    // 5. Kỹ thuật Heuristics (FPG / RPG): h^(r) -> min, kết hợp tie-break csmin (Slide 17, 18, 22)
    const sorted = [...evaluations].sort((a, b) => {
      const kcA = a.kc !== null && a.kc !== undefined ? a.kc : Infinity;
      const kcB = b.kc !== null && b.kc !== undefined ? b.kc : Infinity;
      if (kcA !== kcB) {
        return kcA - kcB;
      }
      return a.ruleId.localeCompare(b.ruleId, undefined, { numeric: true });
    });

    return sorted[0];
  }

  /**
   * GIẢI THUẬT SUY DIỄN TIẾN CHUẨN TỪNG BƯỚC (STANDARD FORWARD CHAINING)
   * Cài đặt chính xác 100% theo giải thuật tại Slide 8 bài giảng:
   * 
   * TG = GT; VET = ∅;
   * THOA = LOC(TG, R);
   * while (THOA ≠ ∅) and (KL ⊄ TG) do
   * {
   *     r <- get(THOA);
   *     VET = VET ∪ {r};
   *     R = R \ {r};
   *     TG = TG ∪ {q};
   *     THOA = LOC(TG, R);
   * }
   * if (KL ⊆ TG) exit("Đúng");
   * else exit("Sai");
   * 
   * @param {Array<string>|Set<string>} gtInput - Tập giả thiết GT
   * @param {Array<string>|Set<string>} klInput - Tập kết luận KL
   * @param {Object} options - Tùy chọn (rules, conflictStrategy, contextExtras, ...)
   * @returns {Object} Kết quả suy diễn: { success, status, steps, finalVET, finalTG, isGoalReached }
   */
  inferStandard(gtInput, klInput, options = {}) {
    const rawRules = options.rules || (this.kb && this.kb.rules) || [];
    let R = [...rawRules];

    const gtArray = Array.isArray(gtInput)
      ? gtInput
      : (gtInput instanceof Set ? Array.from(gtInput) : Object.keys(gtInput || {}));
    const klArray = Array.isArray(klInput)
      ? klInput
      : (klInput instanceof Set ? Array.from(klInput) : (klInput ? [klInput] : []));

    const TG = new Set(gtArray);
    const KL = new Set(klArray);
    const VET = [];
    const steps = [];

    const strategy = options.conflictStrategy || this.options.conflictStrategy || "heuristic";
    const maxCycles = options.maxCycles || this.options.maxCycles || 100;

    let THOA = this.loc(TG, R);
    let cycle = 0;

    // Ngữ cảnh dùng để đánh giá và giải quyết xung đột
    const context = {
      gtSet: TG,
      klSet: KL,
      strategy,
      options,
      ...options.contextExtras
    };

    // Chu kỳ 0: Khởi tạo (KT) - Slide 9, 10, 20
    const initEvals = this.evaluateConflictRules(THOA, context);
    steps.push({
      cycle: 0,
      stepName: "Khởi tạo (KT)",
      TG: Array.from(TG),
      R: R.map(r => r.id),
      THOA: THOA.map(r => r.id),
      VET: [...VET],
      evaluations: initEvals,
      selectedRule: null,
      selectedRuleObj: null,
      chosenBest: null,
      isGoalReached: this.isGoalReached(TG, KL),
      message: `Khởi tạo: Nạp ${TG.size} giả thiết vào TG, VET = ∅, THOA = {${THOA.map(r => r.id).join(", ")}}`
    });

    // Vòng lặp chính: while (THOA ≠ ∅) and (KL ⊄ TG) do
    while (THOA.length > 0 && !this.isGoalReached(TG, KL) && cycle < maxCycles) {
      cycle++;

      const evaluations = this.evaluateConflictRules(THOA, context);
      const chosen = this.selectConflictRule(THOA, evaluations, context);
      if (!chosen || !chosen.rule) break;

      const chosenRule = chosen.rule;

      // Cập nhật các tập hợp trạng thái theo Slide 8
      VET.push(chosenRule.id);
      R = R.filter(r => r.id !== chosenRule.id);
      if (chosenRule.conclusion) {
        TG.add(chosenRule.conclusion);
      }
      THOA = this.loc(TG, R);

      const isGoal = this.isGoalReached(TG, KL);

      steps.push({
        cycle,
        stepName: `Chu kỳ ${cycle}`,
        selectedRule: chosenRule.id,
        selectedRuleObj: chosenRule,
        evaluations,
        chosenBest: chosen,
        TG: Array.from(TG),
        R: R.map(r => r.id),
        THOA: THOA.map(r => r.id),
        VET: [...VET],
        isGoalReached: isGoal,
        message: `Kích hoạt [${chosenRule.id}]: "${chosenRule.name || chosenRule.id}". Suy ra "${chosenRule.conclusion}". Cập nhật TG.`
      });
    }

    const success = this.isGoalReached(TG, KL);
    const status = success ? "Đúng" : "Sai"; // Slide 8: exit("Đúng") / exit("Sai")

    return {
      success,
      status,
      steps,
      finalVET: VET,
      finalTG: Array.from(TG),
      isGoalReached: success,
      totalCycles: cycle
    };
  }

  // =========================================================================
  // 2. PHÂN HỆ SUY DIỄN TIẾN TÍCH HỢP HỆ SỐ TIN CẬY (CERTAINTY FACTOR - MYCIN)
  // Phục vụ tương thích ngược 100% cho module Chẩn đoán Lâm sàng Y tế
  // =========================================================================

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
    if (typeof window !== "undefined" && window.CertaintyFactorEngine && window.CertaintyFactorEngine.combine) {
      if (workingMemory[conclusionId] !== undefined) {
        workingMemory[conclusionId] = window.CertaintyFactorEngine.combine(
          workingMemory[conclusionId],
          outputCF
        );
      } else {
        workingMemory[conclusionId] = outputCF;
      }
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

  _evaluateRule(rule, workingMemory, cycleCount, context, memorySnapshot) {
    const { evaluatedRules, firedRules, diseaseMatches, intermediateMatches, traceLogs } = context;
    const { satisfied, premiseCFs, missing } = this._evaluatePremises(rule, memorySnapshot || workingMemory);

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
    const cfEngine = typeof window !== "undefined" ? window.CertaintyFactorEngine : null;
    const premiseCF = cfEngine && cfEngine.and ? cfEngine.and(premiseCFs) : Math.min(...premiseCFs);
    const ruleCF = rule.cf !== undefined ? rule.cf : 1.0;
    const outputCF = cfEngine && cfEngine.evaluateRule ? cfEngine.evaluateRule(premiseCF, ruleCF) : premiseCF * ruleCF;

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
    const memorySnapshot = { ...workingMemory };
    for (const rule of rules) {
      if (evaluatedRules.has(rule.id)) continue;
      const fired = this._evaluateRule(rule, workingMemory, cycleCount, context, memorySnapshot);
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

    const cfEngine = typeof window !== "undefined" ? window.CertaintyFactorEngine : null;

    let currentCF = cfList[0];
    combinationSteps.push({
      step: 1,
      desc: `Khởi tạo từ [${matchRules[0].ruleId}]: CF = ${currentCF}`,
      cf: currentCF
    });

    for (let i = 1; i < matchRules.length; i++) {
      const nextCF = cfList[i];
      const combined = cfEngine && cfEngine.combine ? cfEngine.combine(currentCF, nextCF) : currentCF + nextCF - currentCF * nextCF;
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
      interpretation: cfEngine && cfEngine.interpret ? cfEngine.interpret(currentCF) : "",
      firedRules: matchRules,
      combinationSteps
    };
  }

  _combineIntermediateGroup(factId, matchRules) {
    const sym = (this.kb.symptoms || []).find(s => s.id === factId);
    const cfList = matchRules.map(r => r.outputCF);
    const cfEngine = typeof window !== "undefined" ? window.CertaintyFactorEngine : null;
    const finalCF = cfEngine && cfEngine.combineMultiple ? cfEngine.combineMultiple(cfList) : cfList[0];

    return {
      id: factId,
      name: sym ? sym.name : factId,
      finalCF,
      interpretation: cfEngine && cfEngine.interpret ? cfEngine.interpret(finalCF) : "",
      firedRules: matchRules,
      cycles: [...new Set(matchRules.map(r => r.cycle))]
    };
  }

  /**
   * Phương thức infer phục vụ module Chẩn đoán Lâm sàng Y tế
   * @param {Object} facts - Bảng triệu chứng { [symptomId]: number (CF: 0 - 1.0) }
   * @returns {Object} Kết quả chẩn đoán bệnh kèm CF
   */
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ForwardChainingEngine };
}
