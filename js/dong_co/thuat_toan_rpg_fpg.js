/**
 * THUẬT TOÁN ĐỒ THỊ FPG & RPG CHO CƠ SỞ TRI THỨC Y TẾ (MED-EXPERT)
 * Chuẩn hóa lý thuyết theo tài liệu bài giảng: "Mô tơ suy diễn" - TS. Nguyễn Quốc Tuấn (Bm. Mạng & Các HTTT)
 * Áp dụng 100% vào bài toán Chẩn đoán Bệnh truyền nhiễm & Sốt cấp tính lâm sàng
 * 
 * 1. FPG (Facts Precedence Graph - Đồ thị liên hệ trước sự kiện)
 *    - Đỉnh: Các sự kiện y tế gồm Triệu chứng lâm sàng (S), Hội chứng trung gian (I), Bệnh kết luận (D)
 *    - Cung: f -> f' khi có luật y tế R chứa f ở vế trái và kết luận f' (mang nhãn luật R)
 *    - GT: Tập các triệu chứng bệnh nhân đang mắc phải (từ ca bệnh)
 *    - KL: Bệnh mục tiêu cần chẩn đoán
 *    - Hàm lượng giá suy diễn tiến: h^(R: left -> q) = KC_FPG(q, KL) -> min
 * 
 * 2. RPG (Rules Precedence Graph - Đồ thị liên hệ trước giữa các luật)
 *    - Đỉnh: Các luật chẩn đoán y tế R in R
 *    - Cung: R_i -> R_j khi kết luận của R_i (hội chứng trung gian) nằm trong tiền đề của R_j
 *    - Nhãn cung: mang tên hội chứng trung gian cầu nối
 *    - R_GT = { R: left -> q | left ⊆ GT } (Tập luật y tế thỏa mãn ngay từ triệu chứng ban đầu)
 *    - R_KL = { R: left -> q | q ⊆ KL } (Tập luật y tế dẫn tới bệnh kết luận mục tiêu)
 *    - Hàm lượng giá: h^(R: left -> q) = KC_RPG(R, R_KL) -> min
 */

