/**
 * TIỆN ÍCH DÙNG CHUNG: QUẢN LÝ GIAO DIỆN SÁNG / TỐI & TOAST NOTIFICATION
 * Tự động đồng bộ chế độ sáng / tối và cung cấp Notification góc phải màn hình cho toàn bộ hệ thống
 */

function khoiTaoTheme() {
  const savedTheme = localStorage.getItem("MED_EXPERT_THEME") || "dark";
  apDungTheme(savedTheme);

  const btnThemeToggle = document.getElementById("btnThemeToggle");
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", () => {
      const isCurrentlyLight = document.documentElement.getAttribute("data-theme") === "light";
      apDungTheme(isCurrentlyLight ? "dark" : "light");
    });
  }
}

function apDungTheme(theme) {
  const themeToggleIcon = document.getElementById("themeToggleIcon");
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    if (themeToggleIcon) {
      themeToggleIcon.className = "fa-solid fa-sun";
      themeToggleIcon.style.color = "#f59e0b";
    }
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (themeToggleIcon) {
      themeToggleIcon.className = "fa-solid fa-moon";
      themeToggleIcon.style.color = "";
    }
  }
  localStorage.setItem("MED_EXPERT_THEME", theme);
}

// ============================================================================
// COMPONENT TOAST NOTIFICATION GÓC PHẢI MÀN HÌNH (DÙNG CHUNG TOÀN HỆ THỐNG)
// ============================================================================

class ThongBaoHeThong {
  constructor() {
    this.container = null;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.initContainer());
      } else {
        this.initContainer();
      }
    }
  }

  initContainer() {
    if (typeof document === "undefined") return;
    let container = document.getElementById("toast-notification-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-notification-container";
      container.className = "toast-container-top-right";
      document.body.appendChild(container);
    }
    this.container = container;
  }

  show({ type = "info", title = "", message = "", duration = 4000 }) {
    if (!this.container) this.initContainer();
    if (!this.container) return;

    const toast = document.createElement("div");
    toast.className = `toast-card toast-${type}`;

    let iconClass = "fa-solid fa-circle-info";
    let defaultTitle = "Thông báo";
    if (type === "success") {
      iconClass = "fa-solid fa-circle-check";
      defaultTitle = "Thành công";
    } else if (type === "error") {
      iconClass = "fa-solid fa-circle-xmark";
      defaultTitle = "Lỗi";
    } else if (type === "warning") {
      iconClass = "fa-solid fa-triangle-exclamation";
      defaultTitle = "Cảnh báo";
    }

    const toastTitle = title || defaultTitle;

    toast.innerHTML = `
      <div class="toast-icon-wrap">
        <i class="${iconClass}"></i>
      </div>
      <div class="toast-content-wrap">
        <div class="toast-title">${toastTitle}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close-btn" title="Đóng">&times;</button>
      <div class="toast-progress-bar" style="animation-duration: ${duration}ms;"></div>
    `;

    const closeBtn = toast.querySelector(".toast-close-btn");
    const closeToast = () => {
      toast.classList.add("toast-hiding");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    };

    closeBtn.addEventListener("click", closeToast);
    this.container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("toast-show");
    });

    if (duration > 0) {
      setTimeout(() => {
        closeToast();
      }, duration);
    }
  }

  thanhCong(message, title = "Thành công", duration = 4000) {
    this.show({ type: "success", title, message, duration });
  }

  thatBai(message, title = "Lỗi", duration = 5000) {
    this.show({ type: "error", title, message, duration });
  }

  canhBao(message, title = "Cảnh báo", duration = 4500) {
    this.show({ type: "warning", title, message, duration });
  }

  thongTin(message, title = "Thông báo", duration = 4000) {
    this.show({ type: "info", title, message, duration });
  }
}

// Khởi tạo đối tượng toàn cục
window.ThongBao = new ThongBaoHeThong();
window.Toast = window.ThongBao;

// Ghi đè window.alert mặc định của trình duyệt để hiển thị Notification đẹp mắt
if (typeof window !== "undefined") {
  window.originalAlert = window.alert;
  window.alert = function (msg) {
    const text = String(msg || "");
    if (text.startsWith("❌") || text.toLowerCase().includes("lỗi") || text.toLowerCase().includes("thất bại")) {
      window.ThongBao.thatBai(text.replace(/^[❌\s]+/, ""), "Lỗi");
    } else if (text.startsWith("🎉") || text.toLowerCase().includes("thành công") || text.toLowerCase().includes("chúc mừng")) {
      window.ThongBao.thanhCong(text.replace(/^[🎉\s]+/, ""), "Thành công");
    } else if (text.toLowerCase().includes("vui lòng") || text.toLowerCase().includes("cảnh báo") || text.toLowerCase().includes("không thể")) {
      window.ThongBao.canhBao(text, "Cảnh báo");
    } else {
      window.ThongBao.thongTin(text, "Thông báo");
    }
  };
}

