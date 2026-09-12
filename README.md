# HỆ CƠ SỞ TRI THỨC Y TẾ (MED-EXPERT)
> **Đề tài:** Hệ Chuyên Gia Chẩn Đoán Bệnh Truyền Nhiễm & Sốt Cấp Tính Kết Hợp Xử Lý Bất Định (Certainty Factor) và Trực Quan Hóa Đồ Thị Mạng Luật RPG  
> **Học phần:** Hệ Cơ Sở Tri Thức (Chương trình Thạc sĩ Công nghệ Thông tin)

---

## 🌟 TÍNH NĂNG NỔI BẬT

1. **Động cơ Suy diễn Tiến (Forward Chaining / Data-driven):** 
   - Suy luận tự động từ các triệu chứng lâm sàng người dùng khai báo.
   - Xử lý độ bất định theo **Mô hình Certainty Factor (MYCIN Model)** chuẩn mực với các toán tử AND (min), OR (max), Rule evaluation và kết hợp bằng chứng $CF_{\text{combine}}$.
2. **Động cơ Suy diễn Lùi (Backward Chaining / Goal-driven):**
   - Chủ động truy ngược mục tiêu khi độ tin cậy chưa đạt ngưỡng tuyệt đối.
   - Sinh câu hỏi tương tác khu biệt kèm lời giải thích **WHY** (*"Vì sao hỏi câu này?"*).
3. **Phân hệ Giải thích (Explanation Facility - HOW & WHY):**
   - Minh bạch từng bước trong chuỗi suy luận (Execution Trace Logs).
   - Hiển thị công thức đại số và quá trình tích lũy độ tin cậy.
4. **Trực quan hóa Đồ thị Mạng luật RPG (Rule Petri Graph):**
   - Vẽ mạng Petri luật sinh với các nút Vị trí Sự kiện/Bệnh (Places - hình tròn) và Chuyển tiếp Luật (Transitions - hình chữ nhật).
   - Tự động phát sáng và tô màu các nút / đường đi logic đã kích hoạt (Active Tokens/Paths).
   - Tương tác kéo rê (Pan), Phóng to/Thu nhỏ (Zoom), Lọc theo từng bệnh.
5. **Quản trị Cơ sở Tri thức Toàn diện (KB Manager):**
   - Xem, Thêm, Sửa, Xóa các luật sinh, triệu chứng và bệnh kết luận.
   - **Export JSON** ra máy và **Import file JSON** từ bên ngoài.
   - Khôi phục về dữ liệu chuẩn của Bộ Y Tế.
6. **Bộ Ca bệnh Kiểm thử Mẫu (Clinical Benchmark Cases):**
   - 5 ca bệnh lâm sàng thực tế, bấm 1 nút để tự động nạp dữ liệu và kiểm tra độ chính xác của hệ thống.

---

## 🚀 HƯỚNG DẪN CHẠY CHƯƠNG TRÌNH

1. **Mở trực tiếp trên Trình duyệt:**
   - Nhấp đúp chuột vào file [`index.html`](file:///c:/Users/Admin/Documents/Th%E1%BA%A1c%20s%C4%A9/K%C3%AC%202/H%E1%BB%87%20c%C6%A1%20s%E1%BB%9F%20tri%20th%E1%BB%A9c/HeCoSoTriThuc/index.html) để mở bằng bất kỳ trình duyệt nào (Chrome, Edge, Firefox...).
   - Không cần cài đặt server, không cần NodeJS hay Database.

2. **Tài liệu Báo cáo Thạc sĩ:**
   - Xem toàn bộ báo cáo 7 mục học thuật chi tiết tại: [`docs/bao_cao_he_co_so_tri_thuc.md`](file:///c:/Users/Admin/Documents/Th%E1%BA%A1c%20s%C4%A9/K%C3%AC%202/H%E1%BB%87%20c%C6%A1%20s%E1%BB%9F%20tri%20th%E1%BB%A9c/HeCoSoTriThuc/docs/bao_cao_he_co_so_tri_thuc.md).

---

## 📁 CẤU TRÚC MÃ NGUỒN

```
HeCoSoTriThuc/
│
├── index.html                     # Giao diện chính (SPA Dashboard)
├── style.css                      # Giao diện hiện đại, responsive, glassmorphism
├── README.md                      # Hướng dẫn tổng quan
│
├── js/
│   ├── data/
│   │   └── default_kb.js          # Cơ sở tri thức chuẩn Bộ Y Tế (Triệu chứng, Bệnh, Luật CF)
│   │
│   ├── engine/
│   │   ├── certainty_factor.js    # Module toán học Certainty Factor (MYCIN)
│   │   ├── forward_chaining.js    # Động cơ Suy diễn tiến & Nhật ký vết suy luận
│   │   └── backward_chaining.js   # Động cơ Suy diễn lùi & Sinh câu hỏi tương tác (WHY)
│   │
│   ├── graph/
│   │   └── rpg_visualizer.js      # Trực quan hóa Đồ thị mạng luật RPG Canvas tương tác
│   │
│   ├── kb_manager.js              # Quản lý CRUD tri thức, Import/Export JSON, LocalStorage
│   └── app.js                     # Điều phối giao diện và sự kiện
│
└── docs/
    └── bao_cao_he_co_so_tri_thuc.md # Bản báo cáo Thạc sĩ đầy đủ 7 mục
```