// TẬP SỰ KIỆN VÀ TẬP LUẬT Y TẾ CHUẨN LÂM SÀNG
const MEDICAL_KB_GRAPH_DATA = {
  // Danh mục Sự kiện (Triệu chứng, Hội chứng trung gian, Bệnh lý)
  facts: {
    // 1. Triệu chứng ban đầu (Symptoms - S)
    S01: { id: "S01", name: "Sốt cao đột ngột (39-40°C)", type: "SYMPTOM" },
    S02: { id: "S02", name: "Sốt nhẹ đến sốt vừa (37.5-38.5°C)", type: "SYMPTOM" },
    S03: { id: "S03", name: "Ớn lạnh, rét run từng cơn", type: "SYMPTOM" },
    S04: { id: "S04", name: "Đau đầu dữ dội vùng trán", type: "SYMPTOM" },
    S05: { id: "S05", name: "Đau nhức sâu hai hốc mắt", type: "SYMPTOM" },
    S06: { id: "S06", name: "Đau mỏi cơ khớp toàn thân", type: "SYMPTOM" },
    S07: { id: "S07", name: "Đau rát họng khi nuốt", type: "SYMPTOM" },
    S08: { id: "S08", name: "Ho khan hoặc có đờm", type: "SYMPTOM" },
    S09: { id: "S09", name: "Hắt hơi, chảy nước mũi trong", type: "SYMPTOM" },
    S10: { id: "S10", name: "Đau rát họng, nuốt đau", type: "SYMPTOM" },
    S11: { id: "S11", name: "Khó thở, tức ngực, SpO2 giảm", type: "SYMPTOM" },
    S12: { id: "S12", name: "Mất khứu giác / mất vị giác", type: "SYMPTOM" },
    S13: { id: "S13", name: "Chấm xuất huyết / chảy máu cam", type: "SYMPTOM" },
    S14: { id: "S14", name: "Ban dát sẩn đỏ mặt lan thân", type: "SYMPTOM" },
    S15: { id: "S15", name: "Nốt phỏng nước bóng nước giọt sương", type: "SYMPTOM" },
    S16: { id: "S16", name: "Bọng nước loét lòng bàn tay, chân, miệng", type: "SYMPTOM" },
    S17: { id: "S17", name: "Mắt đỏ, viêm kết mạc sợ ánh sáng", type: "SYMPTOM" },
    S18: { id: "S18", name: "Buồn nôn, nôn, đau tức vùng gan", type: "SYMPTOM" },
    S19: { id: "S19", name: "Tiêu chảy / phân lỏng nhiều lần", type: "SYMPTOM" },
    S20: { id: "S20", name: "Mệt mỏi li bì, kiệt sức", type: "SYMPTOM" },
    S21: { id: "S21", name: "Giật mình chới với khi ngủ", type: "SYMPTOM" },

    // 2. Hội chứng lâm sàng trung gian (Intermediate Syndromes - I & HC)
    I01: { id: "I01", name: "HC Nhiễm trùng sốt cấp & đau cơ", type: "INTERMEDIATE" },
    I02: { id: "I02", name: "HC Xuất huyết & Cảnh báo huyết học", type: "INTERMEDIATE" },
    I03: { id: "I03", name: "HC Viêm long đường hô hấp trên", type: "INTERMEDIATE" },
    I04: { id: "I04", name: "HC Tổn thương niêm mạc bọng nước", type: "INTERMEDIATE" },
    I05: { id: "I05", name: "HC Cảnh báo thần kinh độ 2", type: "INTERMEDIATE" },
    I06: { id: "I06", name: "HC Suy hô hấp cấp tiến triển", type: "INTERMEDIATE" },
    HC01: { id: "HC01", name: "HC Sốt virus cấp tính", type: "INTERMEDIATE" },
    HC02: { id: "HC02", name: "Tam chứng viêm long hô hấp", type: "INTERMEDIATE" },
    HC03: { id: "HC03", name: "HC Viêm đường hô hấp trên", type: "INTERMEDIATE" },
    HC04: { id: "HC04", name: "HC Bóng nước ngoại ban", type: "INTERMEDIATE" },
    HC05: { id: "HC05", name: "HC Cảnh báo thần kinh", type: "INTERMEDIATE" },
    HC06: { id: "HC06", name: "HC Suy hô hấp cấp", type: "INTERMEDIATE" },

    // 3. Kết luận Bệnh lý mục tiêu (Diseases - D)
    D01: { id: "D01", name: "Sốt xuất huyết Dengue", type: "DISEASE", color: "#ef4444" },
    D02: { id: "D02", name: "Cúm mùa / Cúm A", type: "DISEASE", color: "#f59e0b" },
    D03: { id: "D03", name: "Bệnh Sởi (Measles)", type: "DISEASE", color: "#ec4899" },
    D04: { id: "D04", name: "COVID-19", type: "DISEASE", color: "#8b5cf6" },
    D05: { id: "D05", name: "Tay Chân Miệng độ 2A", type: "DISEASE", color: "#10b981" },
    D06: { id: "D06", name: "Bệnh Thủy đậu", type: "DISEASE", color: "#06b6d4" },
    D07: { id: "D07", name: "Viêm họng cấp tính", type: "DISEASE", color: "#64748b" }
  },

  // Danh mục Tập luật Y tế lâm sàng đa tầng
  rules: [
    // TẦNG 1: Triệu chứng -> Hội chứng trung gian
    {
      id: "R01",
      name: "Luật xác định HC Nhiễm trùng sốt cấp",
      premises: ["S01", "S04", "S06"],
      conclusion: "I01",
      label: "R01: S01 ∧ S04 ∧ S06 → I01",
      description: "NẾU Sốt cao (S01) VÀ Đau đầu trán (S04) VÀ Đau cơ khớp (S06) THÌ có Hội chứng nhiễm trùng sốt cấp (I01)"
    },
    {
      id: "R01A",
      name: "Luật sốt cao và đau đầu vùng trán",
      premises: ["S01", "S04"],
      conclusion: "I01",
      label: "R01A: S01 ∧ S04 → I01",
      description: "NẾU Sốt cao (S01) VÀ Đau đầu vùng trán (S04) THÌ có Hội chứng nhiễm trùng sốt cấp (I01)"
    },
    {
      id: "R02",
      name: "Luật xác định HC Xuất huyết cảnh báo",
      premises: ["S13", "S18"],
      conclusion: "I02",
      label: "R02: S13 ∧ S18 → I02",
      description: "NẾU Chấm xuất huyết dưới da (S13) VÀ Buồn nôn/đau bụng gan (S18) THÌ có HC Xuất huyết cảnh báo (I02)"
    },
    {
      id: "R02A",
      name: "Luật chấm xuất huyết dưới da đơn thuần",
      premises: ["S13"],
      conclusion: "I02",
      label: "R02A: S13 → I02",
      description: "NẾU Có chấm xuất huyết dưới da / chảy máu cam (S13) THÌ có HC Xuất huyết (I02)"
    },
    {
      id: "R02B",
      name: "Luật sốt cao kèm xuất huyết dưới da",
      premises: ["S01", "S13"],
      conclusion: "I02",
      label: "R02B: S01 ∧ S13 → I02",
      description: "NẾU Sốt cao (S01) VÀ Chấm xuất huyết dưới da (S13) THÌ có HC Xuất huyết cảnh báo (I02)"
    },
    {
      id: "R03",
      name: "Luật xác định HC Viêm long đường hô hấp trên",
      premises: ["S08", "S09", "S10"],
      conclusion: "I03",
      label: "R03: S08 ∧ S09 ∧ S10 → I03",
      description: "NẾU Ho (S08) VÀ Sổ mũi (S09) VÀ Đau rát họng (S10) THÌ có HC Viêm long hô hấp trên (I03)"
    },
    {
      id: "R03A",
      name: "Luật viêm long hô hấp (ho và sổ mũi)",
      premises: ["S08", "S09"],
      conclusion: "I03",
      label: "R03A: S08 ∧ S09 → I03",
      description: "NẾU Ho khan/đờm (S08) VÀ Sổ mũi (S09) THÌ có HC Viêm long hô hấp trên (I03)"
    },
    {
      id: "R03B",
      name: "Luật viêm đường hô hấp trên (sổ mũi và rát họng)",
      premises: ["S09", "S10"],
      conclusion: "I03",
      label: "R03B: S09 ∧ S10 → I03",
      description: "NẾU Sổ mũi (S09) VÀ Đau rát họng (S10) THÌ có HC Viêm đường hô hấp trên (I03)"
    },
    {
      id: "R04",
      name: "Luật xác định HC Tổn thương bọng nước tay chân miệng",
      premises: ["S02", "S16"],
      conclusion: "I04",
      label: "R04: S02 ∧ S16 → I04",
      description: "NẾU Sốt vừa (S02) VÀ Bọng nước lòng bàn tay/chân/miệng (S16) THÌ có HC Bọng nước tay chân miệng (I04)"
    },
    {
      id: "R04A",
      name: "Luật bọng nước lòng bàn tay chân niêm mạc miệng",
      premises: ["S16"],
      conclusion: "I04",
      label: "R04A: S16 → I04",
      description: "NẾU Có bọng nước loét lòng bàn tay, chân, miệng (S16) THÌ có HC Tổn thương bọng nước (I04)"
    },
    {
      id: "R05",
      name: "Luật xác định HC Cảnh báo biến chứng thần kinh",
      premises: ["S01", "S21"],
      conclusion: "I05",
      label: "R05: S01 ∧ S21 → I05",
      description: "NẾU Sốt cao (S01) VÀ Giật mình chới với khi ngủ (S21) THÌ có HC Cảnh báo biến chứng thần kinh (I05)"
    },
    {
      id: "R05A",
      name: "Luật giật mình chới với khi ngủ",
      premises: ["S21"],
      conclusion: "I05",
      label: "R05A: S21 → I05",
      description: "NẾU Giật mình chới với khi ngủ (S21) THÌ có HC Cảnh báo thần kinh (I05)"
    },
    {
      id: "R06",
      name: "Luật xác định HC Suy hô hấp cấp tiến triển",
      premises: ["S11", "S20"],
      conclusion: "I06",
      label: "R06: S11 ∧ S20 → I06",
      description: "NẾU Khó thở/tức ngực (S11) VÀ Mệt mỏi kiệt sức (S20) THÌ có HC Suy hô hấp cấp tiến triển (I06)"
    },

    // TẦNG 2: Hội chứng trung gian + Triệu chứng đặc hiệu -> Chẩn đoán Bệnh lý
    {
      id: "R07",
      name: "Luật chẩn đoán Sốt xuất huyết Dengue",
      premises: ["I01", "S05", "I02"],
      conclusion: "D01",
      label: "R07: I01 ∧ S05 ∧ I02 → D01",
      description: "NẾU HC Nhiễm trùng sốt cấp (I01) VÀ Đau sau hốc mắt (S05) VÀ HC Xuất huyết cảnh báo (I02) THÌ Chẩn đoán Sốt xuất huyết Dengue (D01)"
    },
    {
      id: "R07A",
      name: "Luật chẩn đoán SXH Dengue từ HC Sốt cấp & Dấu hiệu xuất huyết",
      premises: ["I01", "S13"],
      conclusion: "D01",
      label: "R07A: I01 ∧ S13 → D01",
      description: "NẾU HC Nhiễm trùng sốt cấp (I01) VÀ Chấm xuất huyết (S13) THÌ Chẩn đoán Sốt xuất huyết Dengue (D01)"
    },
    {
      id: "R07B",
      name: "Luật chẩn đoán SXH Dengue từ HC Sốt cấp & HC Xuất huyết",
      premises: ["I01", "I02"],
      conclusion: "D01",
      label: "R07B: I01 ∧ I02 → D01",
      description: "NẾU HC Nhiễm trùng sốt cấp (I01) VÀ HC Xuất huyết (I02) THÌ Chẩn đoán Sốt xuất huyết Dengue (D01)"
    },
    {
      id: "R08",
      name: "Luật chẩn đoán Cúm mùa / Cúm A",
      premises: ["I01", "I03", "S03"],
      conclusion: "D02",
      label: "R08: I01 ∧ I03 ∧ S03 → D02",
      description: "NẾU HC Nhiễm trùng sốt cấp (I01) VÀ HC Viêm long hô hấp (I03) VÀ Rét run từng cơn (S03) THÌ Chẩn đoán Cúm mùa / Cúm A (D02)"
    },
    {
      id: "R08A",
      name: "Luật chẩn đoán Cúm mùa từ HC Sốt cấp & Viêm long hô hấp",
      premises: ["I01", "I03"],
      conclusion: "D02",
      label: "R08A: I01 ∧ I03 → D02",
      description: "NẾU HC Nhiễm trùng sốt cấp (I01) VÀ HC Viêm long hô hấp (I03) THÌ Chẩn đoán Cúm mùa / Cúm A (D02)"
    },
    {
      id: "R09",
      name: "Luật chẩn đoán Bệnh Sởi (Measles)",
      premises: ["I03", "S14", "S17"],
      conclusion: "D03",
      label: "R09: I03 ∧ S14 ∧ S17 → D03",
      description: "NẾU HC Viêm long hô hấp (I03) VÀ Ban dát sẩn mặt lan thân (S14) VÀ Mắt đỏ sợ sáng (S17) THÌ Chẩn đoán Bệnh Sởi (D03)"
    },
    {
      id: "R09A",
      name: "Luật chẩn đoán Bệnh Sởi từ HC Viêm long & Phát ban dát sẩn",
      premises: ["I03", "S14"],
      conclusion: "D03",
      label: "R09A: I03 ∧ S14 → D03",
      description: "NẾU HC Viêm long hô hấp (I03) VÀ Phát ban dát sẩn (S14) THÌ Chẩn đoán Bệnh Sởi (D03)"
    },
    {
      id: "R10",
      name: "Luật chẩn đoán COVID-19 thể mất vị giác",
      premises: ["I03", "S12"],
      conclusion: "D04",
      label: "R10: I03 ∧ S12 → D04",
      description: "NẾU HC Viêm long hô hấp (I03) VÀ Mất khứu giác/vị giác (S12) THÌ Chẩn đoán Bệnh COVID-19 (D04)"
    },
    {
      id: "R11",
      name: "Luật chẩn đoán COVID-19 thể suy hô hấp tiến triển",
      premises: ["I03", "I06"],
      conclusion: "D04",
      label: "R11: I03 ∧ I06 → D04",
      description: "NẾU HC Viêm long hô hấp (I03) VÀ HC Suy hô hấp tiến triển (I06) THÌ Chẩn đoán COVID-19 thể nặng (D04)"
    },
    {
      id: "R12",
      name: "Luật chẩn đoán Tay Chân Miệng độ 2A có biến chứng",
      premises: ["I04", "I05"],
      conclusion: "D05",
      label: "R12: I04 ∧ I05 → D05",
      description: "NẾU HC Bọng nước tay chân miệng (I04) VÀ HC Cảnh báo thần kinh (I05) THÌ Chẩn đoán Tay Chân Miệng độ 2A (D05)"
    },
    {
      id: "R12A",
      name: "Luật chẩn đoán Tay Chân Miệng thể nhẹ",
      premises: ["I04", "S02"],
      conclusion: "D05",
      label: "R12A: I04 ∧ S02 → D05",
      description: "NẾU HC Bọng nước tay chân miệng (I04) VÀ Sốt nhẹ/vừa (S02) THÌ Chẩn đoán Tay Chân Miệng (D05)"
    },
    {
      id: "R12B",
      name: "Luật chẩn đoán Tay Chân Miệng sốt cao",
      premises: ["I04", "S01"],
      conclusion: "D05",
      label: "R12B: I04 ∧ S01 → D05",
      description: "NẾU HC Bọng nước tay chân miệng (I04) VÀ Sốt cao (S01) THÌ Chẩn đoán Tay Chân Miệng (D05)"
    },
    {
      id: "R13",
      name: "Luật chẩn đoán Bệnh Thủy đậu",
      premises: ["S15", "S02", "S06"],
      conclusion: "D06",
      label: "R13: S15 ∧ S02 ∧ S06 → D06",
      description: "NẾU Nốt phỏng nước giọt sương nhiều lứa tuổi (S15) VÀ Sốt nhẹ (S02) VÀ Đau mỏi cơ (S06) THÌ Chẩn đoán Bệnh Thủy đậu (D06)"
    },
    {
      id: "R13A",
      name: "Luật chẩn đoán Thủy đậu từ phỏng nước giọt sương & sốt nhẹ",
      premises: ["S15", "S02"],
      conclusion: "D06",
      label: "R13A: S15 ∧ S02 → D06",
      description: "NẾU Nốt phỏng nước giọt sương (S15) VÀ Sốt nhẹ (S02) THÌ Chẩn đoán Bệnh Thủy đậu (D06)"
    },
    {
      id: "R13B",
      name: "Luật chẩn đoán Thủy đậu thể sốt cao phát ban",
      premises: ["S15", "S01"],
      conclusion: "D06",
      label: "R13B: S15 ∧ S01 → D06",
      description: "NẾU Nốt phỏng nước giọt sương (S15) VÀ Sốt cao (S01) THÌ Chẩn đoán Bệnh Thủy đậu (D06)"
    },
    {
      id: "R14",
      name: "Luật chẩn đoán Viêm họng cấp thông thường",
      premises: ["I03", "S02"],
      conclusion: "D07",
      label: "R14: I03 ∧ S02 → D07",
      description: "NẾU HC Viêm long hô hấp (I03) VÀ Sốt nhẹ (S02) THÌ Chẩn đoán Viêm họng cấp tính (D07)"
    },
    {
      id: "R14A",
      name: "Luật chẩn đoán Viêm họng cấp từ rát họng & sổ mũi",
      premises: ["S10", "S09"],
      conclusion: "D07",
      label: "R14A: S10 ∧ S09 → D07",
      description: "NẾU Đau rát họng (S10) VÀ Chảy nước mũi (S09) THÌ Chẩn đoán Viêm họng cấp tính (D07)"
    }
  ],

  // CÁC CA BỆNH LÂM SÀNG KIỂM THỬ THỰC TẾ (BENCHMARK CLINICAL CASES)
  cases: [
    {
      id: "TC01",
      name: "Ca lâm sàng 1: Nghi nhiễm Sốt xuất huyết Dengue",
      description: "Bệnh nhân sốt cao đột ngột ngày 3, đau đầu vùng trán, đau nhức hốc mắt, đau mỏi cơ, buồn nôn và có chấm xuất huyết dưới da.",
      gt: ["S01", "S04", "S05", "S06", "S13", "S18"],
      kl: ["D01"],
      targetDiseaseName: "Sốt xuất huyết Dengue (D01)"
    },
    {
      id: "TC02",
      name: "Ca lâm sàng 2: Nghi nhiễm Cúm mùa / Cúm A",
      description: "Bệnh nhân sốt cao rét run, đau đầu, đau mỏi toàn thân, ho khan nhiều, chảy nước mũi và đau rát cổ họng.",
      gt: ["S01", "S03", "S04", "S06", "S08", "S09", "S10"],
      kl: ["D02"],
      targetDiseaseName: "Cúm mùa / Cúm A (D02)"
    },
    {
      id: "TC03",
      name: "Ca lâm sàng 3: Bệnh Sởi ở trẻ nhỏ",
      description: "Trẻ có tam chứng viêm long (ho, sổ mũi, rát họng), mắt đỏ chảy nước mắt sợ sáng và phát ban dát sẩn từ mặt lan xuống thân.",
      gt: ["S08", "S09", "S10", "S14", "S17"],
      kl: ["D03"],
      targetDiseaseName: "Bệnh Sởi (D03)"
    },
    {
      id: "TC04",
      name: "Ca lâm sàng 4: Nhiễm COVID-19 thể mất vị giác",
      description: "Bệnh nhân có triệu chứng viêm đường hô hấp kèm mất vị giác và khứu giác đột ngột, mệt mỏi.",
      gt: ["S08", "S09", "S10", "S12"],
      kl: ["D04"],
      targetDiseaseName: "Bệnh COVID-19 (D04)"
    },
    {
      id: "TC05",
      name: "Ca lâm sàng 5: Bệnh Tay Chân Miệng độ 2A",
      description: "Trẻ sốt cao, có các nốt bọng nước ở lòng bàn tay, bàn chân, miệng và xuất hiện cơn giật mình chới với khi ngủ.",
      gt: ["S01", "S02", "S16", "S21"],
      kl: ["D05"],
      targetDiseaseName: "Bệnh Tay Chân Miệng độ 2A (D05)"
    },
    {
      id: "TC06",
      name: "Ca lâm sàng 6: Bệnh Thủy đậu (Varicella)",
      description: "Bệnh nhân sốt nhẹ, người ê ẩm đau mỏi, xuất hiện các nốt phỏng nước giọt sương trong veo rải rác nhiều lứa tuổi.",
      gt: ["S02", "S06", "S15"],
      kl: ["D06"],
      targetDiseaseName: "Bệnh Thủy đậu (D06)"
    },
    {
      id: "TC07",
      name: "Ca lâm sàng 7: Viêm họng cấp tính thông thường",
      description: "Bệnh nhân sốt nhẹ, hắt hơi sổ mũi, ho và cổ họng đau rát khi nuốt nước bọt.",
      gt: ["S02", "S08", "S09", "S10"],
      kl: ["D07"],
      targetDiseaseName: "Viêm họng cấp (D07)"
    }
  ]
};

