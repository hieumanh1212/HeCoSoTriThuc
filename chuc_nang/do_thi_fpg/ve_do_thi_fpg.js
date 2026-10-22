/**
 * FEATURE MODULE: FPG VISUALIZER (FACTS PRECEDENCE GRAPH) - BÀI TOÁN Y TẾ
 * Áp dụng lý thuyết: "Mô tơ suy diễn" - TS. Nguyễn Quốc Tuấn (Slide 18 - 21)
 * Trực quan hóa Đồ thị liên hệ trước sự kiện: Triệu chứng -> Hội chứng -> Bệnh kết luận
 */

class FPGVisualizer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.selectedCase = null;
    this.fpgData = null;
    this.scale = 0.95;
    this.offsetX = 40;
    this.offsetY = 40;

    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hoveredNode = null;
    this.selectedNode = null;

    // Trạng thái mô phỏng suy diễn tiến y tế
    this.currentTG = new Set();
    this.activeRuleId = null;

    this.onNodeSelect = options.onNodeSelect || null;
    this.onNodeHover = options.onNodeHover || null;

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
      const dist = Math.hypot(x - node.x, y - node.y);
      if (dist <= node.radius + 6) return node;
    }
    return null;
  }

  zoomIn() {
    this.scale = Math.min(2.5, this.scale * 1.2);
    this.render();
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

    this.scale = Math.min(1.15, Math.max(0.45, Math.min(scaleX, scaleY)));

    const scaledW = graphW * this.scale;
    const scaledH = graphH * this.scale;

    this.offsetX = (viewW - scaledW) / 2 - minX * this.scale;
    this.offsetY = (viewH - scaledH) / 2 - minY * this.scale;

    this.render();
  }

  setCase(clinicalCase) {
    this.selectedCase = clinicalCase;
    this.currentTG = new Set(clinicalCase.gt || []);
    this.activeRuleId = null;
    this.fpgData = window.MedicalGraphAlgorithms.buildMedicalFPG(clinicalCase);
    this.buildGraph();
    this.autoFit();
  }

  setSimulationState(tgSet, activeRuleId = null) {
    this.currentTG = tgSet instanceof Set ? tgSet : new Set(tgSet || []);
    this.activeRuleId = activeRuleId;
    this.render();
  }

  buildGraph() {
    if (!this.selectedCase || !this.fpgData) return;

    this.nodes = [];
    this.edges = [];

    const nodeMap = new Map();
    const klSet = this.fpgData.klSet;

    // Phân loại sự kiện thành 3 cột kiến trúc FPG y tế:
    // Cột 1: Triệu chứng lâm sàng (Symptoms - S)
    // Cột 2: Hội chứng trung gian (Intermediate - I)
    // Cột 3: Bệnh kết luận (Diseases - D)
    const symptoms = this.fpgData.nodes.filter(n => n.type === "SYMPTOM");
    const intermediates = this.fpgData.nodes.filter(n => n.type === "INTERMEDIATE");
    const diseases = this.fpgData.nodes.filter(n => n.type === "DISEASE");

    const col1X = 180;
    const col2X = 520;
    const col3X = 860;

    const symSpacing = symptoms.length > 12 ? 46 : 56;
    const interSpacing = 90;
    const disSpacing = 85;

    const symStartY = 75;
    const interStartY = 110;
    const disStartY = 95;

    // 1. Tạo node Triệu chứng
    symptoms.forEach((s, idx) => {
      const distToKL = window.MedicalGraphAlgorithms.calculateFPGDistanceToKL(s.id, klSet, this.fpgData.edges);
      const node = {
        ...s,
        distToKL,
        x: col1X,
        y: symStartY + idx * symSpacing,
        radius: 24
      };
      this.nodes.push(node);
      nodeMap.set(s.id, node);
    });

    // 2. Tạo node Hội chứng trung gian
    intermediates.forEach((im, idx) => {
      const distToKL = window.MedicalGraphAlgorithms.calculateFPGDistanceToKL(im.id, klSet, this.fpgData.edges);
      const node = {
        ...im,
        distToKL,
        x: col2X,
        y: interStartY + idx * interSpacing,
        radius: 28
      };
      this.nodes.push(node);
      nodeMap.set(im.id, node);
    });

    // 3. Tạo node Bệnh kết luận
    diseases.forEach((d, idx) => {
      const distToKL = window.MedicalGraphAlgorithms.calculateFPGDistanceToKL(d.id, klSet, this.fpgData.edges);
      const node = {
        ...d,
        distToKL,
        x: col3X,
        y: disStartY + idx * disSpacing,
        radius: 30
      };
      this.nodes.push(node);
      nodeMap.set(d.id, node);
    });

    // 4. Tạo cung có hướng gán nhãn luật R
    this.fpgData.edges.forEach(e => {
      const fromNode = nodeMap.get(e.from);
      const toNode = nodeMap.get(e.to);
      if (fromNode && toNode) {
        this.edges.push({
          from: fromNode,
          to: toNode,
          ruleId: e.ruleId,
          label: e.ruleId
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

    // Canvas Background
    ctx.fillStyle = isLight ? "#f8fafc" : "#0b1120";
    ctx.fillRect(0, 0, width, height);

    // Dot Grid
    ctx.save();
    ctx.fillStyle = isLight ? "rgba(100, 116, 139, 0.2)" : "rgba(148, 163, 184, 0.12)";
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

    // Pan + Zoom
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // Tiêu đề 3 cột phân tầng FPG y tế
    this.drawFPGHeaders(ctx, isLight);

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

  drawFPGHeaders(ctx, isLight) {
    ctx.save();
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = isLight ? "#64748b" : "#94a3b8";
    ctx.textAlign = "center";

    ctx.fillText("CỘT 1: TRIỆU CHỨNG LÂM SÀNG (S)", 180, 40);
    ctx.fillText("CỘT 2: HỘI CHỨNG TRUNG GIAN (I)", 520, 40);
    ctx.fillText("CỘT 3: BỆNH KẾT LUẬN (D)", 860, 40);
    ctx.restore();
  }

  drawEdge(ctx, edge, isLight = false) {
    const from = edge.from;
    const to = edge.to;

    const isRuleActive = this.activeRuleId && edge.ruleId === this.activeRuleId;
    const isNodeActive = this.currentTG.has(from.id) && this.currentTG.has(to.id);
    const isSelectedEdge = this.selectedNode && (edge.from.id === this.selectedNode.id || edge.to.id === this.selectedNode.id);
    const isHoveredEdge = this.hoveredNode && (edge.from.id === this.hoveredNode.id || edge.to.id === this.hoveredNode.id);

    const isFired = isRuleActive || isNodeActive;
    const isHighlighted = isFired || isSelectedEdge || isHoveredEdge;

    ctx.save();

    const startX = from.x + from.radius;
    const startY = from.y;
    const endX = to.x - to.radius - 5;
    const endY = to.y;

    const cp1X = startX + (endX - startX) * 0.5;
    const cp1Y = startY;
    const cp2X = startX + (endX - startX) * 0.5;
    const cp2Y = endY;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);

    if (isRuleActive) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "rgba(16, 185, 129, 0.85)";
      ctx.shadowBlur = 12;
    } else if (isHighlighted) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(56, 189, 248, 0.7)";
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = isLight ? "rgba(100, 116, 139, 0.65)" : "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 0;
    }

    ctx.stroke();

    // Mũi tên
    const arrowAngle = Math.atan2(endY - cp2Y, endX - cp2X);
    const arrowColor = isRuleActive ? "#10b981" : (isHighlighted ? "#38bdf8" : (isLight ? "#475569" : "#94a3b8"));
    this.drawArrowHeadAt(ctx, endX, endY, arrowAngle, arrowColor);

    // Nhãn mã luật R trên cung
    if (edge.label) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      this.drawEdgeLabel(ctx, edge.label, midX, midY, isLight, isRuleActive, isHighlighted);
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

  drawEdgeLabel(ctx, text, x, y, isLight, isRuleActive, isHighlighted) {
    ctx.save();
    ctx.font = "bold 11px 'JetBrains Mono', Consolas, monospace";
    const textWidth = ctx.measureText(text).width;
    const padX = 5;
    const padY = 3;

    ctx.fillStyle = isLight ? "#ffffff" : "#1e293b";
    ctx.strokeStyle = isRuleActive ? "#10b981" : (isHighlighted ? "#38bdf8" : (isLight ? "#cbd5e1" : "#475569"));
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - padX, y - 8 - padY, textWidth + padX * 2, 16 + padY, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isRuleActive ? "#10b981" : (isHighlighted ? "#0284c7" : (isLight ? "#334155" : "#cbd5e1"));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  drawNode(ctx, node, isLight = false) {
    const isSelected = this.selectedNode && this.selectedNode.id === node.id;
    const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
    const isInTG = this.currentTG.has(node.id);

    ctx.save();

    // 1. Vòng tròn nền
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

    if (node.isGT) {
      // Triệu chứng ban đầu của ca bệnh f in GT (Slide 19: Sọc ngang vàng)
      ctx.fillStyle = isLight ? "#fef3c7" : "#3b2a0c";
    } else if (node.isKL) {
      // Bệnh mục tiêu chẩn đoán f in KL (Slide 19: Sọc chéo đỏ)
      ctx.fillStyle = isLight ? "#ffe4e6" : "#43141d";
    } else if (isInTG) {
      // Đã nạp vào TG trong suy diễn
      ctx.fillStyle = isLight ? "#ecfdf5" : "#064e3b";
    } else {
      ctx.fillStyle = isLight ? "#ffffff" : "#1e293b";
    }
    ctx.fill();

    // 2. Vẽ HATCH PATTERN chuẩn Slide 19 TS. Nguyễn Quốc Tuấn
    if (node.isGT) {
      this.drawHatchLines(ctx, node, "HORIZONTAL", isLight ? "#d97706" : "#f59e0b");
    }
    if (node.isKL) {
      this.drawHatchLines(ctx, node, "DIAGONAL", isLight ? "#e11d48" : "#f43f5e");
    }

    // 3. Viền
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

    if (isInTG) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(16, 185, 129, 0.8)";
      ctx.shadowBlur = 10;
    } else if (isSelected || isHovered) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
      ctx.shadowBlur = 12;
    } else if (node.isGT) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.5;
    } else if (node.isKL) {
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = isLight ? "#64748b" : "#94a3b8";
      ctx.lineWidth = 2;
    }
    ctx.stroke();

    // 4. Nhãn tên sự kiện: S01, I01, D01...
    ctx.font = "bold 14px 'JetBrains Mono', Consolas, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (node.isGT || node.isKL) {
      ctx.strokeStyle = isLight ? "#ffffff" : "#000000";
      ctx.lineWidth = 3.5;
      ctx.strokeText(node.label, node.x, node.y);
      ctx.fillStyle = isLight ? "#0f172a" : "#ffffff";
      ctx.fillText(node.label, node.x, node.y);
    } else {
      ctx.fillStyle = isInTG ? "#10b981" : (isLight ? "#1e293b" : "#f8fafc");
      ctx.fillText(node.label, node.x, node.y);
    }

    // 5. Badge khoảng cách heuristic KC(f, KL)
    const distText = node.distToKL === Infinity ? "KC = ∞" : `KC = ${node.distToKL}`;
    ctx.font = "bold 10px 'Segoe UI Symbol', 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = node.distToKL === 0 ? "#10b981" : (node.distToKL === Infinity ? "#94a3b8" : "#38bdf8");
    ctx.textAlign = "center";
    ctx.fillText(distText, node.x, node.y + node.radius + 15);

    // Badge f in GT hoặc f in KL
    if (node.isGT) {
      this.drawBadgeText(ctx, "f ∈ GT", node.x, node.y - node.radius - 8, "#f59e0b", isLight);
    } else if (node.isKL) {
      this.drawBadgeText(ctx, "f ∈ KL", node.x, node.y - node.radius - 8, "#f43f5e", isLight);
    } else if (isInTG) {
      this.drawBadgeText(ctx, "f ∈ TG", node.x, node.y - node.radius - 8, "#10b981", isLight);
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

    ctx.restore();
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
    const typeLabel = node.type === "SYMPTOM" ? "Triệu chứng" : (node.type === "INTERMEDIATE" ? "Hội chứng trung gian" : "Bệnh kết luận");
    const line1 = `[${node.id}] ${node.name} (${typeLabel})`;
    const line2 = `Trạng thái: ${node.isGT ? "Triệu chứng ban đầu (f ∈ GT)" : ""}${node.isKL ? "Bệnh mục tiêu (f ∈ KL)" : ""}${!node.isGT && !node.isKL ? "Sự kiện trung gian" : ""}`;
    const line3 = `KC tới Bệnh đích: KC(${node.id}, KL) = ${node.distToKL === Infinity ? "∞" : node.distToKL} bước suy diễn`;

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
    ctx.fillStyle = node.distToKL === 0 ? "#10b981" : "#0284c7";
    ctx.fillText(line3, boxX + 10, boxY + 46);

    ctx.restore();
  }
}

if (typeof window !== "undefined") {
  window.FPGVisualizer = FPGVisualizer;
}
