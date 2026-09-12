-- ============================================================================
-- HỆ CƠ SỞ TRI THỨC Y TẾ (MED-EXPERT)
-- SCRIPT KHỞI TẠO CƠ SỞ DỮ LIỆU SQLITE CHUẨN 3NF
-- Học phần: Hệ cơ sở tri thức (Chương trình Thạc sĩ CNTT)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. BẢNG: nhom_trieu_chung (Nhóm phân loại triệu chứng)
DROP TABLE IF EXISTS tien_de_luat;
DROP TABLE IF EXISTS tap_luat;
DROP TABLE IF EXISTS trieu_chung;
DROP TABLE IF EXISTS nhom_trieu_chung;
DROP TABLE IF EXISTS danh_muc_benh;
DROP TABLE IF EXISTS lich_su_chan_doan;
DROP TABLE IF EXISTS nhat_ky_csdl;

CREATE TABLE nhom_trieu_chung (
    ma_nhom VARCHAR(10) PRIMARY KEY,
    ten_nhom NVARCHAR(100) NOT NULL,
    bieu_tuong VARCHAR(50) DEFAULT 'fa-notes-medical',
    mo_ta NVARCHAR(255)
);

-- 2. BẢNG: trieu_chung (21 triệu chứng lâm sàng)
CREATE TABLE trieu_chung (
    ma_trieu_chung VARCHAR(10) PRIMARY KEY,
    ma_nhom VARCHAR(10) NOT NULL,
    ten_trieu_chung NVARCHAR(150) NOT NULL,
    cau_hoi_suy_dien_lui NVARCHAR(255) NOT NULL,
    muc_do_canh_bao NVARCHAR(20) DEFAULT 'Bình thường',
    FOREIGN KEY (ma_nhom) REFERENCES nhom_trieu_chung(ma_nhom) ON DELETE CASCADE
);

-- 3. BẢNG: danh_muc_benh (7 bệnh mục tiêu)
CREATE TABLE danh_muc_benh (
    ma_benh VARCHAR(10) PRIMARY KEY,
    ten_benh NVARCHAR(150) NOT NULL,
    ten_khoa_hoc NVARCHAR(150),
    nhom_benh NVARCHAR(50),
    muc_do_nguy_hiem NVARCHAR(50),
    huong_xu_tri NVARCHAR(500),
    trieu_chung_canh_bao NVARCHAR(500)
);

-- 4. BẢNG: tap_luat (16 luật sinh chẩn đoán)
CREATE TABLE tap_luat (
    ma_luat VARCHAR(10) PRIMARY KEY,
    ten_luat NVARCHAR(150) NOT NULL,
    ma_benh_ket_luan VARCHAR(10) NOT NULL,
    he_so_tin_cay_luat REAL NOT NULL CHECK (he_so_tin_cay_luat > 0 AND he_so_tin_cay_luat <= 1.0),
    mo_ta NVARCHAR(255),
    FOREIGN KEY (ma_benh_ket_luan) REFERENCES danh_muc_benh(ma_benh) ON DELETE CASCADE
);

-- 5. BẢNG: tien_de_luat (Bảng nối quan hệ N-N giữa Luật và Triệu chứng tiền đề)
CREATE TABLE tien_de_luat (
    ma_luat VARCHAR(10) NOT NULL,
    ma_trieu_chung VARCHAR(10) NOT NULL,
    toan_tu_logic VARCHAR(10) DEFAULT 'AND',
    PRIMARY KEY (ma_luat, ma_trieu_chung),
    FOREIGN KEY (ma_luat) REFERENCES tap_luat(ma_luat) ON DELETE CASCADE,
    FOREIGN KEY (ma_trieu_chung) REFERENCES trieu_chung(ma_trieu_chung) ON DELETE CASCADE
);

-- 6. BẢNG: lich_su_chan_doan (Lưu vết các phiên suy diễn)
CREATE TABLE lich_su_chan_doan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_phien VARCHAR(50) NOT NULL,
    thoi_gian TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cac_trieu_chung_dau_vao TEXT NOT NULL,
    benh_chinh VARCHAR(150),
    he_so_tin_cay_chinh REAL,
    chi_tiet_ket_qua_json TEXT
);