/**
 * LỚP GIẢI THUẬT ĐỒ THỊ FPG VÀ RPG Y TẾ
 */
class MedicalGraphAlgorithms {
  /**
   * Lấy tập luật y tế lâm sàng tương ứng
   */
  static getRulesForCase(selectedCase) {
    return MEDICAL_KB_GRAPH_DATA.rules || [];
  }

  /**
   * Xây dựng Đồ thị liên hệ trước sự kiện FPG (Slide 18 & 19 TS. Nguyễn Quốc Tuấn)
   * - Đỉnh: Các sự kiện gồm Giả thiết (GT), Trung gian, Kết luận (KL)
   * - Cung: p -> q mang nhãn luật r
   */
  static buildMedicalFPG(selectedCase) {
    const kb = MEDICAL_KB_GRAPH_DATA;
    const rules = this.getRulesForCase(selectedCase);
    const gtSet = new Set(selectedCase.gt || []);
    const klSet = new Set(selectedCase.kl || []);

    const nodes = [];
    const edges = [];
    const nodeIds = new Set();

    // 1. Thu thập các sự kiện liên quan
    rules.forEach(r => {
      (r.premises || []).forEach(p => nodeIds.add(p));
      if (r.conclusion) nodeIds.add(r.conclusion);
    });
    // Bổ sung các triệu chứng và kết luận của ca bệnh thực tế nếu chưa có trong tập luật
    (selectedCase.gt || []).forEach(p => nodeIds.add(p));
    (selectedCase.kl || []).forEach(k => nodeIds.add(k));

    // 2. Tạo đỉnh
    nodeIds.forEach(id => {
      let factMeta = kb.facts[id];
      if (!factMeta && typeof window !== "undefined" && window.DEFAULT_KNOWLEDGE_BASE) {
        const defKB = window.DEFAULT_KNOWLEDGE_BASE;
        const sym = (defKB.symptoms || []).find(s => s.id === id);
        const dis = (defKB.diseases || []).find(d => d.id === id);
        if (sym) {
          const isInter = id.startsWith("I") || id.startsWith("HC") || sym.groupId === "group_syndrome";
          factMeta = { id, name: sym.name, type: isInter ? "INTERMEDIATE" : "SYMPTOM" };
        } else if (dis) {
          factMeta = { id, name: dis.name, type: "DISEASE", color: dis.color || "#ef4444" };
        }
      }
      if (!factMeta) {
        const isInter = id.startsWith("I") || id.startsWith("HC");
        const isDis = id.startsWith("D");
        factMeta = { id, name: id, type: isDis ? "DISEASE" : (isInter ? "INTERMEDIATE" : "SYMPTOM") };
      }
      nodes.push({
        id,
        label: id,
        name: factMeta.name,
        type: factMeta.type,
        color: factMeta.color || null,
        isGT: gtSet.has(id),
        isKL: klSet.has(id)
      });
    });

    // 3. Tạo cung có hướng kèm nhãn mã luật: p -> q mang nhãn r
    rules.forEach(r => {
      (r.premises || []).forEach(p => {
        edges.push({
          from: p,
          to: r.conclusion,
          ruleId: r.id,
          label: r.id
        });
      });
    });

    return { nodes, edges, gtSet, klSet, rules };
  }

