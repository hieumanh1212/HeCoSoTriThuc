/**

 * FEATURE MODULE: GRAPH VISUALIZER (RPG - RULE PETRI GRAPH & FPG - FACT DEPENDENCY GRAPH)
 * Trực quan hóa Mạng Petri Luật sinh (RPG) và Mạng Quan hệ Phụ thuộc Sự kiện (FPG)
 * Hỗ trợ suy diễn đa tầng: Tiền đề cơ sở -> Hội chứng trung gian -> Bệnh đích.
 * Tuân thủ nghiêm ngặt chuẩn Cognitive Complexity < 10 của SonarQube.

 */

class RPGVisualizer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.selectedCase = null;
    this.rpgData = null;
    
    this.kb = null;
    this.activeFacts = new Set();
    this.firedRules = new Set();
    this.selectedDiseaseFilter = "ALL";
    this.graphMode = "RPG"; // 'RPG' | 'FPG'

    this.scale = 0.85;
    this.offsetX = 40;
    this.offsetY = 30;


    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hoveredNode = null;
    this.selectedNode = null;

    this.onNodeSelect = options.onNodeSelect || null;
    this.onNodeHover = options.onNodeHover || null;

    // Trạng thái mô phỏng suy diễn tiến y tế trên mạng luật RPG
    this.firedRules = new Set();
    this.activeRuleId = null;
    this.currentTG = new Set();

    this.nodes = [];
    this.edges = [];

    this.initEvents();
    this.resizeCanvas();
  }

  setGraphMode(mode) {
    if (this.graphMode !== mode) {
      this.graphMode = mode;
      this.buildGraph();
      this.autoFit();
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth || 900;
      const h = parent.clientHeight || 650;

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

    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.offsetX;
      this.dragStartY = e.clientY - this.offsetY;
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
      const newScale = Math.max(0.3, Math.min(2.5, this.scale * zoomFactor));

  _findNodeAt(mouseX, mouseY) {
    for (const node of this.nodes) {
      if (node.type === "FACT" || node.type === "INTERMEDIATE") {
        const dist = Math.hypot(mouseX - node.x, mouseY - node.y);
        if (dist <= (node.radius || 20) + 6) return node;
      } else {
        const halfW = (node.width || 80) / 2 + 4;
        const halfH = (node.height || 40) / 2 + 4;
        if (mouseX >= node.x - halfW && mouseX <= node.x + halfW &&
            mouseY >= node.y - halfH && mouseY <= node.y + halfH) {
          return node;
        }
      }
    }
    return null;
  }

  zoom(factor, clientX = null, clientY = null) {
    const prevScale = this.scale;
    this.scale = Math.min(2.5, Math.max(0.25, this.scale * factor));

    if (clientX !== null && clientY !== null) {
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;
      this.offsetX = canvasX - (canvasX - this.offsetX) * (this.scale / prevScale);
      this.offsetY = canvasY - (canvasY - this.offsetY) * (this.scale / prevScale);
    }
    this.render();
  }

  findNodeAt(x, y) {
    for (const node of this.nodes) {
      const dist = Math.hypot(x - node.x, y - node.y);
      if (dist <= node.radius + 6) return node;
    }
    return null;
  }

  zoomIn() {
    this.zoom(1.2);
  }

  zoomOut() {
    this.scale = Math.max(0.3, this.scale / 1.2);
    this.render();
  }

  resetView() {
    this.autoFit();
  }

  autoFit() {
    if (!this.canvas || this.nodes.length === 0) return;

    const parent = this.canvas.parentElement;
    const viewW = parent ? parent.clientWidth : 900;
    const viewH = parent ? parent.clientHeight : 650;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    this.nodes.forEach(n => {
      minX = Math.min(minX, n.x - n.radius - 80);
      maxX = Math.max(maxX, n.x + n.radius + 80);
      minY = Math.min(minY, n.y - n.radius - 40);
      maxY = Math.max(maxY, n.y + n.radius + 40);
    });

    const graphW = Math.max(100, maxX - minX);
    const graphH = Math.max(100, maxY - minY);

    const padding = 70;
    const scaleX = (viewW - padding * 2) / graphW;
    const scaleY = (viewH - padding * 2) / graphH;

    this.scale = Math.min(1.15, Math.max(0.5, Math.min(scaleX, scaleY)));

    const scaledW = graphW * this.scale;
    const scaledH = graphH * this.scale;

    this.offsetX = (viewW - scaledW) / 2 - minX * this.scale;
    this.offsetY = (viewH - scaledH) / 2 - minY * this.scale;

    this.render();
  }

  setCase(clinicalCase) {
    this.selectedCase = clinicalCase;
    this.firedRules = new Set();
    this.activeRuleId = null;
    this.currentTG = new Set(clinicalCase.gt || []);
    this.rpgData = window.MedicalGraphAlgorithms.buildMedicalRPG(clinicalCase);
    this.buildGraph();
    this.autoFit();
  }

  setSimulationState(firedRules, activeRuleId = null, tgSet = null) {
    this.firedRules = firedRules instanceof Set ? firedRules : new Set(firedRules || []);
    this.activeRuleId = activeRuleId;
    if (tgSet) {
      this.currentTG = tgSet instanceof Set ? tgSet : new Set(tgSet || []);
    }
    this.render();
  }

  buildGraph() {
    if (!this.selectedCase || !this.rpgData) return;

    this.nodes = [];
    this.edges = [];

    const nodeMap = new Map();
    const rules = this.rpgData.rules || [];

    // Tách luật thành 2 tầng: Tầng 1 (ra Hội chứng I) và Tầng 2 (ra Bệnh D)
    const stage1Rules = rules.filter(r => r.conclusion.startsWith("I"));
    const stage2Rules = rules.filter(r => !r.conclusion.startsWith("I"));

    const col1X = 220; // Tầng 1: Luật hội chứng
    const col2X = 680; // Tầng 2: Luật bệnh

    const spacingY1 = 85;
    const spacingY2 = 68;

    const startY1 = 100;
    const startY2 = 70;

    // 1. Tạo node luật Tầng 1
    stage1Rules.forEach((r, idx) => {
      const isR_GT = this.rpgData.rGtIds.has(r.id);
      const isR_KL = this.rpgData.rKlIds.has(r.id);
      const kcToR_KL = window.MedicalGraphAlgorithms.calculateRPGDistanceToR_KL(r.id, this.rpgData.rKlIds, this.rpgData.edges);

      const node = {
        id: r.id,
        label: r.id,
        name: r.name,
        description: r.description,
        ruleData: r,
        premises: r.premises,
        conclusion: r.conclusion,
        isR_GT,
        isR_KL,
        kcToR_KL,
        stage: 1,
        x: col1X,
        y: startY1 + idx * spacingY1,
        radius: 30
      };

      this.nodes.push(node);
      nodeMap.set(r.id, node);
    });
  }

    // 2. Tạo node luật Tầng 2
    stage2Rules.forEach((r, idx) => {
      const isR_GT = this.rpgData.rGtIds.has(r.id);
      const isR_KL = this.rpgData.rKlIds.has(r.id);
      const kcToR_KL = window.MedicalGraphAlgorithms.calculateRPGDistanceToR_KL(r.id, this.rpgData.rKlIds, this.rpgData.edges);

      const node = {
        id: r.id,
        label: r.id,
        name: r.name,
        description: r.description,
        ruleData: r,
        premises: r.premises,
        conclusion: r.conclusion,
        isR_GT,
        isR_KL,
        kcToR_KL,
        stage: 2,
        x: col2X,
        y: startY2 + idx * spacingY2,
        radius: 30
      };

      this.nodes.push(node);
      nodeMap.set(r.id, node);
    });

    // 3. Tạo các cung giữa các luật
    this.rpgData.edges.forEach(e => {
      const fromNode = nodeMap.get(e.from);
      const toNode = nodeMap.get(e.to);
      if (fromNode && toNode) {
        this.edges.push({
          from: fromNode,
          to: toNode,
          connectorFact: e.connectorFact,
          connectorName: e.connectorName,
          label: e.connectorFact
        });
      }
    });
  }

  _buildFPG() {
    const { targetRules, targetDiseases } = this._filterRulesAndDiseases();
    const intermediateIds = new Set(
      (this.kb.symptoms || []).filter(s => s.isIntermediate || String(s.id).startsWith("HC")).map(s => s.id)
    );

    const primitiveSymptoms = [];
    const intermediateSymptoms = [];

    const usedPremiseIds = new Set();
    targetRules.forEach(r => (r.premises || []).forEach(p => usedPremiseIds.add(p)));

    (this.kb.symptoms || []).forEach(s => {
      const isUsed = usedPremiseIds.has(s.id) || targetRules.some(r => r.conclusion === s.id);
      if (!isUsed) return;
      if (intermediateIds.has(s.id)) {
        intermediateSymptoms.push(s);
      } else {
        primitiveSymptoms.push(s);
      }
    });

    const colX = {
      primitives: 260,
      intermediates: 660,
      diseases: 1060
    };

    const nodeMap = new Map();
    this._layoutFactNodes(primitiveSymptoms, colX.primitives, "FACT", nodeMap);
    this._layoutFactNodes(intermediateSymptoms, colX.intermediates, "INTERMEDIATE", nodeMap);
    this._layoutDiseaseNodes(targetDiseases, colX.diseases, targetRules, nodeMap);

    // Xây dựng cung trực tiếp giữa các Sự kiện qua luật
    targetRules.forEach(r => {
      const targetNode = nodeMap.get(r.conclusion);
      if (!targetNode) return;

      const isRuleActive = this.firedRules.has(r.id);

      (r.premises || []).forEach(pId => {
        const sourceNode = nodeMap.get(pId);
        if (sourceNode) {
          this.edges.push({
            from: sourceNode,
            to: targetNode,
            isFired: sourceNode.isActive && isRuleActive,
            label: `${r.id} (${r.cf})`
          });
        }
      });
    });
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

    // Canvas Background
    ctx.fillStyle = isLight ? "#f8fafc" : "#0b1120";
    ctx.fillRect(0, 0, width, height);

    this._drawGrid(ctx, width, height, isLight);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.edges.forEach(edge => this.drawEdge(ctx, edge, isLight));
    this.nodes.forEach(node => this.drawNode(ctx, node, isLight));

    if (this.hoveredNode) {
      this.drawTooltip(ctx, this.hoveredNode, isLight);
    }

    ctx.restore();
  }

  _drawGrid(ctx, width, height, isLight) {
    ctx.save();
    ctx.fillStyle = isLight ? "rgba(100, 116, 139, 0.2)" : "rgba(148, 163, 184, 0.12)";
    const dotSize = 1.5;
    const dotGap = 28 * this.scale;
    const startX = (this.offsetX % dotGap);
    const startY = (this.offsetY % dotGap);

    for (let x = startX; x < width; x += dotGap) {
      for (let y = startY; y < height; y += dotGap) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Pan + Zoom
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // Vẽ nhãn phân tầng trên canvas
    this.drawStageHeaders(ctx, isLight);

    // 1. Vẽ các cung (Edges)
    this.edges.forEach(edge => {
      this.drawEdge(ctx, edge, isLight);
    });

    // 2. Vẽ các đỉnh (Nodes)
    this.nodes.forEach(node => {
      this.drawNode(ctx, node, isLight);
    });

    // 3. Tooltip khi hover
    if (this.hoveredNode) {
      this.drawTooltip(ctx, this.hoveredNode, isLight);
    }

    ctx.restore();
  }

  drawStageHeaders(ctx, isLight) {
    ctx.save();
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = isLight ? "#64748b" : "#94a3b8";
    ctx.textAlign = "center";

    // Cột 1
    ctx.fillText("TẦNG 1: LUẬT XÁC ĐỊNH HỘI CHỨNG (I)", 220, 45);
    // Cột 2
    ctx.fillText("TẦNG 2: LUẬT CHẨN ĐOÁN BỆNH LÝ (D)", 680, 45);
    ctx.restore();
  }

  drawEdge(ctx, edge, isLight = false) {
    const from = edge.from;
    const to = edge.to;

    const isSelectedEdge = this.selectedNode && (edge.from.id === this.selectedNode.id || edge.to.id === this.selectedNode.id);
    const isHoveredEdge = this.hoveredNode && (edge.from.id === this.hoveredNode.id || edge.to.id === this.hoveredNode.id);
    const isPathToGoal = from.isR_GT && to.isR_KL;
    const isFromFired = this.firedRules.has(edge.from.id);
    const isEdgeActive = isFromFired && (this.activeRuleId === edge.to.id || this.firedRules.has(edge.to.id));
    const isHighlighted = isSelectedEdge || isHoveredEdge || isPathToGoal || isEdgeActive;

    ctx.save();

    const startX = from.x + from.radius;
    const startY = from.y;
    const endX = to.x - to.radius - 5;
    const endY = to.y;

    const cp1X = startX + (endX - startX) * 0.5;
    const cp2X = cp1X;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1X, startY, cp2X, endY, endX, endY);

    if (isEdgeActive) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3.2;
      ctx.shadowColor = "rgba(16, 185, 129, 0.85)";
      ctx.shadowBlur = 10;
    } else if (isHighlighted) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.2;
      ctx.shadowColor = "rgba(56, 189, 248, 0.75)";
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = isLight ? "rgba(100, 116, 139, 0.65)" : "rgba(148, 163, 184, 0.45)";
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 0;
    }

    ctx.stroke();
    this.drawArrowHead(ctx, cp2X, endY, endX, endY, isFired ? "#10b981" : (isLight ? "#64748b" : "#94a3b8"));

    if (label) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2 - 6;
      ctx.fillStyle = isLight ? "#475569" : "#94a3b8";
      ctx.font = "bold 9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, midX, midY);
    }

    // Mũi tên
    const arrowAngle = Math.atan2(endY - cp2Y, endX - cp2X);
    const arrowColor = isEdgeActive ? "#10b981" : (isHighlighted ? "#38bdf8" : (isLight ? "#475569" : "#94a3b8"));
    this.drawArrowHeadAt(ctx, endX, endY, arrowAngle, arrowColor);

    // Nhãn hội chứng cầu nối trên cung
    if (edge.connectorFact) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      this.drawEdgeLabel(ctx, edge.connectorFact, midX, midY, isLight, isHighlighted, isEdgeActive);
    }

    ctx.restore();
  }

  drawArrowHeadAt(ctx, x, y, angle, color) {
    const headLen = 10;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - headLen * Math.cos(angle - Math.PI / 7),
      y - headLen * Math.sin(angle - Math.PI / 7)
    );
    ctx.lineTo(
      x - headLen * Math.cos(angle + Math.PI / 7),
      y - headLen * Math.sin(angle + Math.PI / 7)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawEdgeLabel(ctx, text, x, y, isLight, isHighlighted, isEdgeActive = false) {
    ctx.save();
    ctx.font = "bold 11px 'JetBrains Mono', Consolas, monospace";
    const textWidth = ctx.measureText(text).width;
    const padX = 5;
    const padY = 3;

    ctx.fillStyle = isLight ? "#ffffff" : "#1e293b";
    ctx.strokeStyle = isEdgeActive ? "#10b981" : (isHighlighted ? "#38bdf8" : (isLight ? "#cbd5e1" : "#475569"));
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - padX, y - 8 - padY, textWidth + padX * 2, 16 + padY, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isEdgeActive ? "#10b981" : (isHighlighted ? "#0284c7" : (isLight ? "#334155" : "#cbd5e1"));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  drawNode(ctx, node, isLight = false) {
    const isSelected = this.selectedNode && this.selectedNode.id === node.id;
    const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
    const isFired = this.firedRules.has(node.id);
    const isActive = this.activeRuleId === node.id;

    ctx.save();

    // 1. Nền vòng tròn
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

    if (isFired) {
      // Luật đã kích hoạt trong tiến trình suy diễn
      ctx.fillStyle = isLight ? "#ecfdf5" : "#064e3b";
    } else if (node.isR_GT) {
      // Luật thỏa mãn ngay từ triệu chứng ban đầu (Slide 23: Sọc ngang vàng)
      ctx.fillStyle = isLight ? "#fef3c7" : "#3b2a0c";
    } else if (node.isR_KL) {
      // Luật đạt kết luận chẩn đoán bệnh mục tiêu (Slide 23: Sọc chéo đỏ)
      ctx.fillStyle = isLight ? "#ffe4e6" : "#43141d";
    } else {
      ctx.fillStyle = isLight ? "#ffffff" : "#1e293b";
    }
    ctx.fill();

    // 2. Vẽ HATCHING PATTERN chuẩn Slide 23 TS. Nguyễn Quốc Tuấn
    if (!isFired) {
      if (node.isR_GT) {
        this.drawHatchLines(ctx, node, "HORIZONTAL", isLight ? "#d97706" : "#f59e0b");
      }
      if (node.isR_KL) {
        this.drawHatchLines(ctx, node, "DIAGONAL", isLight ? "#e11d48" : "#f43f5e");
      }
    }

    // 3. Viền
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

    if (isActive) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 4;
      ctx.shadowColor = "rgba(16, 185, 129, 0.95)";
      ctx.shadowBlur = 18;
    } else if (isFired) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(16, 185, 129, 0.65)";
      ctx.shadowBlur = 10;
    } else if (isSelected || isHovered) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
      ctx.shadowBlur = 12;
    } else if (node.isR_GT) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.5;
    } else if (node.isR_KL) {
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = isLight ? "#64748b" : "#94a3b8";
      ctx.lineWidth = 2;
    }
    ctx.stroke();

    // 4. Nhãn tên luật: R01, R02...
    ctx.font = "bold 15px 'JetBrains Mono', Consolas, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (isFired) {
      ctx.fillStyle = "#10b981";
      ctx.fillText(node.label, node.x, node.y);
    } else if (node.isR_GT || node.isR_KL) {
      ctx.strokeStyle = isLight ? "#ffffff" : "#000000";
      ctx.lineWidth = 3.5;
      ctx.strokeText(node.label, node.x, node.y);
      ctx.fillStyle = isLight ? "#0f172a" : "#ffffff";
      ctx.fillText(node.label, node.x, node.y);
    } else {
      ctx.fillStyle = isLight ? "#1e293b" : "#f8fafc";
      ctx.fillText(node.label, node.x, node.y);
    }

    // 5. Badge khoảng cách heuristic KC(R, R_KL)
    const kcText = node.kcToR_KL === Infinity ? "h^ = ∞" : `h^ = ${node.kcToR_KL}`;
    ctx.font = "bold 10px 'Segoe UI Symbol', 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = isFired ? "#10b981" : (node.kcToR_KL === 0 ? "#10b981" : (node.kcToR_KL === Infinity ? "#94a3b8" : "#38bdf8"));
    ctx.textAlign = "center";
    ctx.fillText(kcText, node.x, node.y + node.radius + 15);

    // Badge r in R_GT hoặc r in R_KL hoặc VET
    if (isFired) {
      this.drawBadgeText(ctx, "✓ VET", node.x, node.y - node.radius - 8, "#10b981", isLight);
    } else if (node.isR_GT) {
      this.drawBadgeText(ctx, "R ∈ R_GT", node.x, node.y - node.radius - 8, "#f59e0b", isLight);
    } else if (node.isR_KL) {
      this.drawBadgeText(ctx, "R ∈ R_KL", node.x, node.y - node.radius - 8, "#f43f5e", isLight);
    }

    ctx.restore();
  }

  drawHatchLines(ctx, node, type, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.65;

    const gap = 6;
    const r = node.radius;

    if (type === "HORIZONTAL") {
      for (let y = node.y - r; y <= node.y + r; y += gap) {
        ctx.beginPath();
        ctx.moveTo(node.x - r, y);
        ctx.lineTo(node.x + r, y);
        ctx.stroke();
      }
    } else if (type === "DIAGONAL") {
      for (let offset = -r * 2; offset <= r * 2; offset += gap) {
        ctx.beginPath();
        ctx.moveTo(node.x - r + offset, node.y - r);
        ctx.lineTo(node.x + r + offset, node.y + r);
        ctx.stroke();
      }
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
    const shortDis = node.subLabel.length > 20 ? node.subLabel.substring(0, 18) + "..." : node.subLabel;
    ctx.fillText(shortDis, node.x, y + 28);
  }

  drawBadgeText(ctx, text, x, y, color, isLight) {
    ctx.save();
    ctx.font = "bold 9px 'Segoe UI Symbol', 'Segoe UI', Arial, sans-serif";
    const w = ctx.measureText(text).width + 8;
    ctx.fillStyle = isLight ? "#ffffff" : "#1e293b";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 6, w, 13, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  drawTooltip(ctx, node, isLight = false) {
    ctx.save();
    const line1 = `Luật Y tế: [${node.id}] - ${node.name}`;
    const line2 = `Nội dung: ${(node.premises || []).join(" ∧ ")} → ${node.conclusion}`;
    const line3 = `Độ đo Heuristic: h^(${node.id}) = KC(${node.id}, R_KL) = ${node.kcToR_KL === Infinity ? "∞" : node.kcToR_KL} bước tới bệnh kết luận`;

    ctx.font = "12px sans-serif";
    const maxW = Math.max(
      ctx.measureText(line1).width,
      ctx.measureText(line2).width,
      ctx.measureText(line3).width
    );
    const boxW = maxW + 20;
    const boxH = 68;
    const boxX = node.x - boxW / 2;
    const boxY = node.y - node.radius - boxH - 14;

    ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.96)" : "rgba(15, 23, 42, 0.95)";
    ctx.strokeStyle = isLight ? "#94a3b8" : "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isLight ? "#0f172a" : "#f8fafc";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(line1, boxX + 10, boxY + 8);

    ctx.font = "11px sans-serif";
    ctx.fillStyle = isLight ? "#475569" : "#94a3b8";
    ctx.fillText(line2, boxX + 10, boxY + 28);

    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = node.kcToR_KL === 0 ? "#10b981" : "#0284c7";
    ctx.fillText(line3, boxX + 10, boxY + 46);

    ctx.restore();
  }
}

if (typeof window !== "undefined") {
  window.RPGVisualizer = RPGVisualizer;
}