-- 7. BẢNG: nhat_ky_csdl (Audit logs thao tác CSDL)
CREATE TABLE nhat_ky_csdl (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thoi_gian TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    loai_thao_tac VARCHAR(20) NOT NULL,
    ten_bang VARCHAR(50) NOT NULL,
    chi_tiet NVARCHAR(255)
);

-- ============================================================================
-- DỮ LIỆU MẪU (SEED DATA CHUẨN BỘ Y TẾ & WHO)
-- ============================================================================

-- Nạp nhóm triệu chứng
INSERT INTO nhom_trieu_chung (ma_nhom, ten_nhom, bieu_tuong, mo_ta) VALUES
('G01', 'Hội chứng Sốt & Toàn thân', 'fa-temperature-high', 'Các triệu chứng sốt và biểu hiện toàn thân'),
('G02', 'Hệ Hô hấp & Tai Mũi Họng', 'fa-lungs', 'Các biểu hiện tại đường hô hấp trên và dưới'),
('G03', 'Hệ Tiêu hóa', 'fa-viruses', 'Rối loạn đường tiêu hóa và đau bụng'),
('G04', 'Dấu hiệu Ngoài da & Xuất huyết', 'fa-hand-dots', 'Ban da, dát đỏ, ban bọng nước, xuất huyết dưới da');

-- Nạp 21 triệu chứng
INSERT INTO trieu_chung (ma_trieu_chung, ma_nhom, ten_trieu_chung, cau_hoi_suy_dien_lui, muc_do_canh_bao) VALUES
('S01', 'G01', 'Sốt cao đột ngột (≥ 39°C)', 'Bệnh nhân có bị sốt cao đột ngột từ 39°C trở lên không?', 'Cao'),
('S02', 'G01', 'Sốt nhẹ / sốt vừa (< 38.5°C)', 'Bệnh nhân có sốt nhẹ hoặc sốt vừa âm ỉ không?', 'Bình thường'),
('S03', 'G01', 'Ớn lạnh, rét run từng cơn', 'Bệnh nhân có cảm giác ớn lạnh hoặc rét run theo cơn không?', 'Cảnh báo'),
('S04', 'G01', 'Đau đầu dữ dội vùng trán', 'Bệnh nhân có bị đau đầu dữ dội đặc biệt là vùng trán không?', 'Bình thường'),
('S05', 'G01', 'Đau nhức hai hốc mắt', 'Bệnh nhân có cảm giác đau tức sâu sau hai hốc mắt khi liếc không?', 'Cảnh báo'),
('S06', 'G01', 'Đau mỏi cơ bắp và khớp dữ dội', 'Bệnh nhân có bị đau nhức toàn thân như bị đập vào cơ khớp không?', 'Bình thường'),
('S07', 'G01', 'Mệt mỏi suy kiệt nặng', 'Bệnh nhân có cảm thấy kiệt sức, không tự đứng dậy đi lại được không?', 'Cảnh báo'),
('S08', 'G02', 'Ho khan kéo dài', 'Bệnh nhân có bị ho khan nhiều không?', 'Bình thường'),
('S09', 'G02', 'Ho có đờm đặc quánh', 'Bệnh nhân có bị ho có đờm đục, vàng hoặc xanh không?', 'Bình thường'),
('S10', 'G02', 'Đau rát họng khi nuốt', 'Bệnh nhân có bị đau rát cổ họng tăng lên khi nuốt không?', 'Bình thường'),
('S11', 'G02', 'Nghẹt mũi, chảy nước mũi trong', 'Bệnh nhân có biểu hiện nghẹt mũi hoặc chảy dịch mũi không?', 'Bình thường'),
('S12', 'G02', 'Mất khứu giác hoặc vị giác đột ngột', 'Bệnh nhân có bị mất mùi hoặc mất vị giác đột ngột không?', 'Cảnh báo'),
('S13', 'G02', 'Khó thở, thở nhanh gấp (≥ 24 lần/phút)', 'Bệnh nhân có cảm thấy tức ngực, khó thở, thở dốc không?', 'Nguy hiểm'),
('S14', 'G03', 'Buồn nôn hoặc nôn nhiều', 'Bệnh nhân có bị nôn liên tục hoặc buồn nôn khó ăn uống không?', 'Bình thường'),
('S15', 'G03', 'Đau bụng âm ỉ hoặc đau thượng vị', 'Bệnh nhân có bị đau vùng bụng hoặc đau tức hạ sườn phải không?', 'Cảnh báo'),
('S16', 'G03', 'Tiêu chảy phân lỏng nhiều lần', 'Bệnh nhân có bị đi ngoài phân lỏng nhiều lần trong ngày không?', 'Bình thường'),
('S17', 'G04', 'Xuất huyết dưới da (dạng chấm/mảng bầm)', 'Bệnh nhân có xuất hiện các chấm đỏ xuất huyết li ti dưới da không biến mất khi căng da?', 'Nguy hiểm'),
('S18', 'G04', 'Chảy máu chân răng hoặc chảy máu cam', 'Bệnh nhân có bị chảy máu chân răng hoặc chảy máu mũi tự nhiên không?', 'Nguy hiểm'),
('S19', 'G04', 'Phát ban đỏ dạng sởi lan từ mặt xuống', 'Bệnh nhân có xuất hiện phát ban dát sẩn đỏ mịn bắt đầu từ sau tai, mặt lan dần xuống thân mình không?', 'Cảnh báo'),
('S20', 'G04', 'Ban bọng nước lòng bàn tay, bàn chân, miệng', 'Bệnh nhân có nổi các nốt bọng nước ở lòng bàn tay, bàn chân hoặc loét trong vòm miệng không?', 'Cảnh báo'),
('S21', 'G04', 'Mắt đỏ, viêm kết mạc', 'Bệnh nhân có bị đỏ mắt, kèm cộm rát mắt nhưng không có mủ không?', 'Bình thường');

