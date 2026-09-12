# HỆ CƠ SỞ TRI THỨC Y TẾ (MED-EXPERT)
> **Đề tài:** Hệ Chuyên Gia Chẩn Đoán Bệnh Truyền Nhiễm & Sốt Cấp Tính Kết Hợp Xử Lý Bất Định (Certainty Factor) và Trực Quan Hóa Đồ Thị Mạng Luật RPG  
> **Học phần:** Hệ Cơ Sở Tri Thức (Chương trình Thạc sĩ Công nghệ Thông tin)  
> **Kiến trúc:** Module hóa phân lớp thuần Việt, CSDL Quan hệ Nhúng 3NF (IndexedDB) & SQL Query Console

---

## 📁 CẤU TRÚC THƯ MỤC DỰ ÁN (KIẾN TRÚC MODULE HÓA THUẦN VIỆT)

Toàn bộ cây thư mục, tên file, module chức năng và các bảng CSDL đã được quy chuẩn hóa sang tiếng Việt:

```
HeCoSoTriThuc/
│
├── index.html                                 # Single Page Application Dashboard chính
├── README.md                                  # Hướng dẫn sử dụng & tổng quan kiến trúc
│
├── css/                                       # [ĐỊNH DẠNG CSS NỀN TẢNG DÙNG CHUNG]
│   ├── nen_tang.css                           # Biến CSS, chế độ Sáng / Tối, Typography, Reset
│   ├── thanh_phan.css                         # Components dùng chung (Header, Tabs, Buttons, Cards, Modals, Forms)
│   └── tong_hop.css                           # File tổng hợp gom toàn bộ định dạng CSS hệ thống
│
├── js/                                        # [ĐỘNG CƠ AI & CƠ SỞ DỮ LIỆU CỐT LÕI]
│   │
│   ├── dong_co/                               # Động cơ Suy diễn cốt lõi & Đại số bất định
│   │   ├── he_so_tin_cay.js                   # Mô hình toán học Hệ số tin cậy Certainty Factor (MYCIN)
│   │   ├── suy_dien_tien.js                   # Động cơ Suy diễn tiến (Data-driven) & Vết lập luận
│   │   └── suy_dien_lui.js                    # Động cơ Suy diễn lùi (Goal-driven) & Truy vấn WHY
│   │
│   ├── co_so_du_lieu/                         # Tầng Cơ sở dữ liệu Quan hệ nhúng (IndexedDB 3NF)
│   │   ├── dong_co_csdl.js                    # Engine CSDL IndexedDB 7 bảng & Trình xử lý SQL
│   │   └── tri_thuc_mac_dinh.js               # Bộ tri thức y tế chuẩn Bộ Y Tế & WHO
│   │
│   └── ung_dung.js                            # Điểm khởi chạy ứng dụng & Navigation Router
│
├── chuc_nang/                                 # [MỖI MÀN HÌNH / CHỨC NĂNG CÓ 1 FOLDER RIÊNG BIỆT]
│   │
│   ├── chan_doan/                             # 🩺 Màn hình Chẩn đoán & Suy diễn
│   │   ├── chan_doan.css                      # CSS riêng cho bộ chọn triệu chứng & bảng kết quả
│   │   └── dieu_khien_chan_doan.js            # Controller xử lý chọn triệu chứng, suy diễn, modal HOW/WHY
│   │
│   ├── do_thi_rpg/                            # 🕸️ Màn hình Đồ thị Mạng luật RPG (Rule Petri Graph)
│   │   ├── do_thi_rpg.css                     # CSS riêng cho toolbar & canvas đồ thị
│   │   └── ve_do_thi_rpg.js                   # Engine vẽ Canvas & trực quan hóa mạng luật RPG
│   │
│   ├── quan_ly_tri_thuc/                      # 📚 Màn hình Quản lý Cơ sở tri thức
│   │   ├── quan_ly_tri_thuc.css               # CSS riêng cho bảng quản trị luật
│   │   ├── mo_hinh_tri_thuc.js                # Lớp quản lý lưu trữ tri thức (KB Manager)
│   │   └── dieu_khien_tri_thuc.js             # Controller điều khiển bảng luật & form CRUD
│   │
│   ├── quan_tri_csdl/                         # 🗄️ Màn hình Quản trị CSDL & SQL Console
│   │   ├── quan_tri_csdl.css                  # CSS riêng cho bảng thống kê & SQL Terminal
│   │   └── dieu_khien_csdl.js                 # Controller thực thi SQL query & Table Explorer
│   │
│   ├── ca_kiem_thu/                           # 🧪 Màn hình Ca kiểm thử mẫu (Benchmark Cases)
│   │   ├── ca_kiem_thu.css                    # CSS riêng cho danh sách ca bệnh mẫu
│   │   └── dieu_khien_kiem_thu.js             # Controller nạp nhanh ca bệnh mẫu vào phiên chẩn đoán
│   │
│   └── ly_thuyet/                             # 📖 Màn hình Nguồn & Cơ sở lý thuyết học thuật
│       └── ly_thuyet.css                      # CSS riêng cho tài liệu học thuật & công thức toán
│
└── tai_lieu/                                  # [BÁO CÁO HỌC THUẬT & TÀI LIỆU DỰ ÁN]
    └── bao_cao_he_co_so_tri_thuc.md           # Báo cáo Thạc sĩ đầy đủ 7 mục theo chuẩn đề cương
```