// ============================================================================
// COMPONENT SMART FLOATING TOOLTIP TOÀN CỤC (HIỂN THỊ TỨC THÌ KHI HOVER)
// ============================================================================

class SmartTooltipHeThong {
  constructor() {
    this.bubble = null;
    this.currentTarget = null;
    this.hideTimeout = null;
    this.showTimeout = null;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.init());
      } else {
        this.init();
      }
    }
  }

  init() {
    if (typeof document === "undefined" || this.bubble) return;
    this.bubble = document.createElement("div");
    this.bubble.className = "smart-tooltip-bubble";
    document.body.appendChild(this.bubble);

    // Bắt sự kiện hover trên toàn bộ trang
    document.addEventListener("mouseover", (e) => this.handleMouseOver(e));
    document.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    document.addEventListener("mouseout", (e) => this.handleMouseOut(e));
    document.addEventListener("scroll", () => this.hide(), true);
  }

  getTooltipData(target) {
    if (!target || target === document.body) return null;

    const el = target.closest("[data-tooltip], [title], [data-custom-title]");
    if (!el) return null;

    const dataTooltip = el.getAttribute("data-tooltip");
    if (dataTooltip && dataTooltip.trim() && dataTooltip.trim() !== "-") {
      return dataTooltip.trim();
    }

    const title = el.getAttribute("title");
    if (title && title.trim() && title.trim() !== "-") {
      // Lưu lại vào data-custom-title và xóa title để browser native tooltip không bị chồng lấn
      el.setAttribute("data-custom-title", title);
      el.removeAttribute("title");
      return title.trim();
    }

    const savedTitle = el.getAttribute("data-custom-title");
    if (savedTitle && savedTitle.trim() && savedTitle.trim() !== "-") {
      return savedTitle.trim();
    }

    return null;
  }

  handleMouseOver(e) {
    const text = this.getTooltipData(e.target);
    if (!text) {
      this.hide();
      return;
    }

    this.currentTarget = e.target.closest("[data-tooltip], [data-custom-title], [title]") || e.target;
    clearTimeout(this.hideTimeout);
    clearTimeout(this.showTimeout);

    this.showTimeout = setTimeout(() => {
      this.show(text, e.clientX, e.clientY);
    }, 40); // 40ms phản hồi tức thì
  }

  handleMouseMove(e) {
    if (this.bubble && this.bubble.classList.contains("smart-tooltip-visible")) {
      this.positionBubble(e.clientX, e.clientY);
    }
  }

  handleMouseOut(e) {
    if (this.currentTarget && (e.relatedTarget === null || !this.currentTarget.contains(e.relatedTarget))) {
      this.hide();
    }
  }

  show(text, mouseX, mouseY) {
    if (!this.bubble) return;
    this.bubble.innerHTML = text.replace(/\n/g, "<br>");
    this.bubble.classList.add("smart-tooltip-visible");
    this.positionBubble(mouseX, mouseY);
  }

  positionBubble(mouseX, mouseY) {
    if (!this.bubble) return;
    const padding = 12;
    const bubbleRect = this.bubble.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let left = mouseX + 14;
    let top = mouseY + 18;

    // Tránh tràn viền phải
    if (left + bubbleRect.width > winWidth - padding) {
      left = mouseX - bubbleRect.width - 14;
    }
    if (left < padding) left = padding;

    // Tránh tràn viền dưới (flip lên trên con trỏ chuột)
    if (top + bubbleRect.height > winHeight - padding) {
      top = mouseY - bubbleRect.height - 14;
    }
    if (top < padding) top = padding;

    this.bubble.style.left = `${left}px`;
    this.bubble.style.top = `${top}px`;
  }

  hide() {
    clearTimeout(this.showTimeout);
    if (this.bubble) {
      this.bubble.classList.remove("smart-tooltip-visible");
    }
    this.currentTarget = null;
  }
}

window.SmartTooltip = new SmartTooltipHeThong();

// Khởi chạy khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", khoiTaoTheme);
