/**
 * THUẬT TOÁN ĐỒ THỊ FPG & RPG CHO CƠ SỞ TRI THỨC Y TẾ (MED-EXPERT)
 * Chuẩn hóa lý thuyết theo tài liệu bài giảng: "Mô tơ suy diễn" - TS. Nguyễn Quốc Tuấn (Bm. Mạng & Các HTTT)
 * Áp dụng 100% vào bài toán Chẩn đoán Bệnh truyền nhiễm & Sốt cấp tính lâm sàng
 * 
 * 1. FPG (Facts Precedence Graph - Đồ thị liên hệ trước sự kiện)
 *    - Đỉnh: Các sự kiện y tế gồm Triệu chứng lâm sàng (S), Hội chứng trung gian (I), Bệnh kết luận (D)
 *    - Cung: f -> f' khi có luật y tế R chứa f ở vế trái và kết luận f' (mang nhãn luật R)
 *    - GT: Tập các triệu chứng bệnh nhân đang mắc phải (từ ca bệnh)
 *    - KL: Bệnh mục tiêu cần chẩn đoán
 *    - Hàm lượng giá suy diễn tiến: h^(R: left -> q) = KC_FPG(q, KL) -> min
 * 
 * 2. RPG (Rules Precedence Graph - Đồ thị liên hệ trước giữa các luật)
 *    - Đỉnh: Các luật chẩn đoán y tế R in R
 *    - Cung: R_i -> R_j khi kết luận của R_i (hội chứng trung gian) nằm trong tiền đề của R_j
 *    - Nhãn cung: mang tên hội chứng trung gian cầu nối
 *    - R_GT = { R: left -> q | left ⊆ GT } (Tập luật y tế thỏa mãn ngay từ triệu chứng ban đầu)
 *    - R_KL = { R: left -> q | q ⊆ KL } (Tập luật y tế dẫn tới bệnh kết luận mục tiêu)
 *    - Hàm lượng giá: h^(R: left -> q) = KC_RPG(R, R_KL) -> min
 */

// ============================================================================
// HỆ THỐNG DỮ LIỆU ĐỒ THỊ ĐỘNG (DYNAMIC KNOWLEDGE BASE RESOLUTION)
// Tuyệt đối không fix cứng dữ liệu đồ thị hoặc các ca bệnh kiểm thử mẫu.
// Đồ thị bắt buộc nhận dữ liệu sau khi đã trải qua suy diễn tại Chẩn Đoán.
// ============================================================================

/**
 * Lấy Cơ sở tri thức đang hoạt động từ KnowledgeBaseManager hoặc DEFAULT_KNOWLEDGE_BASE
 */
function getActiveKnowledgeBase(customKB = null) {
  if (customKB && customKB.rules && customKB.rules.length > 0) return customKB;
  if (typeof window !== "undefined") {
    if (window.knowledgeBaseManager && typeof window.knowledgeBaseManager.getKnowledgeBase === "function") {
      const active = window.knowledgeBaseManager.getKnowledgeBase();
      if (active && active.rules && active.rules.length > 0) return active;
    }
    if (window.DEFAULT_KNOWLEDGE_BASE) {
      return window.DEFAULT_KNOWLEDGE_BASE;
    }
  }
  if (typeof DEFAULT_KNOWLEDGE_BASE !== "undefined") {
    return DEFAULT_KNOWLEDGE_BASE;
  }
  return { symptoms: [], diseases: [], rules: [] };
}

/**
 * Xây dựng bản đồ các sự kiện y tế động (Triệu chứng, Hội chứng trung gian, Bệnh lý)
 */
function buildDynamicFactsMap(kb = null) {
  const activeKB = getActiveKnowledgeBase(kb);
  const facts = {};

  // 1. Danh mục triệu chứng & hội chứng trung gian từ activeKB.symptoms
  (activeKB.symptoms || []).forEach(s => {
    const isInter = s.id.startsWith("I") || s.id.startsWith("HC") || s.groupId === "group_syndrome";
    facts[s.id] = {
      id: s.id,
      name: s.name,
      type: isInter ? "INTERMEDIATE" : "SYMPTOM",
      color: s.color || null,
      description: s.description || s.question || ""
    };
  });

  // 2. Danh mục bệnh kết luận từ activeKB.diseases
  (activeKB.diseases || []).forEach(d => {
    facts[d.id] = {
      id: d.id,
      name: d.name,
      type: "DISEASE",
      color: d.color || "#ef4444",
      description: d.description || ""
    };
  });

  // 3. Quét tập luật activeKB.rules để bổ sung các sự kiện trung gian hoặc mã chưa khai báo
  (activeKB.rules || []).forEach(r => {
    (r.premises || []).forEach(p => {
      if (!facts[p]) {
        const isInter = p.startsWith("I") || p.startsWith("HC");
        const isDis = p.startsWith("D");
        facts[p] = {
          id: p,
          name: p,
          type: isDis ? "DISEASE" : (isInter ? "INTERMEDIATE" : "SYMPTOM")
        };
      }
    });
    if (r.conclusion && !facts[r.conclusion]) {
      const isDis = r.conclusion.startsWith("D");
      facts[r.conclusion] = {
        id: r.conclusion,
        name: r.conclusion,
        type: isDis ? "DISEASE" : "INTERMEDIATE",
        color: isDis ? "#ef4444" : null
      };
    }
  });

  return facts;
}