  /**
   * Tính khoảng cách ngắn nhất trên FPG y tế: KC_FPG(q, KL)
   * Tìm đường đi ngắn nhất (số bước) từ sự kiện q tới bất kỳ bệnh mục tiêu nào trong KL
   */
  static calculateFPGDistanceToKL(q, klSet, fpgEdges) {
    if (klSet.has(q)) return 0;

    const adj = new Map();
    fpgEdges.forEach(e => {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from).push(e.to);
    });

    const queue = [[q, 0]];
    const visited = new Set([q]);

    while (queue.length > 0) {
      const [current, dist] = queue.shift();
      if (klSet.has(current)) {
        return dist;
      }
      const neighbors = adj.get(current) || [];
      for (const nxt of neighbors) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push([nxt, dist + 1]);
        }
      }
    }
    return Infinity;
  }

  /**
   * Xây dựng Đồ thị liên hệ trước giữa các luật RPG y tế
   * - Đỉnh: Mỗi luật chẩn đoán y tế R_i
   * - Cung: R_i -> R_j khi kết luận của R_i (hội chứng I) nằm trong vế trái của R_j
   * - R_GT: Các luật thỏa mãn ngay từ triệu chứng ban đầu (left ⊆ GT)
   * - R_KL: Các luật suy ra bệnh kết luận mục tiêu (q ⊆ KL)
   */
  static buildMedicalRPG(selectedCase) {
    const kb = MEDICAL_KB_GRAPH_DATA;
    const rules = this.getRulesForCase(selectedCase);
    const gtSet = new Set(selectedCase.gt || []);
    const klSet = new Set(selectedCase.kl || []);

    const nodes = [];
    const edges = [];
    const rGtIds = new Set();
    const rKlIds = new Set();

    rules.forEach(r => {
      const isR_GT = (r.premises || []).every(p => gtSet.has(p));
      const isR_KL = klSet.has(r.conclusion);

      if (isR_GT) rGtIds.add(r.id);
      if (isR_KL) rKlIds.add(r.id);

      nodes.push({
        id: r.id,
        label: r.id,
        name: r.name,
        description: r.description,
        ruleData: r,
        premises: r.premises,
        conclusion: r.conclusion,
        isR_GT,
        isR_KL
      });
    });

    // Tạo các cung giữa các luật: R_i -> R_j (Slide 22 TS. Nguyễn Quốc Tuấn)
    // ri -> rj khi kết luận của ri là tiền đề của rj
    for (let i = 0; i < rules.length; i++) {
      for (let j = 0; j < rules.length; j++) {
        if (i === j) continue;
        const ri = rules[i];
        const rj = rules[j];
        if ((rj.premises || []).includes(ri.conclusion)) {
          edges.push({
            from: ri.id,
            to: rj.id,
            connectorFact: ri.conclusion,
            connectorName: (kb.facts[ri.conclusion] || {}).name || ri.conclusion,
            label: ri.conclusion
          });
        }
      }
    }

    return { nodes, edges, rGtIds, rKlIds, rules, selectedCase };
  }

  /**
   * Tính khoảng cách trên RPG y tế: KC(R, R_KL)
   * Khoảng cách ngắn nhất từ luật R tới tập luật dẫn đến chẩn đoán bệnh kết luận
   */
  static calculateRPGDistanceToR_KL(ruleId, rKlIds, rpgEdges) {
    if (rKlIds.has(ruleId)) return 0;

    const adj = new Map();
    rpgEdges.forEach(e => {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from).push(e.to);
    });

    const queue = [[ruleId, 0]];
    const visited = new Set([ruleId]);

    while (queue.length > 0) {
      const [current, dist] = queue.shift();
      if (rKlIds.has(current)) {
        return dist;
      }
      const neighbors = adj.get(current) || [];
      for (const nxt of neighbors) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push([nxt, dist + 1]);
        }
      }
    }

    return Infinity;
  }

  /**
   * KẾ THỪA SUY DIỄN TIẾN CHO ĐỒ THỊ FPG VÀ RPG
   * Các phương thức simulateForwardChainingWithFPG và simulateForwardChainingWithRPG
   * được kế thừa và hiện thực thông qua FPGForwardChainingEngine và RPGForwardChainingEngine.
   */
  static simulateForwardChainingWithFPG(selectedCase) {
    const engine = new FPGForwardChainingEngine(selectedCase);
    return engine.simulate(selectedCase);
  }

  static simulateForwardChainingWithRPG(selectedCase) {
    const engine = new RPGForwardChainingEngine(selectedCase);
    return engine.simulate(selectedCase);
  }
}