-- Nạp 7 bệnh mục tiêu
INSERT INTO danh_muc_benh (ma_benh, ten_benh, ten_khoa_hoc, nhom_benh, muc_do_nguy_hiem, huong_xu_tri, trieu_chung_canh_bao) VALUES
('D01', 'Sốt xuất huyết Dengue', 'Dengue Fever', 'Bệnh truyền nhiễm do virus qua muỗi', 'Nguy cơ sốc và xuất huyết nặng', 'Hạ sốt bằng Paracetamol (TUYỆT ĐỐI KHÔNG DÙNG Aspirin/Ibuprofen), bù nước điện giải Oresol đường uống tích cực. Theo dõi sát công thức máu và tiểu cầu ngày 3-7.', 'Đau bụng hạ sườn phải liên tục, nôn nhiều, chảy máu chân răng/mũi, mệt lả li bì, chân tay lạnh ẩm.'),
('D02', 'Cúm mùa (Cúm A / B)', 'Influenza Virus Infection', 'Nhiễm virus đường hô hấp cấp', 'Trung bình (cần đề phòng viêm phổi bội nhiễm)', 'Nghỉ ngơi tại phòng thoáng khí, dùng thuốc hạ sốt, súc họng nước muối sinh lý, bổ sung vitamin C. Với ca có yếu tố nguy cơ cao dùng Oseltamivir (Tamiflu) theo chỉ định bác sĩ.', 'Khó thở, thở rít, SpO2 < 95%, ho ra máu, sốt tái phát cao sau khi đã hạ.'),
('D03', 'Nhiễm COVID-19 cấp', 'SARS-CoV-2 Infection', 'Nhiễm virus đường hô hấp cấp', 'Trung bình đến Nặng', 'Cách ly y tế, theo dõi chỉ số SpO2 thường xuyên. Dùng hạ sốt, giảm ho, kháng viêm nếu có chỉ định. Báo cơ sở y tế khi có dấu hiệu suy hô hấp.', 'SpO2 đo ngón tay dưới 94%, thở dốc trên 24 nhịp/phút, tức ngực liên tục, tím tái môi đầu chi.'),
('D04', 'Bệnh Sởi ở người lớn / trẻ em', 'Measles (Rubeola)', 'Nhiễm virus lây qua đường hô hấp', 'Cao do dễ biến chứng viêm phổi, viêm não', 'Cách ly tuyệt đối, phòng đủ ánh sáng không chói. Vệ sinh mắt mũi họng, uống bổ sung Vitamin A liều cao theo phác đồ Bộ Y Tế. Dinh dưỡng nâng cao thể trạng.', 'Sốt cao co giật, lơ mơ, thở rút lõm lồng ngực, ban lặn nhưng vẫn sốt cao, tiêu chảy mất nước nặng.'),
('D05', 'Bệnh Tay Chân Miệng', 'Hand-Foot-Mouth Disease (EV71/Coxsackie)', 'Nhiễm virus đường tiêu hóa', 'Có thể biến chứng tim mạch - thần kinh độ 2b-4', 'Chăm sóc vệ sinh răng miệng bằng gel giảm đau rơ miệng, bôi dung dịch sát khuẩn các vết bọng nước ngoài da. Dùng hạ sốt khi sốt cao.', 'Sốt cao liên tục không đáp ứng thuốc hạ sốt, giật mình chới với lúc thiu thiu ngủ, đi loạng choạng, run chi, thở mệt.'),
('D06', 'Sốt rét do ký sinh trùng Plasmodium', 'Malaria', 'Ký sinh trùng truyền qua muỗi Anopheles', 'Nguy hiểm (đe dọa sốt rét ác tính thể não)', 'Chuyển viện khẩn cấp, làm xét nghiệm máu tìm ký sinh trùng sốt rét. Sử dụng thuốc điều trị sốt rét đặc hiệu theo phác đồ Bộ Y Tế (như Arterakine / Artemisinin).', 'Sốt rét run từng cơn theo chu kỳ, da xanh tái thiếu máu, vàng mắt vàng da, mê sảng rối loạn tri giác.'),
('D07', 'Viêm họng - Amidan cấp tính', 'Acute Pharyngitis / Tonsillitis', 'Nhiễm khuẩn đường hô hấp trên', 'Nhẹ đến Trung bình', 'Dùng giảm đau hạ sốt, kháng viêm, súc họng dung dịch sát khuẩn. Nếu do liên cầu khuẩn nhóm A (Streptococcus) cần dùng kháng sinh theo đơn bác sĩ đủ liệu trình.', 'Khó nuốt đến mức không uống được nước, sưng hạch góc hàm to đau dữ dội, khó há miệng.');