/**
 * Đối tượng trung gian cung cấp dữ liệu đồ thị động
 * Không lưu dữ liệu fix cứng hay ca bệnh test mẫu
 */
const MEDICAL_KB_GRAPH_DATA = {
  get facts() {
    return buildDynamicFactsMap();
  },
  get rules() {
    return getActiveKnowledgeBase().rules || [];
  },
  cases: [] // Hoàn toàn không fix cứng ca bệnh kiểm thử mẫu
};

/**
 * LỚP GIẢI THUẬT ĐỒ THỊ FPG VÀ RPG Y TẾ
 */
class MedicalGraphAlgorithms {
  /**
   * Lấy tập luật y tế lâm sàng tương ứng (từ ca bệnh hoặc từ KB động)
   */
  static getRulesForCase(selectedCase, customKB = null) {
    if (selectedCase && selectedCase.rules && selectedCase.rules.length > 0) {
      return selectedCase.rules;
    }
    return getActiveKnowledgeBase(customKB).rules || [];
  }

  /**
   * Xây dựng Đồ thị liên hệ trước sự kiện FPG (Slide 18 & 19 TS. Nguyễn Quốc Tuấn)
   * - Đỉnh: Các sự kiện gồm Giả thiết (GT), Trung gian, Kết luận (KL)
   * - Cung: p -> q mang nhãn luật r
   */
  static buildMedicalFPG(selectedCase) {
    if (!selectedCase) {
      return { nodes: [], edges: [], gtSet: new Set(), klSet: new Set(), rules: [] };
    }
    const kbFacts = MEDICAL_KB_GRAPH_DATA.facts;
    const rules = this.getRulesForCase(selectedCase);
    const gtSet = new Set(selectedCase.gt || []);
    const klSet = new Set(selectedCase.kl || []);

    const nodes = [];
    const edges = [];
    const nodeIds = new Set();

    // 1. Thu thập các sự kiện liên quan
    rules.forEach(r => {
      (r.premises || []).forEach(p => nodeIds.add(p));
      if (r.conclusion) nodeIds.add(r.conclusion);
    });
    // Bổ sung các triệu chứng và kết luận của ca bệnh thực tế nếu chưa có trong tập luật
    (selectedCase.gt || []).forEach(p => nodeIds.add(p));
    (selectedCase.kl || []).forEach(k => nodeIds.add(k));

    // 2. Tạo đỉnh
    nodeIds.forEach(id => {
      let factMeta = kb.facts[id];
      if (!factMeta && typeof window !== "undefined" && window.DEFAULT_KNOWLEDGE_BASE) {
        const defKB = window.DEFAULT_KNOWLEDGE_BASE;
        const sym = (defKB.symptoms || []).find(s => s.id === id);
        const dis = (defKB.diseases || []).find(d => d.id === id);
        if (sym) {
          const isInter = id.startsWith("I") || id.startsWith("HC") || sym.groupId === "group_syndrome";
          factMeta = { id, name: sym.name, type: isInter ? "INTERMEDIATE" : "SYMPTOM" };
        } else if (dis) {
          factMeta = { id, name: dis.name, type: "DISEASE", color: dis.color || "#ef4444" };
        }
      }
      if (!factMeta) {
        const isInter = id.startsWith("I") || id.startsWith("HC");
        const isDis = id.startsWith("D");
        factMeta = { id, name: id, type: isDis ? "DISEASE" : (isInter ? "INTERMEDIATE" : "SYMPTOM") };
      }
      nodes.push({
        id,
        label: id,
        name: factMeta.name,
        type: factMeta.type,
        color: factMeta.color || null,
        isGT: gtSet.has(id),
        isKL: klSet.has(id)
      });
    });

    // 3. Tạo cung có hướng kèm nhãn mã luật: p -> q mang nhãn r
    rules.forEach(r => {
      (r.premises || []).forEach(p => {
        edges.push({
          from: p,
          to: r.conclusion,
          ruleId: r.id,
          label: r.id
        });
      });
    });

    return { nodes, edges, gtSet, klSet, rules };
  }

