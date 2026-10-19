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
        const found = this._findNodeAt(mouseX, mouseY);
        if (this.hoveredNode !== found) {
          this.hoveredNode = found;
          this.canvas.style.cursor = found ? "pointer" : "grab";
          this.render();
        }
      }
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });
  }

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

  zoomIn() {
    this.zoom(1.2);
  }

  zoomOut() {
    this.zoom(0.8);
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
      const extraLeft = (n.type === "FACT" || n.type === "INTERMEDIATE") ? 220 : (n.width ? n.width / 2 : 30);
      const extraRight = n.type === "DISEASE" ? 120 : (n.width ? n.width / 2 : 30);
      const extraY = n.height ? n.height / 2 : 30;

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

    this.scale = Math.min(1.15, Math.max(0.4, Math.min(scaleX, scaleY)));
    const scaledW = graphW * this.scale;
    const scaledH = graphH * this.scale;

    this.offsetX = (viewW - scaledW) / 2 - minX * this.scale;
    this.offsetY = (viewH - scaledH) / 2 - minY * this.scale;

    this.render();
  }

  setData(knowledgeBase, activeFacts = new Set(), firedRules = new Set(), diseaseFilter = "ALL") {
    this.kb = knowledgeBase;
    this.activeFacts = activeFacts instanceof Set ? activeFacts : new Set(Object.keys(activeFacts || {}));
    this.firedRules = firedRules instanceof Set ? firedRules : new Set((firedRules || []).map(r => r.ruleId || r));
    this.selectedDiseaseFilter = diseaseFilter;

    this.buildGraph();
    this.autoFit();
  }

  _filterRulesAndDiseases() {
    let targetRules = this.kb.rules || [];
    let targetDiseases = this.kb.diseases || [];

    if (this.selectedDiseaseFilter !== "ALL") {
      const disId = this.selectedDiseaseFilter;
      const directRules = targetRules.filter(r => r.conclusion === disId);
      const relatedPremises = new Set();
      directRules.forEach(r => (r.premises || []).forEach(p => relatedPremises.add(p)));

      // Thêm luật suy ra các hội chứng trung gian được dùng bởi directRules
      const tier1Rules = targetRules.filter(r => relatedPremises.has(r.conclusion));
      targetRules = [...directRules, ...tier1Rules];
      targetDiseases = (this.kb.diseases || []).filter(d => d.id === disId);
    }
    return { targetRules, targetDiseases };
  }

  buildGraph() {
    if (!this.kb) return;
    this.nodes = [];
    this.edges = [];

    if (this.graphMode === "FPG") {
      this._buildFPG();
    } else {
      this._buildRPG();
    }
  }

  _buildRPG() {
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

    const tier1Rules = targetRules.filter(r => intermediateIds.has(r.conclusion));
    const tier2Rules = targetRules.filter(r => !intermediateIds.has(r.conclusion));

    const colX = {
      primitives: 220,
      tier1Rules: 520,
      intermediates: 780,
      tier2Rules: 1040,
      diseases: 1340
    };

    const nodeMap = new Map();
    this._layoutFactNodes(primitiveSymptoms, colX.primitives, "FACT", nodeMap);
    this._layoutRuleNodes(tier1Rules, colX.tier1Rules, nodeMap);
    this._layoutFactNodes(intermediateSymptoms, colX.intermediates, "INTERMEDIATE", nodeMap);
    this._layoutRuleNodes(tier2Rules, colX.tier2Rules, nodeMap);
    this._layoutDiseaseNodes(targetDiseases, colX.diseases, targetRules, nodeMap);

    this._buildRPGEllipticalArcs(targetRules, nodeMap);
  }

  _layoutFactNodes(list, x, type, nodeMap) {
    const spacing = list.length > 12 ? 55 : 68;
    const startY = 80;
    list.forEach((item, idx) => {
      const node = {
        id: item.id,
        type,
        label: item.id,
        subLabel: item.name,
        x,
        y: startY + idx * spacing,
        radius: 20,
        data: item,
        isActive: this.activeFacts.has(item.id)
      };
      this.nodes.push(node);
      nodeMap.set(item.id, node);
    });
  }

  _layoutRuleNodes(list, x, nodeMap) {
    const spacing = list.length > 8 ? 65 : 80;
    const startY = 90;
    list.forEach((r, idx) => {
      const node = {
        id: r.id,
        type: "RULE",
        label: r.id,
        subLabel: `CF: ${r.cf}`,
        x,
        y: startY + idx * spacing,
        width: 88,
        height: 38,
        data: r,
        isActive: this.firedRules.has(r.id)
      };
      this.nodes.push(node);
      nodeMap.set(r.id, node);
    });
  }

  _layoutDiseaseNodes(list, x, targetRules, nodeMap) {
    const spacing = list.length > 5 ? 90 : 120;
    const startY = 80;
    list.forEach((d, idx) => {
      const isDiseaseActive = targetRules.some(r => r.conclusion === d.id && this.firedRules.has(r.id));
      const node = {
        id: d.id,
        type: "DISEASE",
        label: d.id,
        subLabel: d.name,
        x,
        y: startY + idx * spacing,
        width: 155,
        height: 52,
        data: d,
        isActive: isDiseaseActive
      };
      this.nodes.push(node);
      nodeMap.set(d.id, node);
    });
  }

  _buildRPGEllipticalArcs(targetRules, nodeMap) {
    targetRules.forEach(r => {
      const ruleNode = nodeMap.get(r.id);
      if (!ruleNode) return;

      (r.premises || []).forEach(pId => {
        const fromNode = nodeMap.get(pId);
        if (fromNode) {
          this.edges.push({
            from: fromNode,
            to: ruleNode,
            isFired: fromNode.isActive && ruleNode.isActive,
            label: ""
          });
        }
      });

      const toNode = nodeMap.get(r.conclusion);
      if (toNode) {
        this.edges.push({
          from: ruleNode,
          to: toNode,
          isFired: ruleNode.isActive,
          label: ""
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
    ctx.fillStyle = isLight ? "rgba(100, 116, 139, 0.18)" : "rgba(148, 163, 184, 0.12)";
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
  }

  drawEdge(ctx, edge, isLight = false) {
    const { from, to, isFired, label } = edge;
    ctx.save();
    ctx.beginPath();

    const startX = from.x + (from.type === "RULE" ? from.width / 2 : (from.radius || from.width / 2));
    const startY = from.y;
    const endX = to.x - (to.type === "RULE" ? to.width / 2 : (to.radius || to.width / 2));
    const endY = to.y;

    const cp1X = startX + (endX - startX) * 0.5;
    const cp2X = cp1X;

    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1X, startY, cp2X, endY, endX, endY);

    if (isFired) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "rgba(16, 185, 129, 0.7)";
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = isLight ? "rgba(148, 163, 184, 0.6)" : "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = 1.5;
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

    if (node.type === "FACT") {
      this._drawFactCircle(ctx, node, isLight, "#059669", "#34d399", "#94a3b8");
    } else if (node.type === "INTERMEDIATE") {
      this._drawFactCircle(ctx, node, isLight, "#7c3aed", "#a78bfa", "#8b5cf6");
    } else if (node.type === "RULE") {
      this._drawRuleRect(ctx, node, isLight);
    } else if (node.type === "DISEASE") {
      this._drawDiseaseRect(ctx, node, isLight);
    }

    ctx.restore();
  }

  _drawFactCircle(ctx, node, isLight, activeBg, activeStroke, idleStroke) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

    if (node.isActive) {
      ctx.fillStyle = activeBg;
      ctx.strokeStyle = activeStroke;
      ctx.lineWidth = 3;
      ctx.shadowColor = activeStroke;
      ctx.shadowBlur = 14;
    } else {
      ctx.fillStyle = isLight ? "#ffffff" : "#1e293b";
      ctx.strokeStyle = isLight ? idleStroke : "#475569";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = node.isActive ? "#ffffff" : (isLight ? "#0f172a" : "#ffffff");
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.label, node.x, node.y);

    ctx.fillStyle = node.isActive ? (isLight ? "#047857" : "#34d399") : (isLight ? "#334155" : "#cbd5e1");
    ctx.font = (node.isActive ? "bold " : "") + "11px Inter, sans-serif";
    ctx.textAlign = "right";
    const shortName = node.subLabel.length > 28 ? node.subLabel.substring(0, 26) + "..." : node.subLabel;
    ctx.fillText(shortName, node.x - node.radius - 8, node.y);
  }

  _drawRuleRect(ctx, node, isLight) {
    const x = node.x - node.width / 2;
    const y = node.y - node.height / 2;

    ctx.beginPath();
    ctx.roundRect(x, y, node.width, node.height, 8);

    if (node.isActive) {
      ctx.fillStyle = "#2563eb";
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(96, 165, 250, 0.85)";
      ctx.shadowBlur = 14;
    } else {
      ctx.fillStyle = isLight ? "#f1f5f9" : "#1e293b";
      ctx.strokeStyle = isLight ? "#94a3b8" : "#64748b";
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = node.isActive ? "#ffffff" : (isLight ? "#0f172a" : "#ffffff");
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(node.label, node.x, y + 6);

    ctx.fillStyle = node.isActive ? "#dbeafe" : (isLight ? "#2563eb" : "#93c5fd");
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText(node.subLabel, node.x, y + 21);
  }

  _drawDiseaseRect(ctx, node, isLight) {
    const x = node.x - node.width / 2;
    const y = node.y - node.height / 2;

    ctx.beginPath();
    ctx.roundRect(x, y, node.width, node.height, 10);

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

  drawTooltip(ctx, node, isLight = false) {
    ctx.save();
    let textTitle = `[${node.id}]`;
    let textDesc = node.subLabel || "";

    if (node.type === "FACT") {
      textTitle = `[${node.id}] Triệu chứng lâm sàng cơ sở`;
    } else if (node.type === "INTERMEDIATE") {
      textTitle = `[${node.id}] Hội chứng trung gian (Đa tầng)`;
    } else if (node.type === "RULE") {
      textTitle = `[${node.id}] ${node.data.name}`;
      textDesc = `${node.data.description || ''} (CF = ${node.data.cf})`;
    } else if (node.type === "DISEASE") {
      textTitle = `[${node.id}] ${node.subLabel}`;
      textDesc = `Mức độ: ${node.data.severity || 'Theo dõi y tế'}`;
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
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
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

if (typeof window !== "undefined") {
  window.RPGVisualizer = RPGVisualizer;
}