-- Nạp 16 luật sinh
INSERT INTO tap_luat (ma_luat, ten_luat, ma_benh_ket_luan, he_so_tin_cay_luat, mo_ta) VALUES
('R01', 'Luật nhận diện Sốt xuất huyết thể cơ bản', 'D01', 0.85, 'Sốt cao đột ngột + Đau đầu trán + Đau hốc mắt + Đau mỏi cơ bắp'),
('R02', 'Luật xác nhận Sốt xuất huyết có dấu hiệu xuất huyết', 'D01', 0.90, 'Sốt cao đột ngột + Xuất huyết dưới da + Buồn nôn'),
('R03', 'Luật Sốt xuất huyết có cảnh báo biến chứng', 'D01', 0.95, 'Sốt cao + Chảy máu chân răng/mũi + Đau bụng tức hạ sườn'),
('R04', 'Luật nhận diện Cúm mùa thể điển hình', 'D02', 0.85, 'Sốt cao đột ngột + Ho khan + Đau rát họng + Nghẹt mũi'),
('R05', 'Luật Cúm mùa kèm biểu hiện đau nhức toàn thân', 'D02', 0.80, 'Sốt vừa/cao + Đau mỏi cơ bắp + Ớn lạnh rét run + Mệt mỏi suy kiệt'),
('R06', 'Luật nhận diện COVID-19 có mất khứu giác', 'D03', 0.90, 'Sốt + Ho khan + Mất khứu giác/vị giác + Đau rát họng'),
('R07', 'Luật cảnh báo COVID-19 thể nặng có suy hô hấp', 'D03', 0.95, 'Sốt + Khó thở thở nhanh + Ho khan + Mệt mỏi suy kiệt'),
('R08', 'Luật nhận diện Bệnh Sởi giai đoạn khởi phát & toàn phát', 'D04', 0.90, 'Sốt cao + Phát ban sởi + Mắt đỏ viêm kết mạc + Ho khan'),
('R09', 'Luật Bệnh Sởi kèm hội chứng hô hấp', 'D04', 0.85, 'Sốt cao + Phát ban đỏ + Nghẹt mũi + Đau rát họng'),
('R10', 'Luật nhận diện Tay Chân Miệng điển hình', 'D05', 0.95, 'Sốt nhẹ/vừa + Ban bọng nước tay chân miệng + Buồn nôn/biếng ăn'),
('R11', 'Luật Tay Chân Miệng thể nhẹ mới khởi phát', 'D05', 0.80, 'Sốt nhẹ + Ban bọng nước tay chân miệng'),
('R12', 'Luật nhận diện Sốt rét thể kinh điển theo cơn', 'D06', 0.90, 'Sốt cao đột ngột + Ớn lạnh rét run từng cơn + Đau đầu + Mệt mỏi suy kiệt'),
('R13', 'Luật Sốt rét có kèm rối loạn tiêu hóa', 'D06', 0.80, 'Ớn lạnh rét run + Đau đầu trán + Buồn nôn + Tiêu chảy'),
('R14', 'Luật nhận diện Viêm họng - Amidan cấp', 'D07', 0.85, 'Sốt nhẹ/vừa + Đau rát họng khi nuốt + Ho khan + Nghẹt mũi'),
('R15', 'Luật Viêm họng Amidan xuất tiết đờm đặc', 'D07', 0.80, 'Sốt vừa + Đau rát họng + Ho có đờm đặc quánh'),
('R16', 'Luật củng cố Viêm đường hô hấp trên thông thường', 'D07', 0.75, 'Đau rát họng + Nghẹt mũi chảy nước mũi + Mệt mỏi');

