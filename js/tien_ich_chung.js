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
// COMPONENT MODAL XÁC NHẬN TOÀN CỤC (DÙNG CHUNG TOÀN HỆ THỐNG)
// Thay thế hoàn toàn hộp thoại window.confirm mặc định bằng UI hiện đại
// ============================================================================

class XacNhanHeThong {
  constructor() {
    this.modalEl = null;
    this.currentResolver = null;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.initDOM());
      } else {
        this.initDOM();
      }
    }
  }

  initDOM() {
    if (typeof document === "undefined" || this.modalEl) return;
    let modal = document.getElementById("global-confirm-modal-backdrop");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "global-confirm-modal-backdrop";
      modal.className = "confirm-modal-backdrop";
      modal.innerHTML = `
        <div class="confirm-modal-card" role="dialog" aria-modal="true">
          <div class="confirm-icon-circle confirm-icon-danger" id="globalConfirmIconWrap">
            <i class="fa-solid fa-triangle-exclamation" id="globalConfirmIcon"></i>
          </div>
          <h3 class="confirm-title" id="globalConfirmTitle">Xác nhận thao tác</h3>
          <p class="confirm-message" id="globalConfirmMessage">Bạn có chắc chắn muốn thực hiện hành động này?</p>
          <div class="confirm-detail-box" id="globalConfirmDetail" style="display: none;"></div>
          <div class="confirm-actions">
            <button type="button" class="btn-confirm-cancel" id="btnGlobalConfirmCancel">
              <i class="fa-solid fa-xmark"></i> <span id="globalConfirmCancelText">Hủy bỏ</span>
            </button>
            <button type="button" class="btn-confirm-action btn-confirm-danger" id="btnGlobalConfirmOk">
              <i class="fa-solid fa-check" id="globalConfirmOkIcon"></i> <span id="globalConfirmOkText">Đồng ý</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const btnCancel = modal.querySelector("#btnGlobalConfirmCancel");
      const btnOk = modal.querySelector("#btnGlobalConfirmOk");

      if (btnCancel) btnCancel.addEventListener("click", () => this.close(false));
      if (btnOk) btnOk.addEventListener("click", () => this.close(true));

      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.close(false);
      });

      document.addEventListener("keydown", (e) => {
        if (!modal.classList.contains("active")) return;
        if (e.key === "Escape") {
          e.preventDefault();
          this.close(false);
        } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
          if (document.activeElement && document.activeElement.tagName === "TEXTAREA") return;
          e.preventDefault();
          this.close(true);
        }
      });
    }
    this.modalEl = modal;
  }

  hienThi({
    title = "Xác nhận thao tác",
    message = "Bạn có chắc chắn muốn thực hiện hành động này?",
    detail = "",
    type = "danger", // danger, warning, info, success
    confirmText = "Đồng ý",
    cancelText = "Hủy bỏ",
    icon = null
  } = {}) {
    this.initDOM();
    return new Promise((resolve) => {
      this.currentResolver = resolve;

      const titleEl = document.getElementById("globalConfirmTitle");
      const messageEl = document.getElementById("globalConfirmMessage");
      const detailEl = document.getElementById("globalConfirmDetail");
      const iconWrap = document.getElementById("globalConfirmIconWrap");
      const iconEl = document.getElementById("globalConfirmIcon");
      const okBtn = document.getElementById("btnGlobalConfirmOk");
      const okText = document.getElementById("globalConfirmOkText");
      const okIcon = document.getElementById("globalConfirmOkIcon");
      const cancelTextEl = document.getElementById("globalConfirmCancelText");

      if (titleEl) titleEl.textContent = title;
      if (messageEl) messageEl.innerHTML = message;

      if (detailEl) {
        if (detail) {
          detailEl.innerHTML = detail;
          detailEl.style.display = "block";
        } else {
          detailEl.style.display = "none";
        }
      }

      if (cancelTextEl) cancelTextEl.textContent = cancelText;
      if (okText) okText.textContent = confirmText;

      // Icon & Type Styles
      if (iconWrap && okBtn && iconEl) {
        iconWrap.className = `confirm-icon-circle confirm-icon-${type}`;
        okBtn.className = `btn-confirm-action btn-confirm-${type}`;

        let defaultIcon = "fa-triangle-exclamation";
        let defaultOkIcon = "fa-check";

        if (type === "danger") {
          defaultIcon = "fa-trash-can";
          defaultOkIcon = "fa-trash-can";
        } else if (type === "warning") {
          defaultIcon = "fa-triangle-exclamation";
          defaultOkIcon = "fa-arrows-rotate";
        } else if (type === "info") {
          defaultIcon = "fa-circle-question";
          defaultOkIcon = "fa-arrow-right";
        } else if (type === "success") {
          defaultIcon = "fa-circle-check";
          defaultOkIcon = "fa-check";
        }

        iconEl.className = `fa-solid ${icon || defaultIcon}`;
        if (okIcon) okIcon.className = `fa-solid ${defaultOkIcon}`;
      }

      if (this.modalEl) {
        this.modalEl.classList.add("active");
        setTimeout(() => {
          if (okBtn) okBtn.focus();
        }, 50);
      }
    });
  }

  close(result) {
    if (this.modalEl) {
      this.modalEl.classList.remove("active");
    }
    if (typeof this.currentResolver === "function") {
      const resolve = this.currentResolver;
      this.currentResolver = null;
      resolve(Boolean(result));
    }
  }

  // Tiện ích chuyên biệt cho xóa dữ liệu
  async xoa(tenDoiTuong, chiTiet = "") {
    return this.hienThi({
      title: "Xác nhận xóa dữ liệu",
      message: `Bạn có chắc chắn muốn xóa <strong style="color: #f87171;">${tenDoiTuong}</strong>?`,
      detail: chiTiet || "Thao tác này sẽ xóa vĩnh viễn khỏi hệ thống và không thể hoàn tác.",
      type: "danger",
      confirmText: "Xóa vĩnh viễn",
      cancelText: "Hủy bỏ",
      icon: "fa-trash-can"
    });
  }

  // Tiện ích chuyên biệt cho khôi phục mặc định
  async khoiPhuc(tenHeThong = "Cơ sở tri thức", chiTiet = "") {
    return this.hienThi({
      title: "Khôi phục dữ liệu chuẩn",
      message: `Bạn có chắc chắn muốn khôi phục <strong style="color: #fbbf24;">${tenHeThong}</strong> về trạng thái chuẩn ban đầu của Bộ Y Tế?`,
      detail: chiTiet || "Các dữ liệu tùy chỉnh hoặc chỉnh sửa gần nhất sẽ được thay thế bằng tri thức mặc định.",
      type: "warning",
      confirmText: "Đồng ý khôi phục",
      cancelText: "Hủy bỏ",
      icon: "fa-arrows-rotate"
    });
  }

  // Tiện ích cảnh báo chung
  async canhBao(tieuDe, loiNhan, chiTiet = "") {
    return this.hienThi({
      title: tieuDe || "Cảnh báo thao tác",
      message: loiNhan,
      detail: chiTiet,
      type: "warning",
      confirmText: "Tiếp tục",
      cancelText: "Quay lại",
      icon: "fa-triangle-exclamation"
    });
  }
}

// Khởi tạo đối tượng toàn cục
window.XacNhan = new XacNhanHeThong();
window.ModalConfirm = window.XacNhan;
window.confirmAsync = (msg, options) => window.XacNhan.hienThi({ message: msg, ...options });

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