/**
 * LỚP ĐỘNG CƠ SUY DIỄN TIẾN TRÊN ĐỒ THỊ FPG (FACTS PRECEDENCE GRAPH)
 * Kế thừa trực tiếp từ ForwardChainingEngine (Slide 18 - 21)
 * Định nghĩa hàm lượng giá Heuristic: h^(r) = KC_FPG(q, KL) -> min
 */
const BaseForwardEngine = (typeof ForwardChainingEngine !== "undefined")
  ? ForwardChainingEngine
  : (typeof window !== "undefined" && window.ForwardChainingEngine)
    ? window.ForwardChainingEngine
    : class EmptyBaseEngine {};

class FPGForwardChainingEngine extends BaseForwardEngine {
  constructor(selectedCase = null, options = {}) {
    super(options.kb || MEDICAL_KB_GRAPH_DATA, options);
    this.selectedCase = selectedCase;
    this.fpgGraph = null;
    if (selectedCase) {
      this.fpgGraph = MedicalGraphAlgorithms.buildMedicalFPG(selectedCase);
    }
  }

  /**
   * Ghi đè hàm lượng giá Heuristic FPG (Slide 18)
   * h^(r) = KC_FPG(q, KL) -> min
   */
  calculateHeuristic(rule, context) {
    const klSet = context.klSet || (this.selectedCase ? new Set(this.selectedCase.kl || []) : new Set());
    const edges = this.fpgGraph ? this.fpgGraph.edges : (context.fpgEdges || []);
    return MedicalGraphAlgorithms.calculateFPGDistanceToKL(rule.conclusion, klSet, edges);
  }

