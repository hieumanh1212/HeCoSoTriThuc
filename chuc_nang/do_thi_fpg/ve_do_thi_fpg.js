/**
 * FEATURE MODULE: FPG VISUALIZER (FACT PRECEDENCE GRAPH & SEMANTIC NETWORK FOR RULES)
 * Trực quan hóa Mạng Sự Kiện FPG, Cổng Logic Hội (AND), Tuyển (OR), Phủ định (NOT) & Hệ số tin cậy CF
 * Dựa trên giáo trình Hệ Cơ Sở Tri Thức & Bài giảng Slide Tuần 5 - Tuần 6 (Thầy Phạm Văn Hải)
 */

class FPGVisualizer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.mode = "CLINICAL"; // "CLINICAL" (Med-Expert Y tế) hoặc "SLIDE_BENCHMARK" (Bài tập Slide Tuần 6)
    this.kb = null;
    this.activeFacts = new Set();
    this.selectedDiseaseFilter = "ALL";
    this.onNodeSelect = options.onNodeSelect || null;
    this.onNodeHover = options.onNodeHover || null;

    this.scale = 0.85;
    this.offsetX = 50;
    this.offsetY = 40;

    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hoveredNode = null;
    this.selectedNode = null;

    this.nodes = [];
    this.edges = [];

    this.initEvents();
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth || 900;
      const h = parent.clientHeight || 680;

      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
    }
    this.render();
  }

  initEvents() {
    if (!this.canvas) return;

    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.autoFit();
    });

    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.offsetX;
      this.dragStartY = e.clientY - this.offsetY;
    });

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - this.offsetX) / this.scale;
      const mouseY = (e.clientY - rect.top - this.offsetY) / this.scale;

      const clicked = this.findNodeAt(mouseX, mouseY);
      this.selectedNode = clicked;
      if (this.onNodeSelect) {
        this.onNodeSelect(clicked);
      }
      this.render();
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - this.offsetX) / this.scale;
      const mouseY = (e.clientY - rect.top - this.offsetY) / this.scale;

      if (this.isDragging) {
        this.offsetX = e.clientX - this.dragStartX;
        this.offsetY = e.clientY - this.dragStartY;
        this.render();
      } else {
        const found = this.findNodeAt(mouseX, mouseY);
        if (this.hoveredNode !== found) {
          this.hoveredNode = found;
          this.canvas.style.cursor = found ? "pointer" : "grab";
          if (this.onNodeHover) {
            this.onNodeHover(found);
          }
          this.render();
        }
      }
    });

    this.canvas.addEventListener("mouseleave", () => {
      if (this.hoveredNode) {
        this.hoveredNode = null;
        if (this.onNodeHover) {
          this.onNodeHover(null);
        }
        this.render();
      }
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      const newScale = Math.max(0.25, Math.min(2.5, this.scale * zoomFactor));

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
      this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
      this.scale = newScale;

      this.render();
    });
  }

  findNodeAt(x, y) {
    for (const node of this.nodes) {
      if (node.radius) {
        const dist = Math.hypot(x - node.x, y - node.y);
        if (dist <= node.radius + 6) return node;
      }
      if (node.width && node.height) {
        const halfW = node.width / 2 + 4;
        const halfH = node.height / 2 + 4;
        if (
          x >= node.x - halfW &&
          x <= node.x + halfW &&
          y >= node.y - halfH &&
          y <= node.y + halfH
        ) {
          return node;
        }
      }
    }
    return null;
  }

  zoomIn() {
    this.scale = Math.min(2.5, this.scale * 1.2);
    this.render();
  }

  zoomOut() {
    this.scale = Math.max(0.25, this.scale / 1.2);
    this.render();
  }

  resetView() {
    this.autoFit();
  }

  autoFit() {
    if (!this.canvas || this.nodes.length === 0) return;

    const parent = this.canvas.parentElement;
    const viewW = parent ? parent.clientWidth : 900;
    const viewH = parent ? parent.clientHeight : 680;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    this.nodes.forEach(n => {
      const extraLeft = n.type === "FACT" ? 220 : 60;
      const extraRight = n.type === "GOAL" ? 120 : 60;
      const extraY = 40;

      minX = Math.min(minX, n.x - extraLeft);
      maxX = Math.max(maxX, n.x + extraRight);
      minY = Math.min(minY, n.y - extraY);
      maxY = Math.max(maxY, n.y + extraY);
    });

    const graphW = Math.max(100, maxX - minX);
    const graphH = Math.max(100, maxY - minY);

    const padding = 60;
    const scaleX = (viewW - padding * 2) / graphW;
    const scaleY = (viewH - padding * 2) / graphH;

    this.scale = Math.min(1.15, Math.max(0.35, Math.min(scaleX, scaleY)));

    const scaledW = graphW * this.scale;
    const scaledH = graphH * this.scale;

    this.offsetX = (viewW - scaledW) / 2 - minX * this.scale;
    this.offsetY = (viewH - scaledH) / 2 - minY * this.scale;

    this.render();
  }

  setMode(mode) {
    this.mode = mode;
    this.buildGraph();
    this.autoFit();
  }

  setData(knowledgeBase, activeFacts = new Set(), firedRules = new Set(), diseaseFilter = "ALL") {
    this.kb = knowledgeBase;
    this.activeFacts = activeFacts instanceof Set ? activeFacts : new Set(Object.keys(activeFacts || {}));
    if (typeof firedRules === "string") {
      this.selectedDiseaseFilter = firedRules;
      this.firedRules = new Set();
    } else {
      this.firedRules = firedRules instanceof Set ? firedRules : new Set((firedRules || []).map(r => r.ruleId || r));
      this.selectedDiseaseFilter = diseaseFilter;
    }

    this.buildGraph();
    this.autoFit();
  }

  buildGraph() {
    if (this.mode === "SLIDE_BENCHMARK") {
      this.buildSlideBenchmarkGraph();
    } else {
      this.buildClinicalGraph();
    }
  }

  /**
   * CHẾ ĐỘ 1: Med-Expert Đồ thị lan truyền sự kiện Y tế FPG
   */
  buildClinicalGraph() {
    if (!this.kb) return;

    this.nodes = [];
    this.edges = [];

    // Khử trùng lặp tập luật sinh và tập triệu chứng tiền đề
    const uniqueRulesMap = new Map();
    (this.kb.rules || []).forEach(r => {
      if (r && r.id && !uniqueRulesMap.has(r.id)) {
        uniqueRulesMap.set(r.id, {
          ...r,
          premises: Array.from(new Set((r.premises || []).filter(Boolean)))
        });
      }
    });
    const allRules = Array.from(uniqueRulesMap.values());

    // Khử trùng lặp danh mục bệnh
    const uniqueDiseasesMap = new Map();
    (this.kb.diseases || []).forEach(d => {
      if (d && d.id && !uniqueDiseasesMap.has(d.id)) {
        uniqueDiseasesMap.set(d.id, d);
      }
    });
    const allDiseases = Array.from(uniqueDiseasesMap.values());

    let targetRules = allRules;
    let targetDiseases = allDiseases;

    if (this.selectedDiseaseFilter !== "ALL") {
      targetRules = allRules.filter(r => r.conclusion === this.selectedDiseaseFilter);
      targetDiseases = allDiseases.filter(d => d.id === this.selectedDiseaseFilter);
    }

    const usedSymptomIds = new Set();
    targetRules.forEach(r => (r.premises || []).forEach(pId => usedSymptomIds.add(pId)));
    const targetSymptoms = (this.kb.symptoms || []).filter(s => usedSymptomIds.has(s.id));

    // 4 Cột đại diện kiến trúc FPG (Fact Precedence Graph & Logic Gates):
    // Cột 1: Sự kiện / Triệu chứng (Input Facts) (X = 220)
    // Cột 2: Cổng Hội logic AND (∧) cho từng luật (X = 560)
    // Cột 3: Cổng Tuyển logic OR (∨) cho từng bệnh (X = 860)
    // Cột 4: Kết luận / Bệnh (Goals / Diseases) (X = 1160)
    const col1X = 220;
    const col2X = 560;
    const col3X = 860;
    const col4X = 1160;

    const symSpacing = targetSymptoms.length > 14 ? 54 : 66;
    const ruleSpacing = targetRules.length > 10 ? 64 : 76;
    const disSpacing = targetDiseases.length > 5 ? 100 : 125;

    const symTotalHeight = targetSymptoms.length * symSpacing;
    const ruleTotalHeight = targetRules.length * ruleSpacing;
    const disTotalHeight = targetDiseases.length * disSpacing;
    const maxHeight = Math.max(symTotalHeight, ruleTotalHeight, disTotalHeight, 440);

    const symStartY = 70 + (maxHeight - symTotalHeight) / 2;
    const ruleStartY = 70 + (maxHeight - ruleTotalHeight) / 2;
    const disStartY = 70 + (maxHeight - disTotalHeight) / 2;

    const nodeMap = new Map();
    const ruleGateMap = new Map();
    const orGateMap = new Map();
    const goalNodeMap = new Map();

    // 1. Tạo node Sự kiện / Triệu chứng (Input Facts)
    targetSymptoms.forEach((s, idx) => {
      const node = {
        id: s.id,
        type: "FACT",
        label: s.id,
        subLabel: s.name,
        x: col1X,
        y: symStartY + idx * symSpacing,
        radius: 20,
        data: s,
        isActive: this.activeFacts.has(s.id)
      };
      this.nodes.push(node);
      nodeMap.set(s.id, node);
    });

    // 2. Tạo node Cổng Hội logic AND (∧) cho từng luật sinh
    targetRules.forEach((r, idx) => {
      const premises = Array.from(new Set((r.premises || []).filter(Boolean)));
      const allActive = (premises.length > 0 && premises.every(pId => this.activeFacts.has(pId))) || (this.firedRules && this.firedRules.has(r.id));
      const node = {
        id: `GATE_AND_${r.id}`,
        ruleId: r.id,
        type: "GATE_AND",
        label: `∧ ${r.id}`,
        gateSymbol: "∧",
        subLabel: `CF: ${r.cf}`,
        ruleData: r,
        x: col2X,
        y: ruleStartY + idx * ruleSpacing,
        radius: 24,
        width: 78,
        height: 42,
        isActive: allActive
      };
      this.nodes.push(node);
      nodeMap.set(`GATE_AND_${r.id}`, node);
      ruleGateMap.set(r.id, node);
    });

    // 3. Tạo node Cổng Tuyển logic OR (∨) và Nút Bệnh (Goal) cho từng Bệnh
    targetDiseases.forEach((d, idx) => {
      const incomingRules = targetRules.filter(r => r.conclusion === d.id);
      const isOrActive = incomingRules.some(r => {
        const andNode = ruleGateMap.get(r.id);
        return (andNode && andNode.isActive) || (this.firedRules && this.firedRules.has(r.id));
      });

      // Nút Cổng Tuyển OR
      const orNode = {
        id: `GATE_OR_${d.id}`,
        diseaseId: d.id,
        type: "GATE_OR",
        label: `∨ ${d.id}`,
        gateSymbol: "∨",
        subLabel: "OR / MYCIN",
        diseaseData: d,
        incomingRules: incomingRules,
        x: col3X,
        y: disStartY + idx * disSpacing,
        radius: 24,
        width: 78,
        height: 42,
        isActive: isOrActive
      };
      this.nodes.push(orNode);
      nodeMap.set(`GATE_OR_${d.id}`, orNode);
      orGateMap.set(d.id, orNode);

      // Nút Kết luận / Bệnh (Goal)
      const goalNode = {
        id: d.id,
        type: "GOAL",
        label: d.id,
        subLabel: d.name,
        data: d,
        x: col4X,
        y: disStartY + idx * disSpacing,
        width: 155,
        height: 52,
        isActive: isOrActive
      };
      this.nodes.push(goalNode);
      nodeMap.set(d.id, goalNode);
      goalNodeMap.set(d.id, goalNode);
    });

    // 4. Tạo các cung nối có hướng theo đúng dòng chảy FPG:
    // A. Cung từ Fact -> Cổng Hội AND (∧)
    targetRules.forEach(r => {
      const andNode = ruleGateMap.get(r.id);
      if (!andNode) return;

      const uniquePremises = Array.from(new Set((r.premises || []).filter(Boolean)));
      uniquePremises.forEach(pId => {
        const symNode = nodeMap.get(pId);
        if (symNode) {
          this.edges.push({
            from: symNode,
            to: andNode,
            isFired: symNode.isActive,
            type: "AND_ARC"
          });
        }
      });

      // B. Cung từ Cổng Hội AND (∧) -> Cổng Tuyển OR (∨) của Bệnh
      const orNode = orGateMap.get(r.conclusion);
      if (orNode) {
        this.edges.push({
          from: andNode,
          to: orNode,
          isFired: andNode.isActive,
          label: `CF=${r.cf}`,
          type: "RULE_ARC"
        });
      }
    });

    // C. Cung từ Cổng Tuyển OR (∨) -> Kết luận / Bệnh (Goal)
    targetDiseases.forEach(d => {
      const orNode = orGateMap.get(d.id);
      const goalNode = goalNodeMap.get(d.id);
      if (orNode && goalNode) {
        this.edges.push({
          from: orNode,
          to: goalNode,
          isFired: orNode.isActive,
          label: "MYCIN",
          type: "GOAL_ARC"
        });
      }
    });
  }

  /**
   * CHẾ ĐỘ 2: Bài tập mẫu Slide Tuần 6 (Thầy Phạm Văn Hải)
   * R1: A -> B [CF(R1)=0.5, CF(A)=0.25]
   * R2: C -> D [CF(R2)=0.25, CF(C)=0.5]
   * R3: (-F) -> G [CF(R3)=0.75, CF(F)=-0.5]
   * R4: (B ^ -D) v I -> J [CF(R4)=0.25, CF(I)=0.4]
   */
  buildSlideBenchmarkGraph() {
    this.nodes = [];
    this.edges = [];

    // Tính toán số học CF chuẩn theo slide:
    const cf_A = 0.25;
    const cf_R1 = 0.5;
    const cf_B = cf_A * cf_R1; // 0.125

    const cf_C = 0.5;
    const cf_R2 = 0.25;
    const cf_D = cf_C * cf_R2; // 0.125
    const cf_notD = -cf_D;     // -0.125

    const cf_F = -0.5;
    const cf_notF = -cf_F;     // 0.5
    const cf_R3 = 0.75;
    const cf_G = cf_notF * cf_R3; // 0.375

    const cf_I = 0.4;
    const cf_and_B_notD = Math.min(cf_B, cf_notD); // min(0.125, -0.125) = -0.125
    const cf_or_term = Math.max(cf_and_B_notD, cf_I); // max(-0.125, 0.4) = 0.4
    const cf_R4 = 0.25;
    const cf_J = cf_or_term * cf_R4; // 0.1

    // Định vị tọa độ
    const colX1 = 180;  // Sự kiện gốc A, C, F, I
    const colX2 = 420;  // Phủ định & Sự kiện trung gian B, D, -F
    const colX3 = 660;  // -D, G, Cổng AND (B ^ -D)
    const colX4 = 900;  // Cổng OR [(B ^ -D) v I]
    const colX5 = 1140; // Kết luận J

    // Node A
    const nodeA = { id: "FACT_A", type: "FACT", label: "A", subLabel: "Sự kiện A", cf: cf_A, x: colX1, y: 120, radius: 22, isActive: true };
    // Node B
    const nodeB = { id: "FACT_B", type: "FACT", label: "B", subLabel: "B = R1(A)", cf: cf_B, x: colX2, y: 120, radius: 22, isActive: true };

    // Node C
    const nodeC = { id: "FACT_C", type: "FACT", label: "C", subLabel: "Sự kiện C", cf: cf_C, x: colX1, y: 260, radius: 22, isActive: true };
    // Node D
    const nodeD = { id: "FACT_D", type: "FACT", label: "D", subLabel: "D = R2(C)", cf: cf_D, x: colX2, y: 260, radius: 22, isActive: true };
    // Node -D (NOT D)
    const nodeNotD = { id: "FACT_NOT_D", type: "FACT", label: "¬D", subLabel: "NOT D", cf: cf_notD, x: colX3, y: 260, radius: 22, isActive: true };

    // Node F
    const nodeF = { id: "FACT_F", type: "FACT", label: "F", subLabel: "Sự kiện F", cf: cf_F, x: colX1, y: 400, radius: 22, isActive: true };
    // Node -F (NOT F)
    const nodeNotF = { id: "FACT_NOT_F", type: "FACT", label: "¬F", subLabel: "NOT F", cf: cf_notF, x: colX2, y: 400, radius: 22, isActive: true };
    // Node G
    const nodeG = { id: "FACT_G", type: "GOAL", label: "G", subLabel: "G = R3(¬F)", cf: cf_G, x: colX3, y: 400, width: 140, height: 48, isActive: true };

    // Node I
    const nodeI = { id: "FACT_I", type: "FACT", label: "I", subLabel: "Sự kiện I", cf: cf_I, x: colX1, y: 540, radius: 22, isActive: true };

    // Cổng AND (B ^ -D)
    const gateAND = { id: "GATE_AND_B_NOTD", type: "GATE_AND", label: "AND ∧", subLabel: "min(B, ¬D)", cf: cf_and_B_notD, x: colX3, y: 180, radius: 26, isActive: true };

    // Cổng OR [(B ^ -D) v I]
    const gateOR = { id: "GATE_OR_R4", type: "GATE_OR", label: "OR ∨", subLabel: "max(∧, I)", cf: cf_or_term, x: colX4, y: 320, radius: 26, isActive: true };

    // Node Kết Luận J
    const nodeJ = { id: "FACT_J", type: "GOAL", label: "J", subLabel: "J = R4(∨)", cf: cf_J, x: colX5, y: 320, width: 150, height: 52, isActive: true };

    this.nodes.push(nodeA, nodeB, nodeC, nodeD, nodeNotD, nodeF, nodeNotF, nodeG, nodeI, gateAND, gateOR, nodeJ);

    // Cung R1: A -> B (CF(R1)=0.5)
    this.edges.push({ from: nodeA, to: nodeB, isFired: true, label: "R1 (CF=0.5)", type: "RULE_ARC" });

    // Cung R2: C -> D (CF(R2)=0.25)
    this.edges.push({ from: nodeC, to: nodeD, isFired: true, label: "R2 (CF=0.25)", type: "RULE_ARC" });

    // Cung phủ định: D -> NOT D
    this.edges.push({ from: nodeD, to: nodeNotD, isFired: true, label: "NOT (đổi dấu)", type: "NOT_ARC" });

    // Cung phủ định: F -> NOT F
    this.edges.push({ from: nodeF, to: nodeNotF, isFired: true, label: "NOT (đổi dấu)", type: "NOT_ARC" });

    // Cung R3: NOT F -> G (CF(R3)=0.75)
    this.edges.push({ from: nodeNotF, to: nodeG, isFired: true, label: "R3 (CF=0.75)", type: "RULE_ARC" });

    // Cung hội B -> Cổng AND
    this.edges.push({ from: nodeB, to: gateAND, isFired: true, label: "Nhánh B", type: "AND_ARC" });

    // Cung hội NOT D -> Cổng AND
    this.edges.push({ from: nodeNotD, to: gateAND, isFired: true, label: "Nhánh ¬D", type: "AND_ARC" });

    // Cung từ Cổng AND -> Cổng OR
    this.edges.push({ from: gateAND, to: gateOR, isFired: true, label: "Vế hội (B∧¬D)", type: "OR_ARC" });

    // Cung từ I -> Cổng OR
    this.edges.push({ from: nodeI, to: gateOR, isFired: true, label: "Nhánh I", type: "OR_ARC" });

    // Cung từ Cổng OR -> Kết luận J qua R4 (CF(R4)=0.25)
    this.edges.push({ from: gateOR, to: nodeJ, isFired: true, label: "R4 (CF=0.25)", type: "RULE_ARC" });
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    const isLight = document.documentElement.getAttribute("data-theme") === "light";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Nền canvas
    ctx.fillStyle = isLight ? "#f8fafc" : "#0b1120";
    ctx.fillRect(0, 0, width, height);

    // Lưới chấm trang trí
    ctx.save();
    ctx.fillStyle = isLight ? "rgba(100, 116, 139, 0.18)" : "rgba(148, 163, 184, 0.12)";
    const dotSize = 1.5;
    const dotGap = 28 * this.scale;
    const startX = (this.offsetX % dotGap);
    const startY = (this.offsetY % dotGap);

    for (let x = startX; x < width; x += dotGap) {
      for (let y = startY; y < height; y += dotGap) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Biến hình (Pan + Zoom)
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // 1. Vẽ các cung (Edges)
    this.edges.forEach(edge => {
      this.drawEdge(ctx, edge, isLight);
    });

    // 2. Vẽ các Node
    this.nodes.forEach(node => {
      this.drawNode(ctx, node, isLight);
    });

    // 3. Vẽ Tooltip nếu có node hover
    if (this.hoveredNode) {
      this.drawTooltip(ctx, this.hoveredNode, isLight);
    }

    ctx.restore();
  }

  drawEdge(ctx, edge, isLight = false) {
    const from = edge.from;
    const to = edge.to;
    if (!from || !to) return;
    const isFired = edge.isFired;

    ctx.save();
    ctx.beginPath();

    const startX = from.x + (from.width ? from.width / 2 : (from.radius || 20));
    const startY = from.y;
    const endX = to.x - (to.width ? to.width / 2 : (to.radius || 20));
    const endY = to.y;

    const cp1X = startX + (endX - startX) * 0.5;
    const cp1Y = startY;
    const cp2X = startX + (endX - startX) * 0.5;
    const cp2Y = endY;

    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);

    let activeColor = "#10b981";
    let activeGlow = "rgba(16, 185, 129, 0.75)";

    if (edge.type === "RULE_ARC") {
      activeColor = "#38bdf8";
      activeGlow = "rgba(56, 189, 248, 0.75)";
    } else if (edge.type === "GOAL_ARC") {
      activeColor = "#c084fc";
      activeGlow = "rgba(192, 132, 252, 0.75)";
    } else if (edge.type === "NOT_ARC") {
      activeColor = "#f59e0b";
      activeGlow = "rgba(245, 158, 11, 0.75)";
    }

    if (isFired) {
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 3.2;
      ctx.shadowColor = activeGlow;
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = isLight ? "rgba(148, 163, 184, 0.6)" : "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
    }

    ctx.stroke();

    const arrowColor = isFired ? activeColor : (isLight ? "#64748b" : "#94a3b8");
    this.drawArrowHead(ctx, cp2X, cp2Y, endX, endY, arrowColor);

    if (edge.label) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2 - 7;
      ctx.save();
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.fillStyle = isFired ? activeColor : (isLight ? "#64748b" : "#94a3b8");
      ctx.textAlign = "center";
      ctx.fillText(edge.label, midX, midY);
      ctx.restore();
    }

    ctx.restore();
  }

  drawArrowHead(ctx, fromX, fromY, toX, toY, color) {
    const headLen = 9;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawNode(ctx, node, isLight = false) {
    ctx.save();
    const isSelected = this.selectedNode === node;

    if (node.type === "FACT") {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius || 20, 0, Math.PI * 2);

      if (node.isActive) {
        ctx.fillStyle = "#059669";
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(52, 211, 153, 0.85)";
        ctx.shadowBlur = 14;
      } else {
        ctx.fillStyle = isLight ? "#ffffff" : "#1e293b";
        ctx.strokeStyle = isLight ? "#94a3b8" : "#475569";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
      }

      if (isSelected) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3.5;
      }

      ctx.fill();
      ctx.stroke();

      // Label mã triệu chứng ở giữa hình tròn
      ctx.fillStyle = node.isActive ? "#ffffff" : (isLight ? "#0f172a" : "#ffffff");
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, node.x, node.y);

      // Tên triệu chứng hiển thị bên trái hình tròn
      ctx.fillStyle = node.isActive ? (isLight ? "#047857" : "#34d399") : (isLight ? "#334155" : "#cbd5e1");
      ctx.font = (node.isActive ? "bold " : "") + "11px Inter, sans-serif";
      ctx.textAlign = "right";
      const shortName = (node.subLabel || "").length > 32 ? (node.subLabel || "").substring(0, 30) + "..." : (node.subLabel || "");
      ctx.fillText(shortName, node.x - (node.radius || 20) - 10, node.y);

    } else if (node.type === "GATE_AND" || node.type === "RULE") {
      const width = node.width || 78;
      const height = node.height || 42;
      const x = node.x - width / 2;
      const y = node.y - height / 2;

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, width, height, 10);
      } else {
        ctx.rect(x, y, width, height);
      }

      if (node.isActive) {
        ctx.fillStyle = "#0284c7";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(56, 189, 248, 0.9)";
        ctx.shadowBlur = 14;
      } else {
        ctx.fillStyle = isLight ? "#f0f9ff" : "#0f172a";
        ctx.strokeStyle = isLight ? "#0284c7" : "#0369a1";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
      }

      if (isSelected) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3.5;
      }

      ctx.fill();
      ctx.stroke();

      // Ký hiệu ∧ và tên luật
      ctx.fillStyle = node.isActive ? "#ffffff" : (isLight ? "#0369a1" : "#38bdf8");
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(node.label, node.x, y + 6);

      // SubLabel CF
      ctx.fillStyle = node.isActive ? "#e0f2fe" : (isLight ? "#0284c7" : "#7dd3fc");
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(node.subLabel || "", node.x, y + 23);

    } else if (node.type === "GATE_OR") {
      const width = node.width || 78;
      const height = node.height || 42;
      const x = node.x - width / 2;
      const y = node.y - height / 2;

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, width, height, 10);
      } else {
        ctx.rect(x, y, width, height);
      }

      if (node.isActive) {
        ctx.fillStyle = "#7c3aed";
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(167, 139, 250, 0.9)";
        ctx.shadowBlur = 14;
      } else {
        ctx.fillStyle = isLight ? "#faf5ff" : "#1e1b4b";
        ctx.strokeStyle = isLight ? "#8b5cf6" : "#7c3aed";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
      }

      if (isSelected) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3.5;
      }

      ctx.fill();
      ctx.stroke();

      // Ký hiệu ∨ và tên cổng
      ctx.fillStyle = node.isActive ? "#ffffff" : (isLight ? "#6d28d9" : "#c4b5fd");
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(node.label, node.x, y + 6);

      // SubLabel MYCIN
      ctx.fillStyle = node.isActive ? "#ede9fe" : (isLight ? "#8b5cf6" : "#a78bfa");
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(node.subLabel || "", node.x, y + 23);

    } else if (node.type === "DISEASE" || node.type === "GOAL") {
      const width = node.width || 155;
      const height = node.height || 52;
      const x = node.x - width / 2;
      const y = node.y - height / 2;

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, width, height, 10);
      } else {
        ctx.rect(x, y, width, height);
      }

      if (node.isActive) {
        ctx.fillStyle = "#dc2626";
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(248, 113, 113, 0.9)";
        ctx.shadowBlur = 16;
      } else {
        ctx.fillStyle = isLight ? "#ffffff" : "#1e293b";
        ctx.strokeStyle = isLight ? "#fca5a5" : "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
      }

      if (isSelected) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3.5;
      }

      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = node.isActive ? "#ffffff" : (isLight ? "#991b1b" : "#ffffff");
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(node.label, node.x, y + 9);

      ctx.fillStyle = node.isActive ? "#fee2e2" : (isLight ? "#475569" : "#cbd5e1");
      ctx.font = "11px Inter, sans-serif";
      const shortDis = (node.subLabel || "").length > 20 ? (node.subLabel || "").substring(0, 18) + "..." : (node.subLabel || "");
      ctx.fillText(shortDis, node.x, y + 28);
    }

    ctx.restore();
  }

  drawTooltip(ctx, node, isLight = false) {
    ctx.save();
    let textTitle = "";
    let textDesc = "";

    if (node.type === "FACT") {
      textTitle = `[${node.id}] Triệu chứng (Fact)`;
      textDesc = node.subLabel || (node.data && node.data.name) || "";
    } else if (node.type === "GATE_AND" || node.type === "RULE") {
      const r = node.ruleData || {};
      textTitle = `[Cổng AND ∧] Luật ${r.id || node.id}: ${r.name || r.id || ''}`;
      textDesc = `CF = ${r.cf !== undefined ? r.cf : ''} • Hội tụ ${(r.premises || []).length} tiền đề`;
    } else if (node.type === "GATE_OR") {
      const d = node.diseaseData || {};
      textTitle = `[Cổng OR ∨] Tuyển luật dẫn tới [${node.diseaseId || d.id}]`;
      textDesc = `Hàm kết hợp chứng cứ MYCIN từ ${(node.incomingRules || []).length} luật sinh`;
    } else if (node.type === "DISEASE" || node.type === "GOAL") {
      textTitle = `[${node.id}] ${node.subLabel || (node.data && node.data.name) || ""}`;
      textDesc = `Bệnh kết luận • Mức độ: ${node.data && node.data.severity ? node.data.severity : 'Theo dõi y tế'}`;
    }

    ctx.font = "bold 12px Inter, sans-serif";
    const titleWidth = ctx.measureText(textTitle).width;
    ctx.font = "11px Inter, sans-serif";
    const descWidth = ctx.measureText(textDesc).width;
    const boxWidth = Math.max(titleWidth, descWidth, 220) + 24;
    const boxHeight = 54;

    const boxX = node.x + 20;
    const boxY = node.y - 30;

    ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.98)" : "rgba(15, 23, 42, 0.96)";
    ctx.strokeStyle = isLight ? "#0284c7" : "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = isLight ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10;

    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
    } else {
      ctx.rect(boxX, boxY, boxWidth, boxHeight);
    }
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = isLight ? "#0284c7" : "#38bdf8";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(textTitle, boxX + 12, boxY + 20);

    ctx.fillStyle = isLight ? "#334155" : "#e2e8f0";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText(textDesc, boxX + 12, boxY + 38);

    ctx.restore();
  }
}

window.FPGVisualizer = FPGVisualizer;
