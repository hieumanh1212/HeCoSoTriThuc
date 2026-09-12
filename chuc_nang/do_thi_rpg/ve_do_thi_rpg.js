/**
 * FEATURE MODULE: RPG VISUALIZER (RULE PETRI GRAPH)
 * Trực quan hóa Mạng Petri Luật sinh: Sự kiện (Place) -> Luật (Transition) -> Kết luận (Goal)
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
        let found = null;
        for (const node of this.nodes) {
          if (node.type === "FACT") {
            const dist = Math.hypot(mouseX - node.x, mouseY - node.y);
            if (dist <= node.radius + 6) {
              found = node;
              break;
            }
          } else {
            if (
              mouseX >= node.x - node.width / 2 - 4 &&
              mouseX <= node.x + node.width / 2 + 4 &&
              mouseY >= node.y - node.height / 2 - 4 &&
              mouseY <= node.y + node.height / 2 + 4
            ) {
              found = node;
              break;
            }
          }
        }

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
    const viewH = parent ? parent.clientHeight : 650;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    this.nodes.forEach(n => {
      const extraLeft = n.type === "FACT" ? 220 : (n.width ? n.width / 2 : 30);
      const extraRight = n.type === "DISEASE" ? 90 : (n.width ? n.width / 2 : 30);
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

  buildGraph() {
    if (!this.kb) return;

    this.nodes = [];
    this.edges = [];

    let targetRules = this.kb.rules || [];
    let targetDiseases = this.kb.diseases || [];

    if (this.selectedDiseaseFilter !== "ALL") {
      targetRules = (this.kb.rules || []).filter(r => r.conclusion === this.selectedDiseaseFilter);
      targetDiseases = (this.kb.diseases || []).filter(d => d.id === this.selectedDiseaseFilter);
    }

    const usedSymptomIds = new Set();
    targetRules.forEach(r => (r.premises || []).forEach(pId => usedSymptomIds.add(pId)));
    const targetSymptoms = (this.kb.symptoms || []).filter(s => usedSymptomIds.has(s.id));

    // Cột 1: Sự kiện (X = 260 để có đủ khoảng trống hiển thị tên triệu chứng bên trái)
    // Cột 2: Luật sinh (X = 620)
    // Cột 3: Kết luận / Bệnh (X = 980)
    const col1X = 260;
    const col2X = 620;
    const col3X = 980;

    const symSpacing = targetSymptoms.length > 12 ? 55 : 68;
    const ruleSpacing = targetRules.length > 10 ? 65 : 80;
    const disSpacing = targetDiseases.length > 5 ? 90 : 120;

    const symTotalHeight = targetSymptoms.length * symSpacing;
    const ruleTotalHeight = targetRules.length * ruleSpacing;
    const disTotalHeight = targetDiseases.length * disSpacing;
    const maxHeight = Math.max(symTotalHeight, ruleTotalHeight, disTotalHeight, 400);

    const symStartY = 60 + (maxHeight - symTotalHeight) / 2;
    const ruleStartY = 60 + (maxHeight - ruleTotalHeight) / 2;
    const disStartY = 60 + (maxHeight - disTotalHeight) / 2;

    const nodeMap = new Map();

    // 1. Tạo node Sự kiện / Triệu chứng (Place)
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

    // 2. Tạo node Luật sinh (Transition)
    targetRules.forEach((r, idx) => {
      const node = {
        id: r.id,
        type: "RULE",
        label: r.id,
        subLabel: `CF: ${r.cf}`,
        x: col2X,
        y: ruleStartY + idx * ruleSpacing,
        width: 88,
        height: 38,
        data: r,
        isActive: this.firedRules.has(r.id)
      };
      this.nodes.push(node);
      nodeMap.set(r.id, node);
    });

    // 3. Tạo node Bệnh / Kết luận (Goal)
    targetDiseases.forEach((d, idx) => {
      const isDiseaseActive = targetRules.some(r => r.conclusion === d.id && this.firedRules.has(r.id));
      const node = {
        id: d.id,
        type: "DISEASE",
        label: d.id,
        subLabel: d.name,
        x: col3X,
        y: disStartY + idx * disSpacing,
        width: 155,
        height: 52,
        data: d,
        isActive: isDiseaseActive
      };
      this.nodes.push(node);
      nodeMap.set(d.id, node);
    });

    // 4. Tạo các cung nối có hướng (Edges)
    targetRules.forEach(r => {
      const ruleNode = nodeMap.get(r.id);
      if (!ruleNode) return;

      (r.premises || []).forEach(pId => {
        const symNode = nodeMap.get(pId);
        if (symNode) {
          this.edges.push({
            from: symNode,
            to: ruleNode,
            isFired: symNode.isActive && ruleNode.isActive
          });
        }
      });

      const disNode = nodeMap.get(r.conclusion);
      if (disNode) {
        this.edges.push({
          from: ruleNode,
          to: disNode,
          isFired: ruleNode.isActive
        });
      }
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

    // Nền canvas
    ctx.fillStyle = isLight ? "#f8fafc" : "#0b1120";
    ctx.fillRect(0, 0, width, height);

    // Grid chấm nền
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

    // Vẽ Đồ thị với Phép biến hình (Pan + Zoom)
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
    const isFired = edge.isFired;

    ctx.save();
    ctx.beginPath();

    const startX = from.x + (from.type === "RULE" ? from.width / 2 : (from.radius || from.width / 2));
    const startY = from.y;
    const endX = to.x - (to.type === "RULE" ? to.width / 2 : (to.radius || to.width / 2));
    const endY = to.y;

    const cp1X = startX + (endX - startX) * 0.5;
    const cp1Y = startY;
    const cp2X = startX + (endX - startX) * 0.5;
    const cp2Y = endY;

    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);

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

    this.drawArrowHead(ctx, cp2X, cp2Y, endX, endY, isFired ? "#10b981" : (isLight ? "#64748b" : "#94a3b8"));
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
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

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
      const shortName = node.subLabel.length > 32 ? node.subLabel.substring(0, 30) + "..." : node.subLabel;
      ctx.fillText(shortName, node.x - node.radius - 10, node.y);

    } else if (node.type === "RULE") {
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

    } else if (node.type === "DISEASE") {
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

    ctx.restore();
  }

  drawTooltip(ctx, node, isLight = false) {
    ctx.save();
    let textTitle = "";
    let textDesc = "";

    if (node.type === "FACT") {
      textTitle = `[${node.id}] Triệu chứng`;
      textDesc = node.subLabel;
    } else if (node.type === "RULE") {
      textTitle = `[${node.id}] ${node.data.name}`;
      textDesc = `${node.data.description || ''} (Hệ số CF = ${node.data.cf})`;
    } else if (node.type === "DISEASE") {
      textTitle = `[${node.id}] ${node.subLabel}`;
      textDesc = `Mức độ: ${node.data.severity || 'Theo dõi y tế'}`;
    }

    ctx.font = "bold 12px Inter, sans-serif";
    const titleWidth = ctx.measureText(textTitle).width;
    ctx.font = "11px Inter, sans-serif";
    const descWidth = ctx.measureText(textDesc).width;
    const boxWidth = Math.max(titleWidth, descWidth, 200) + 24;
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