  /**
   * Ghi đè lượng giá tập xung đột THOA theo đồ thị FPG
   */
  evaluateConflictRules(thoa, context) {
    const klSet = context.klSet || (this.selectedCase ? new Set(this.selectedCase.kl || []) : new Set());
    const klArr = klSet ? Array.from(klSet) : [];
    const edges = this.fpgGraph ? this.fpgGraph.edges : (context.fpgEdges || []);

    return (thoa || []).map(r => {
      const kc = MedicalGraphAlgorithms.calculateFPGDistanceToKL(r.conclusion, klSet, edges);
      return {
        rule: r,
        ruleId: r.id,
        conclusion: r.conclusion,
        kc,
        formulaStr: `h^(${r.id}) = KC(${r.conclusion}, ${klArr.join(",")}) = ${kc === Infinity ? "∞" : kc}`
      };
    });
  }

  /**
   * Chọn luật tối ưu theo Heuristic FPG (Slide 18 & 20):
   * 1. h^(r) = KC_FPG(q, KL) -> min
   * 2. Tie-break: csmin (chỉ số luật nhỏ nhất) theo Slide 16 & 17
   */
  selectConflictRule(thoa, evaluations, context) {
    if (!evaluations || evaluations.length === 0) return null;
    const sorted = [...evaluations].sort((a, b) => {
      const kcA = a.kc !== null && a.kc !== undefined ? a.kc : Infinity;
      const kcB = b.kc !== null && b.kc !== undefined ? b.kc : Infinity;
      if (kcA !== kcB) return kcA - kcB;
      return a.ruleId.localeCompare(b.ruleId, undefined, { numeric: true });
    });
    return sorted[0];
  }