  /**
   * Tính khoảng cách ngắn nhất trên FPG y tế: KC_FPG(q, KL)
   * Tìm đường đi ngắn nhất (số bước) từ sự kiện q tới bất kỳ bệnh mục tiêu nào trong KL
   */
  static calculateFPGDistanceToKL(q, klSet, fpgEdges) {
    if (klSet.has(q)) return 0;

    const adj = new Map();
    fpgEdges.forEach(e => {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from).push(e.to);
    });

    const queue = [[q, 0]];
    const visited = new Set([q]);

    while (queue.length > 0) {
      const [current, dist] = queue.shift();
      if (klSet.has(current)) {
        return dist;
      }
      const neighbors = adj.get(current) || [];
      for (const nxt of neighbors) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push([nxt, dist + 1]);
        }
      }
    }
    return Infinity;
  }

  /**
   * Xây dựng Đồ thị liên hệ trước giữa các luật RPG y tế
   * - Đỉnh: Mỗi luật chẩn đoán y tế R_i
   * - Cung: R_i -> R_j khi kết luận của R_i (hội chứng I) nằm trong vế trái của R_j
   * - R_GT: Các luật thỏa mãn ngay từ triệu chứng ban đầu (left ⊆ GT)
   * - R_KL: Các luật suy ra bệnh kết luận mục tiêu (q ⊆ KL)
   */
  static buildMedicalRPG(selectedCase) {
    if (!selectedCase) {
      return { nodes: [], edges: [], rGtIds: new Set(), rKlIds: new Set(), rules: [], selectedCase: null };
    }
    const kb = MEDICAL_KB_GRAPH_DATA;
    const rules = this.getRulesForCase(selectedCase);
    const gtSet = new Set(selectedCase.gt || []);
    const klSet = new Set(selectedCase.kl || []);

    const nodes = [];
    const edges = [];
    const rGtIds = new Set();
    const rKlIds = new Set();

    rules.forEach(r => {
      const isR_GT = (r.premises || []).every(p => gtSet.has(p));
      const isR_KL = klSet.has(r.conclusion);

      if (isR_GT) rGtIds.add(r.id);
      if (isR_KL) rKlIds.add(r.id);

      nodes.push({
        id: r.id,
        label: r.id,
        name: r.name,
        description: r.description,
        ruleData: r,
        premises: r.premises,
        conclusion: r.conclusion,
        isR_GT,
        isR_KL
      });
    });

    // Tạo các cung giữa các luật: R_i -> R_j (Slide 22 TS. Nguyễn Quốc Tuấn)
    // ri -> rj khi kết luận của ri là tiền đề của rj
    for (let i = 0; i < rules.length; i++) {
      for (let j = 0; j < rules.length; j++) {
        if (i === j) continue;
        const ri = rules[i];
        const rj = rules[j];
        if ((rj.premises || []).includes(ri.conclusion)) {
          edges.push({
            from: ri.id,
            to: rj.id,
            connectorFact: ri.conclusion,
            connectorName: (kb.facts[ri.conclusion] || {}).name || ri.conclusion,
            label: ri.conclusion
          });
        }
      }
    }

    return { nodes, edges, rGtIds, rKlIds, rules, selectedCase };
  }

  /**
   * Tính khoảng cách trên RPG y tế: KC(R, R_KL)
   * Khoảng cách ngắn nhất từ luật R tới tập luật dẫn đến chẩn đoán bệnh kết luận
   */
  static calculateRPGDistanceToR_KL(ruleId, rKlIds, rpgEdges) {
    if (rKlIds.has(ruleId)) return 0;

    const adj = new Map();
    rpgEdges.forEach(e => {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from).push(e.to);
    });

    const queue = [[ruleId, 0]];
    const visited = new Set([ruleId]);

    while (queue.length > 0) {
      const [current, dist] = queue.shift();
      if (rKlIds.has(current)) {
        return dist;
      }
      const neighbors = adj.get(current) || [];
      for (const nxt of neighbors) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push([nxt, dist + 1]);
        }
      }
    }

    return Infinity;
  }

  /**
   * KẾ THỪA SUY DIỄN TIẾN CHO ĐỒ THỊ FPG VÀ RPG
   * Các phương thức simulateForwardChainingWithFPG và simulateForwardChainingWithRPG
   * được kế thừa và hiện thực thông qua FPGForwardChainingEngine và RPGForwardChainingEngine.
   */
  static simulateForwardChainingWithFPG(selectedCase) {
    const engine = new FPGForwardChainingEngine(selectedCase);
    return engine.simulate(selectedCase);
  }

  static simulateForwardChainingWithRPG(selectedCase) {
    const engine = new RPGForwardChainingEngine(selectedCase);
    return engine.simulate(selectedCase);
  }
}