-- Nạp tiền đề cho 16 luật (quan hệ N-N)
INSERT INTO tien_de_luat (ma_luat, ma_trieu_chung, toan_tu_logic) VALUES
('R01', 'S01', 'AND'), ('R01', 'S04', 'AND'), ('R01', 'S05', 'AND'), ('R01', 'S06', 'AND'),
('R02', 'S01', 'AND'), ('R02', 'S17', 'AND'), ('R02', 'S14', 'AND'),
('R03', 'S01', 'AND'), ('R03', 'S18', 'AND'), ('R03', 'S15', 'AND'),
('R04', 'S01', 'AND'), ('R04', 'S08', 'AND'), ('R04', 'S10', 'AND'), ('R04', 'S11', 'AND'),
('R05', 'S02', 'AND'), ('R05', 'S06', 'AND'), ('R05', 'S03', 'AND'), ('R05', 'S07', 'AND'),
('R06', 'S01', 'AND'), ('R06', 'S08', 'AND'), ('R06', 'S12', 'AND'), ('R06', 'S10', 'AND'),
('R07', 'S01', 'AND'), ('R07', 'S13', 'AND'), ('R07', 'S08', 'AND'), ('R07', 'S07', 'AND'),
('R08', 'S01', 'AND'), ('R08', 'S19', 'AND'), ('R08', 'S21', 'AND'), ('R08', 'S08', 'AND'),
('R09', 'S01', 'AND'), ('R09', 'S19', 'AND'), ('R09', 'S11', 'AND'), ('R09', 'S10', 'AND'),
('R10', 'S02', 'AND'), ('R10', 'S20', 'AND'), ('R10', 'S14', 'AND'),
('R11', 'S02', 'AND'), ('R11', 'S20', 'AND'),
('R12', 'S01', 'AND'), ('R12', 'S03', 'AND'), ('R12', 'S04', 'AND'), ('R12', 'S07', 'AND'),
('R13', 'S03', 'AND'), ('R13', 'S04', 'AND'), ('R13', 'S14', 'AND'), ('R13', 'S16', 'AND'),
('R14', 'S02', 'AND'), ('R14', 'S10', 'AND'), ('R14', 'S08', 'AND'), ('R14', 'S11', 'AND'),
('R15', 'S02', 'AND'), ('R15', 'S10', 'AND'), ('R15', 'S09', 'AND'),
('R16', 'S10', 'AND'), ('R16', 'S11', 'AND'), ('R16', 'S07', 'AND');

-- Ghi nhật ký khởi tạo
INSERT INTO nhat_ky_csdl (loai_thao_tac, ten_bang, chi_tiet) VALUES
('INIT', 'HE_THONG', 'Khởi tạo thành công cấu trúc CSDL SQLite chuẩn 3NF và 16 luật sinh chuẩn y tế');