---

## 🗄️ LƯỢC ĐỒ CƠ SỞ DỮ LIỆU QUAN HỆ 3NF (7 BẢNG VIỆT HÓA)

1. `nhom_trieu_chung`: Danh mục nhóm phân loại triệu chứng lâm sàng.
2. `trieu_chung`: Danh mục 21 triệu chứng kèm câu hỏi truy vấn khi suy diễn lùi.
3. `danh_muc_benh`: Danh mục 7 bệnh mục tiêu kèm phác đồ và dấu hiệu nguy hiểm.
4. `tap_luat`: Danh mục 16 luật sinh có hệ số tin cậy $CF \in [0.1, 1.0]$.
5. `tien_de_luat`: Bảng nối liên kết quan hệ N-N giữa Tiền đề (NẾU) và Luật sinh.
6. `lich_su_chan_doan`: Tự động lưu vết toàn bộ các phiên chẩn đoán của người dùng.
7. `nhat_ky_csdl`: Nhật ký kiểm toán mọi thao tác thêm, sửa, xóa, nạp lại CSDL.

---

## 🌟 CÁC TÍNH NĂNG CHÍNH

1. **Động cơ Suy diễn Tiến (Forward Chaining):** Tính toán độ tin cậy kết hợp theo chuẩn mô hình MYCIN ($CF \in [0, 1]$).
2. **Động cơ Suy diễn Lùi (Backward Chaining):** Truy ngược cây luật khi chưa đủ dữ kiện, chủ động tương tác hỏi thêm kèm lời giải thích **WHY**.
3. **Phân hệ Giải thích (HOW):** Minh bạch toàn bộ vết suy luận từng bước (Execution Trace Logs).
4. **Trực quan hóa Đồ thị Mạng luật RPG (Rule Petri Graph):** Trực quan hóa mạng lưới liên kết Sự kiện (tròn) $\rightarrow$ Luật (chữ nhật) $\rightarrow$ Bệnh (kết luận) kèm hiệu ứng phát sáng đường đi đã kích hoạt.
5. **Cơ sở Dữ liệu Quan hệ Nhúng 3NF & SQL Console:** 
   - 7 bảng quan hệ trên nền IndexedDB.
   - **SQL Console:** Hỗ trợ viết và thực thi truy vấn SQL trực tiếp (`SELECT * FROM tap_luat WHERE cf >= 0.85`).
   - Tự động lưu vết phiên chẩn đoán (`lich_su_chan_doan`) và nhật ký kiểm toán (`nhat_ky_csdl`).
6. **Chuyển đổi Giao diện Sáng / Tối (Dark & Light Mode):** Tự động chuyển đổi màu sắc, độ tương phản cao, dịu mắt.
7. **Bộ Ca bệnh Kiểm thử Mẫu (Benchmark):** 5 ca bệnh lâm sàng thực tế, nạp nhanh chỉ với 1 click.

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY

* **Nhấp đúp chuột vào file [`index.html`](file:///c:/Users/Admin/Documents/Thạc%20sĩ/Kì%202/Hệ%20cơ%20sở%20tri%20thức/HeCoSoTriThuc/index.html)** để mở trực tiếp trên bất kỳ trình duyệt nào (Chrome, Edge, Firefox, Safari).
* Chạy hoàn toàn Client-side, không cần cài đặt server hay môi trường phức tạp.