/**
 * LỚP ĐỘNG CƠ SUY DIỄN TIẾN TRÊN ĐỒ THỊ FPG (FACTS PRECEDENCE GRAPH)
 * Kế thừa trực tiếp từ ForwardChainingEngine (Slide 18 - 21)
 * Định nghĩa hàm lượng giá Heuristic: h^(r) = KC_FPG(q, KL) -> min
 */
const BaseForwardEngine = (typeof ForwardChainingEngine !== "undefined")
  ? ForwardChainingEngine
  : (typeof window !== "undefined" && window.ForwardChainingEngine)
    ? window.ForwardChainingEngine
    : class EmptyBaseEngine {};

class FPGForwardChainingEngine extends BaseForwardEngine {
  constructor(selectedCase = null, options = {}) {
    super(options.kb || getActiveKnowledgeBase(), options);
    this.selectedCase = selectedCase;
    this.fpgGraph = null;
    if (selectedCase) {
      this.fpgGraph = MedicalGraphAlgorithms.buildMedicalFPG(selectedCase);
    }
  }

  /**
   * Ghi đè hàm lượng giá Heuristic FPG (Slide 18)
   * h^(r) = KC_FPG(q, KL) -> min
   */
  calculateHeuristic(rule, context) {
    const klSet = context.klSet || (this.selectedCase ? new Set(this.selectedCase.kl || []) : new Set());
    const edges = this.fpgGraph ? this.fpgGraph.edges : (context.fpgEdges || []);
    return MedicalGraphAlgorithms.calculateFPGDistanceToKL(rule.conclusion, klSet, edges);
  }

  /**
   * Ghi đè lượng giá tập xung đột THOA theo đồ thị FPG
   */
  evaluateConflictRules(thoa, context) {
    const klSet = context.klSet || (this.selectedCase ? new Set(this.selectedCase.kl || []) : new Set());
    const klArr = klSet ? Array.from(klSet) : [];
    const edges = this.fpgGraph ? this.fpgGraph.edges : (context.fpgEdges || []);

    return (thoa || []).map(r => {
      const kc = MedicalGraphAlgorithms.calculateFPGDistanceToKL(r.conclusion, klSet, edges);
      return {
        rule: r,
        ruleId: r.id,
        conclusion: r.conclusion,
        kc,
        formulaStr: `h^(${r.id}) = KC(${r.conclusion}, ${klArr.join(",")}) = ${kc === Infinity ? "∞" : kc}`
      };
    });
  }

  /**
   * Chọn luật tối ưu theo Heuristic FPG (Slide 18 & 20):
   * 1. h^(r) = KC_FPG(q, KL) -> min
   * 2. Tie-break: csmin (chỉ số luật nhỏ nhất) theo Slide 16 & 17
   */
  selectConflictRule(thoa, evaluations, context) {
    if (!evaluations || evaluations.length === 0) return null;
    const sorted = [...evaluations].sort((a, b) => {
      const kcA = a.kc !== null && a.kc !== undefined ? a.kc : Infinity;
      const kcB = b.kc !== null && b.kc !== undefined ? b.kc : Infinity;
      if (kcA !== kcB) return kcA - kcB;
      return a.ruleId.localeCompare(b.ruleId, undefined, { numeric: true });
    });
    return sorted[0];
  }

  /**
   * Thực thi mô phỏng suy diễn tiến FPG bằng cách tái sử dụng inferStandard từ ForwardChainingEngine
   */
  simulate(selectedCase) {
    this.selectedCase = selectedCase;
    this.fpgGraph = MedicalGraphAlgorithms.buildMedicalFPG(selectedCase);
    const rules = MedicalGraphAlgorithms.getRulesForCase(selectedCase);

    return this.inferStandard(selectedCase.gt || [], selectedCase.kl || [], {
      rules,
      conflictStrategy: "heuristic",
      contextExtras: {
        fpgGraph: this.fpgGraph,
        fpgEdges: this.fpgGraph.edges
      }
    });
  }
}

