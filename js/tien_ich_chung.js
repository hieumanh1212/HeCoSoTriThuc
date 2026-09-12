/**
 * TIỆN ÍCH DÙNG CHUNG: QUẢN LÝ GIAO DIỆN SÁNG / TỐI (THEME MANAGER)
 * Tự động đồng bộ chế độ sáng / tối trên tất cả các trang
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

// Khởi chạy khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", khoiTaoTheme);