  /**
   * Thực thi mô phỏng suy diễn tiến FPG bằng cách tái sử dụng inferStandard từ ForwardChainingEngine
   */
  simulate(selectedCase) {
    this.selectedCase = selectedCase;
    this.fpgGraph = MedicalGraphAlgorithms.buildMedicalFPG(selectedCase);
    const rules = MedicalGraphAlgorithms.getRulesForCase(selectedCase);

    return this.inferStandard(selectedCase.gt || [], selectedCase.kl || [], {
      rules,
      conflictStrategy: "heuristic",
      contextExtras: {
        fpgGraph: this.fpgGraph,
        fpgEdges: this.fpgGraph.edges
      }
    });
  }
}

/**
 * LỚP ĐỘNG CƠ SUY DIỄN TIẾN TRÊN ĐỒ THỊ RPG (RULES PRECEDENCE GRAPH)
 * Kế thừa trực tiếp từ ForwardChainingEngine (Slide 22 - 23)
 * Định nghĩa hàm lượng giá Heuristic: h^(r) = KC_RPG(r, R_KL) -> min
 */
class RPGForwardChainingEngine extends BaseForwardEngine {
  constructor(selectedCase = null, options = {}) {
    super(options.kb || MEDICAL_KB_GRAPH_DATA, options);
    this.selectedCase = selectedCase;
    this.rpgGraph = null;
    if (selectedCase) {
      this.rpgGraph = MedicalGraphAlgorithms.buildMedicalRPG(selectedCase);
    }
  }