/**
 * LỚP ĐỘNG CƠ SUY DIỄN TIẾN TRÊN ĐỒ THỊ RPG (RULES PRECEDENCE GRAPH)
 * Kế thừa trực tiếp từ ForwardChainingEngine (Slide 22 - 23)
 * Định nghĩa hàm lượng giá Heuristic: h^(r) = KC_RPG(r, R_KL) -> min
 */
class RPGForwardChainingEngine extends BaseForwardEngine {
  constructor(selectedCase = null, options = {}) {
    super(options.kb || getActiveKnowledgeBase(), options);
    this.selectedCase = selectedCase;
    this.rpgGraph = null;
    if (selectedCase) {
      this.rpgGraph = MedicalGraphAlgorithms.buildMedicalRPG(selectedCase);
    }
  }

  /**
   * Ghi đè hàm lượng giá Heuristic RPG (Slide 22)
   * h^(r) = KC_RPG(r, R_KL) -> min
   */
  calculateHeuristic(rule, context) {
    const rKlIds = this.rpgGraph ? this.rpgGraph.rKlIds : (context.rKlIds || new Set());
    const edges = this.rpgGraph ? this.rpgGraph.edges : (context.rpgEdges || []);
    return MedicalGraphAlgorithms.calculateRPGDistanceToR_KL(rule.id, rKlIds, edges);
  }

  /**
   * Ghi đè lượng giá tập xung đột THOA theo đồ thị RPG
   */
  evaluateConflictRules(thoa, context) {
    const rKlIds = this.rpgGraph ? this.rpgGraph.rKlIds : (context.rKlIds || new Set());
    const edges = this.rpgGraph ? this.rpgGraph.edges : (context.rpgEdges || []);

    return (thoa || []).map(r => {
      const kc = MedicalGraphAlgorithms.calculateRPGDistanceToR_KL(r.id, rKlIds, edges);
      return {
        rule: r,
        ruleId: r.id,
        ruleName: r.name,
        conclusion: r.conclusion,
        kc,
        formulaStr: `h^(${r.id}) = KC(${r.id}, R_KL) = ${kc === Infinity ? "∞" : kc}`
      };
    });
  }

  /**
   * Chọn luật tối ưu theo Heuristic RPG (Slide 22):
   * 1. h^(r) = KC_RPG(r, R_KL) -> min
   * 2. Tie-break: csmin (chỉ số nhỏ nhất) theo Slide 16 & 17
   */
  selectConflictRule(thoa, evaluations, context) {
    if (!evaluations || evaluations.length === 0) return null;
    const sorted = [...evaluations].sort((a, b) => {
      const kcA = a.kc !== null && a.kc !== undefined ? a.kc : Infinity;
      const kcB = b.kc !== null && b.kc !== undefined ? b.kc : Infinity;
      if (kcA !== kcB) return kcA - kcB;
      return a.ruleId.localeCompare(b.ruleId, undefined, { numeric: true });
    });
    return sorted[0];
  }

  /**
   * Thực thi mô phỏng suy diễn tiến RPG bằng cách tái sử dụng inferStandard từ ForwardChainingEngine
   */
  simulate(selectedCase) {
    this.selectedCase = selectedCase;
    this.rpgGraph = MedicalGraphAlgorithms.buildMedicalRPG(selectedCase);
    const rules = MedicalGraphAlgorithms.getRulesForCase(selectedCase);

    return this.inferStandard(selectedCase.gt || [], selectedCase.kl || [], {
      rules,
      conflictStrategy: "heuristic",
      contextExtras: {
        rpgGraph: this.rpgGraph,
        rKlIds: this.rpgGraph.rKlIds,
        rpgEdges: this.rpgGraph.edges
      }
    });
  }
}

if (typeof window !== "undefined") {
  window.MEDICAL_KB_GRAPH_DATA = MEDICAL_KB_GRAPH_DATA;
  window.MedicalGraphAlgorithms = MedicalGraphAlgorithms;
  window.FPGForwardChainingEngine = FPGForwardChainingEngine;
  window.RPGForwardChainingEngine = RPGForwardChainingEngine;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MEDICAL_KB_GRAPH_DATA,
    MedicalGraphAlgorithms,
    FPGForwardChainingEngine,
    RPGForwardChainingEngine
  };
}
