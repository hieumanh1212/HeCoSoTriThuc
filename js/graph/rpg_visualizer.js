/**
 * MODULE TRỰC QUAN HÓA ĐỒ THỊ RPG (RULE PETRI GRAPH) & CÂY SUY DIỄN
 * Biểu diễn:
 * - Vị trí (Places / Facts): Nút tròn đại diện cho Triệu chứng (S) hoặc Bệnh kết luận (D)
 * - Chuyển tiếp (Transitions / Rules): Nút chữ nhật đại diện cho Luật sinh (R)
 * - Cung có hướng (Directed Arcs): Nối từ Sự kiện -> Luật -> Kết luận
 * - Trạng thái động (Tokens / Active State): Đánh dấu phát sáng các nút và đường đi đã kích hoạt
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

    // Viewport transform
    this.scale = 1;
    this.offsetX = 60;
    this.offsetY = 40;

    // Interaction state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hoveredNode = null;

    this.nodes = []; // { id, type: 'FACT'|'RULE'|'DISEASE', label, subLabel, x, y, width, height, radius, data }
    this.edges = []; // { from, to, isFired }

    this.initEvents();
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth * window.devicePixelRatio || 1200;
      this.canvas.height = (parent.clientHeight || 650) * window.devicePixelRatio;
      this.canvas.style.width = `${parent.clientWidth || 800}px`;
      this.canvas.style.height = `${parent.clientHeight || 650}px`;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    this.render();
  }

  initEvents() {
    if (!this.canvas) return;

    window.addEventListener("resize", () => this.resizeCanvas());

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
        // Kiểm tra hover node
        let found = null;
        for (const node of this.nodes) {
          if (node.type === "FACT") {
            const dist = Math.hypot(mouseX - node.x, mouseY - node.y);
            if (dist <= node.radius) {
              found = node;
              break;
            }
          } else {
            if (
              mouseX >= node.x - node.width / 2 &&
              mouseX <= node.x + node.width / 2 &&
              mouseY >= node.y - node.height / 2 &&
              mouseY <= node.y + node.height / 2
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

  zoomIn() {
    this.scale = Math.min(2.5, this.scale * 1.2);
    this.render();
  }

  zoomOut() {
    this.scale = Math.max(0.3, this.scale / 1.2);
    this.render();
  }

  resetView() {
    this.scale = 0.85;
    this.offsetX = 50;
    this.offsetY = 40;
    this.render();
  }

  /**
   * Thiết lập và xây dựng cấu trúc đồ thị phân lớp (Layered Petri Graph)
   */
  setData(knowledgeBase, activeFacts = new Set(), firedRules = new Set(), diseaseFilter = "ALL") {
    this.kb = knowledgeBase;
    this.activeFacts = activeFacts instanceof Set ? activeFacts : new Set(Object.keys(activeFacts || {}));
    this.firedRules = firedRules instanceof Set ? firedRules : new Set((firedRules || []).map(r => r.ruleId || r));
    this.selectedDiseaseFilter = diseaseFilter;

    this.buildGraph();
    this.render();
  }

  buildGraph() {
    if (!this.kb) return;

    this.nodes = [];
    this.edges = [];

    // Lọc theo bệnh nếu người dùng chọn
    let targetRules = this.kb.rules;
    let targetDiseases = this.kb.diseases;

    if (this.selectedDiseaseFilter !== "ALL") {
      targetRules = this.kb.rules.filter(r => r.conclusion === this.selectedDiseaseFilter);
      targetDiseases = this.kb.diseases.filter(d => d.id === this.selectedDiseaseFilter);
    }

    // Tập hợp các triệu chứng tham gia vào các luật được chọn
    const usedSymptomIds = new Set();
    targetRules.forEach(r => r.premises.forEach(pId => usedSymptomIds.add(pId)));
    const targetSymptoms = this.kb.symptoms.filter(s => usedSymptomIds.has(s.id));

    // Bố cục phân lớp 3 cột:
    // Cột 1: Triệu chứng (Places Fact) - x: 120
    // Cột 2: Luật (Transitions Rule) - x: 500
    // Cột 3: Bệnh kết luận (Places Disease) - x: 880

    const col1X = 140;
    const col2X = 520;
    const col3X = 940;

    const symSpacing = 65;
    const ruleSpacing = 75;
    const disSpacing = 110;

    const symStartY = 80;
    const ruleStartY = 80;
    const disStartY = 120;

    const nodeMap = new Map();

    // 1. Tạo nút Triệu chứng (Hình tròn)
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

    // 2. Tạo nút Luật sinh (Hình chữ nhật)
    targetRules.forEach((r, idx) => {
      const node = {
        id: r.id,
        type: "RULE",
        label: r.id,
        subLabel: `CF: ${r.cf}`,
        x: col2X,
        y: ruleStartY + idx * ruleSpacing,
        width: 80,
        height: 36,
        data: r,
        isActive: this.firedRules.has(r.id)
      };
      this.nodes.push(node);
      nodeMap.set(r.id, node);
    });

    // 3. Tạo nút Bệnh kết luận (Hình tròn lớn / Viên thuốc)
    targetDiseases.forEach((d, idx) => {
      const node = {
        id: d.id,
        type: "DISEASE",
        label: d.id,
        subLabel: d.name,
        x: col3X,
        y: disStartY + idx * disSpacing,
        width: 140,
        height: 48,
        data: d,
        isActive: targetRules.some(r => r.conclusion === d.id && this.firedRules.has(r.id))
      };
      this.nodes.push(node);
      nodeMap.set(d.id, node);
    });

    // 4. Tạo các cung có hướng (Arcs)
    targetRules.forEach(r => {
      const ruleNode = nodeMap.get(r.id);
      if (!ruleNode) return;

      // Cung từ Fact -> Rule
      r.premises.forEach(pId => {
        const symNode = nodeMap.get(pId);
        if (symNode) {
          this.edges.push({
            from: symNode,
            to: ruleNode,
            isFired: symNode.isActive && ruleNode.isActive
          });
        }
      });

      // Cung từ Rule -> Disease
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
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;
    const isLight = document.documentElement.getAttribute("data-theme") === "light";

    ctx.clearRect(0, 0, width, height);

    // Vẽ nền canvas theo theme
    ctx.fillStyle = isLight ? "#f8fafc" : "#0b1120";
    ctx.fillRect(0, 0, width, height);

    // Vẽ lưới nền hiện đại (Grid dots)
    ctx.save();
    ctx.fillStyle = isLight ? "rgba(100, 116, 139, 0.2)" : "rgba(148, 163, 184, 0.15)";
    const dotSize = 1.5;
    const dotGap = 30 * this.scale;
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

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // 1. Vẽ các cạnh nối (Edges / Arcs)
    this.edges.forEach(edge => {
      this.drawEdge(ctx, edge, isLight);
    });

    // 2. Vẽ các nút (Nodes)
    this.nodes.forEach(node => {
      this.drawNode(ctx, node, isLight);
    });

    // 3. Vẽ Tooltip nếu đang hover
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
      ctx.shadowColor = "rgba(16, 185, 129, 0.6)";
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = isLight ? "rgba(148, 163, 184, 0.65)" : "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
    }

    ctx.stroke();

    this.drawArrowHead(ctx, cp2X, cp2Y, endX, endY, isFired ? "#10b981" : (isLight ? "#64748b" : "#94a3b8"));
    ctx.restore();
  }

  drawArrowHead(ctx, fromX, fromY, toX, toY, color) {
    const headLen = 8;
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
        ctx.shadowColor = "rgba(52, 211, 153, 0.8)";
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = isLight ? "#ffffff" : "#1e293b";
        ctx.strokeStyle = isLight ? "#94a3b8" : "#475569";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = node.isActive ? "#ffffff" : (isLight ? "#0f172a" : "#ffffff");
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, node.x, node.y);

      ctx.fillStyle = node.isActive ? "#059669" : (isLight ? "#334155" : "#cbd5e1");
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      const shortName = node.subLabel.length > 28 ? node.subLabel.substring(0, 26) + "..." : node.subLabel;
      ctx.fillText(shortName, node.x - node.radius - 8, node.y);

    } else if (node.type === "RULE") {
      const x = node.x - node.width / 2;
      const y = node.y - node.height / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, node.width, node.height, 6);

      if (node.isActive) {
        ctx.fillStyle = "#2563eb";
        ctx.strokeStyle = "#60a5fa";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(96, 165, 250, 0.8)";
        ctx.shadowBlur = 12;
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
      ctx.fillText(node.label, node.x, y + 5);

      ctx.fillStyle = node.isActive ? "#dbeafe" : (isLight ? "#2563eb" : "#93c5fd");
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText(node.subLabel, node.x, y + 20);

    } else if (node.type === "DISEASE") {
      const x = node.x - node.width / 2;
      const y = node.y - node.height / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, node.width, node.height, 10);

      if (node.isActive) {
        ctx.fillStyle = "#dc2626";
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(248, 113, 113, 0.8)";
        ctx.shadowBlur = 14;
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
      ctx.fillText(node.label, node.x, y + 8);

      ctx.fillStyle = node.isActive ? "#fee2e2" : (isLight ? "#475569" : "#cbd5e1");
      ctx.font = "11px Inter, sans-serif";
      const shortDis = node.subLabel.length > 18 ? node.subLabel.substring(0, 16) + "..." : node.subLabel;
      ctx.fillText(shortDis, node.x, y + 26);
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
      textDesc = node.data.description;
    } else if (node.type === "DISEASE") {
      textTitle = `[${node.id}] ${node.subLabel}`;
      textDesc = `Mức độ: ${node.data.severity}`;
    }

    ctx.font = "bold 12px Inter, sans-serif";
    const titleWidth = ctx.measureText(textTitle).width;
    ctx.font = "11px Inter, sans-serif";
    const descWidth = ctx.measureText(textDesc).width;
    const boxWidth = Math.max(titleWidth, descWidth, 180) + 24;
    const boxHeight = 52;

    const boxX = node.x + 20;
    const boxY = node.y - 30;

    ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.96)" : "rgba(15, 23, 42, 0.95)";
    ctx.strokeStyle = isLight ? "#0284c7" : "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = isLight ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = isLight ? "#0284c7" : "#38bdf8";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(textTitle, boxX + 12, boxY + 18);

    ctx.fillStyle = isLight ? "#334155" : "#e2e8f0";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText(textDesc, boxX + 12, boxY + 36);

    ctx.restore();
  }
}

if (typeof window !== "undefined") {
  window.RPGVisualizer = RPGVisualizer;
}