  /**
   * Ghi đè hàm lượng giá Heuristic RPG (Slide 22)
   * h^(r) = KC_RPG(r, R_KL) -> min
   */
  calculateHeuristic(rule, context) {
    const rKlIds = this.rpgGraph ? this.rpgGraph.rKlIds : (context.rKlIds || new Set());
    const edges = this.rpgGraph ? this.rpgGraph.edges : (context.rpgEdges || []);
    return MedicalGraphAlgorithms.calculateRPGDistanceToR_KL(rule.id, rKlIds, edges);
  }

  /**
   * Ghi đè lượng giá tập xung đột THOA theo đồ thị RPG
   */
  evaluateConflictRules(thoa, context) {
    const rKlIds = this.rpgGraph ? this.rpgGraph.rKlIds : (context.rKlIds || new Set());
    const edges = this.rpgGraph ? this.rpgGraph.edges : (context.rpgEdges || []);

    return (thoa || []).map(r => {
      const kc = MedicalGraphAlgorithms.calculateRPGDistanceToR_KL(r.id, rKlIds, edges);
      return {
        rule: r,
        ruleId: r.id,
        ruleName: r.name,
        conclusion: r.conclusion,
        kc,
        formulaStr: `h^(${r.id}) = KC(${r.id}, R_KL) = ${kc === Infinity ? "∞" : kc}`
      };
    });
  }

  /**
   * Chọn luật tối ưu theo Heuristic RPG (Slide 22):
   * 1. h^(r) = KC_RPG(r, R_KL) -> min
   * 2. Tie-break: csmin (chỉ số nhỏ nhất) theo Slide 16 & 17
   */
  selectConflictRule(thoa, evaluations, context) {
    if (!evaluations || evaluations.length === 0) return null;
    const sorted = [...evaluations].sort((a, b) => {
      const kcA = a.kc !== null && a.kc !== undefined ? a.kc : Infinity;
      const kcB = b.kc !== null && b.kc !== undefined ? b.kc : Infinity;
      if (kcA !== kcB) return kcA - kcB;
      return a.ruleId.localeCompare(b.ruleId, undefined, { numeric: true });
    });
    return sorted[0];
  }

  /**
   * Thực thi mô phỏng suy diễn tiến RPG bằng cách tái sử dụng inferStandard từ ForwardChainingEngine
   */
  simulate(selectedCase) {
    this.selectedCase = selectedCase;
    this.rpgGraph = MedicalGraphAlgorithms.buildMedicalRPG(selectedCase);
    const rules = MedicalGraphAlgorithms.getRulesForCase(selectedCase);

    return this.inferStandard(selectedCase.gt || [], selectedCase.kl || [], {
      rules,
      conflictStrategy: "heuristic",
      contextExtras: {
        rpgGraph: this.rpgGraph,
        rKlIds: this.rpgGraph.rKlIds,
        rpgEdges: this.rpgGraph.edges
      }
    });
  }
}

if (typeof window !== "undefined") {
  window.MEDICAL_KB_GRAPH_DATA = MEDICAL_KB_GRAPH_DATA;
  window.MedicalGraphAlgorithms = MedicalGraphAlgorithms;
  window.FPGForwardChainingEngine = FPGForwardChainingEngine;
  window.RPGForwardChainingEngine = RPGForwardChainingEngine;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MEDICAL_KB_GRAPH_DATA,
    MedicalGraphAlgorithms,
    FPGForwardChainingEngine,
    RPGForwardChainingEngine
  };
}
