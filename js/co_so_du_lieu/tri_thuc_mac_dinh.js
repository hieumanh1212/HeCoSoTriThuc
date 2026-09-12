/**
 * CƠ SỞ TRI THỨC Y TẾ MẪU (DEFAULT KNOWLEDGE BASE)
 * Lĩnh vực: Chẩn đoán phân biệt các bệnh truyền nhiễm & sốt cấp tính phổ biến
 * Nguồn tham khảo:
 * 1. Hướng dẫn Chẩn đoán và Điều trị Sốt xuất huyết Dengue (Quyết định 2760/QĐ-BYT)
 * 2. Hướng dẫn Chẩn đoán và Điều trị Cúm mùa & Cúm A (Quyết định 2078/QĐ-BYT)
 * 3. Hướng dẫn Chẩn đoán, Điều trị Bệnh Sởi (Quyết định 1327/QĐ-BYT)
 * 4. Hướng dẫn Chẩn đoán và Điều trị Bệnh Tay Chân Miệng (Quyết định 1003/QĐ-BYT)
 * 5. Hướng dẫn Chẩn đoán và Điều trị COVID-19 (Quyết định 250/QĐ-BYT)
 * 6. Hướng dẫn Chẩn đoán và Điều trị Bệnh Thủy đậu (Quyết định 3409/QĐ-BYT)
 */

const DEFAULT_KNOWLEDGE_BASE = {
  metadata: {
    title: "Hệ Tri thức Chẩn đoán Bệnh truyền nhiễm & Sốt cấp tính",
    version: "1.0.0",
    author: "Học viên Cao học CNTT",
    institution: "Khoa CNTT - Học phần Hệ cơ sở tri thức",
    lastUpdated: "2026-09-12",
    sources: [
      {
        name: "Bộ Y Tế Việt Nam",
        document: "Hướng dẫn chẩn đoán và điều trị bệnh truyền nhiễm phổ biến (Sốt xuất huyết, Cúm, Sởi, Tay chân miệng, Thủy đậu, COVID-19)",
        reliability: "Rất cao (Văn bản quy chuẩn y tế quốc gia)"
      },
      {
        name: "Tổ chức Y tế Thế giới (WHO)",
        document: "Clinical Management of Dengue and Acute Viral Infections Guidelines",
        reliability: "Rất cao (Tổ chức Quốc tế)"
      }
    ]
  },

  // Danh mục nhóm triệu chứng
  symptomGroups: [
    { id: "group_fever", name: "Triệu chứng Sốt & Thân nhiệt", icon: "fas fa-thermometer-half" },
    { id: "group_respiratory", name: "Triệu chứng Đường hô hấp", icon: "fas fa-lungs" },
    { id: "group_skin", name: "Triệu chứng Da & Niêm mạc", icon: "fas fa-allergies" },
    { id: "group_pain", name: "Triệu chứng Cơ - Xương - Đau nhức", icon: "fas fa-bone" },
    { id: "group_digestive", name: "Triệu chứng Tiêu hóa & Khác", icon: "fas fa-stethoscope" }
  ],

  // Danh mục triệu chứng (Sự kiện / Facts)
  symptoms: [
    // Sốt & Thân nhiệt
    { id: "S01", name: "Sốt cao đột ngột (39 - 40°C), liên tục 2-7 ngày", groupId: "group_fever", question: "Bạn có bị sốt cao đột ngột, uống hạ sốt khó hạ không?" },
    { id: "S02", name: "Sốt nhẹ đến sốt vừa (37.5 - 38.5°C)", groupId: "group_fever", question: "Bạn có bị sốt nhẹ hoặc sốt vừa âm ỉ không?" },
    { id: "S03", name: "Ớn lạnh, rét run từng cơn", groupId: "group_fever", question: "Bạn có cảm giác ớn lạnh, gai rét hoặc rét run không?" },

    // Đau nhức
    { id: "S04", name: "Đau đầu dữ dội, đặc biệt vùng trán", groupId: "group_pain", question: "Bạn có bị đau nhức đầu nhiều, nặng vùng trán hoặc thái dương không?" },
    { id: "S05", name: "Đau nhức hai hốc mắt (tăng khi liếc mắt)", groupId: "group_pain", question: "Bạn có cảm giác đau nhức sâu phía sau hai hốc mắt không?" },
    { id: "S06", name: "Đau mỏi cơ bắp, đau nhức toàn thân", groupId: "group_pain", question: "Cơ thể bạn có bị ê ẩm, đau nhức các bắp cơ toàn thân không?" },
    { id: "S07", name: "Đau nhức khớp xương", groupId: "group_pain", question: "Bạn có bị đau nhức tại các khớp tay chân không?" },

    // Đường hô hấp
    { id: "S08", name: "Ho khan hoặc ho có đờm", groupId: "group_respiratory", question: "Bạn có bị ho (ho khan hoặc ho có đờm) không?" },
    { id: "S09", name: "Hắt hơi, chảy nước mũi trong hoặc nghẹt mũi", groupId: "group_respiratory", question: "Bạn có bị hắt hơi, sổ mũi hoặc nghẹt mũi liên tục không?" },
    { id: "S10", name: "Đau rát họng, nuốt đau", groupId: "group_respiratory", question: "Cổ họng bạn có bị đau rát, khó chịu khi nuốt không?" },
    { id: "S11", name: "Khó thở, hụt hơi, tức ngực", groupId: "group_respiratory", question: "Bạn có cảm thấy khó thở, hụt hơi khi vận động nhẹ hoặc tức ngực không?" },
    { id: "S12", name: "Mất hoặc giảm khứu giác / vị giác", groupId: "group_respiratory", question: "Bạn có bị mất cảm giác ngửi mùi hoặc nếm vị thức ăn không?" },

    // Da & Niêm mạc
    { id: "S13", name: "Chấm xuất huyết dưới da / chảy máu cam / chân răng", groupId: "group_skin", question: "Trên da có xuất hiện các chấm đỏ li ti không mất khi căng da, hoặc chảy máu cam/chân răng không?" },
    { id: "S14", name: "Phát ban dạng dát sẩn đỏ (bắt đầu từ mặt lan xuống thân)", groupId: "group_skin", question: "Bạn có phát ban đỏ mịn từ sau tai, mặt rồi lan dần xuống ngực, lưng, tay chân không?" },
    { id: "S15", name: "Nốt phỏng nước trên nền da đỏ (nhiều lứa tuổi, giọt sương trên lá sen)", groupId: "group_skin", question: "Trên người có mọc các nốt mụn nước trong veo, ngứa, mọc rải rác toàn thân không?" },
    { id: "S16", name: "Phỏng nước / vết loét ở lòng bàn tay, bàn chân, mông, miệng", groupId: "group_skin", question: "Trong miệng có vết loét và ở lòng bàn tay/chân/mông có nổi bóng nước nhỏ không?" },
    { id: "S17", name: "Mắt đỏ, viêm kết mạc, chảy nước mắt, sợ ánh sáng", groupId: "group_skin", question: "Mắt bạn có bị đỏ, cộm, chảy nước mắt nhiều hoặc sợ nhìn ánh sáng không?" },

    // Tiêu hóa & Khác
    { id: "S18", name: "Buồn nôn, nôn mửa hoặc đau bụng vùng gan", groupId: "group_digestive", question: "Bạn có cảm giác buồn nôn, nôn hoặc đau tức vùng bụng không?" },
    { id: "S19", name: "Tiêu chảy, phân lỏng nhiều lần", groupId: "group_digestive", question: "Bạn có bị đi ngoài phân lỏng nhiều lần trong ngày không?" },
    { id: "S20", name: "Mệt mỏi li bì, kiệt sức", groupId: "group_digestive", question: "Bạn có cảm thấy mệt lả, kiệt sức, không muốn ngồi dậy không?" },
    { id: "S21", name: "Giật mình chới với khi ngủ", groupId: "group_digestive", question: "Khi nằm ngủ bạn (hoặc trẻ) có xuất hiện cơn giật mình chới với không?" }
  ],

  // Danh mục Kết luận / Bệnh (Goals/Conclusions)
  diseases: [
    {
      id: "D01",
      name: "Sốt xuất huyết Dengue",
      severity: "Nguy hiểm (Cần theo dõi sát tiểu cầu & dấu hiệu cảnh báo)",
      color: "#ef4444",
      description: "Bệnh truyền nhiễm cấp tính do virus Dengue gây ra, lây truyền qua muỗi Aedes. Bệnh có thể diễn tiến nặng vào ngày thứ 3-7 với nguy cơ sốc giảm thể tích và xuất huyết nội tạng.",
      warningSigns: "Đau bụng nhiều ở hạ sườn phải, nôn liên tục, chảy máu niêm mạc tự nhiên, li bì vật vã, tiểu ít.",
      recommendation: "Tuyệt đối không dùng Aspirin/Ibuprofen hạ sốt (dùng Paracetamol đúng liều). Uống nhiều Oresol bù nước. Đi xét nghiệm công thức máu (NS1Ag, Tiểu cầu) tại cơ sở y tế.",
      reference: "Quyết định 2760/QĐ-BYT Bộ Y Tế"
    },
    {
      id: "D02",
      name: "Cúm mùa / Cúm A (Influenza)",
      severity: "Trung bình (Có thể diễn tiến nặng ở người suy giảm miễn dịch)",
      color: "#f59e0b",
      description: "Bệnh nhiễm trùng đường hô hấp cấp do virus Cúm (Influenza A/B) gây ra, lây lan mạnh qua đường giọt bắn.",
      warningSigns: "Khó thở tăng dần, sốt cao kéo dài trên 5 ngày không hạ, đau tức ngực dữ dội.",
      recommendation: "Nghỉ ngơi, cách ly giọt bắn, súc họng nước muối, hạ sốt bằng Paracetamol. Uống đủ nước, bổ sung vitamin C. Nếu thuộc nhóm nguy cơ cao hoặc khó thở cần đi khám để chỉ định Tamiflu sớm.",
      reference: "Quyết định 2078/QĐ-BYT Bộ Y Tế"
    },
    {
      id: "D03",
      name: "Bệnh Sởi (Measles)",
      severity: "Cao (Dễ lây lan mạnh & biến chứng viêm phổi, viêm não)",
      color: "#ec4899",
      description: "Bệnh truyền nhiễm cấp tính do virus Morbillivirus, đặc trưng bởi tam chứng hô hấp (sốt, ho, mắt đỏ) và ban dát sẩn từ đầu mặt lan xuống chân, khi bay để lại vết thâm 'vằn da hổ'.",
      warningSigns: "Sốt cao không hạ sau khi ban mọc hết, thở nhanh, thở rút lõm lồng ngực, li bì co giật.",
      recommendation: "Cách ly tối thiểu 4 ngày sau khi phát ban. Bổ sung Vitamin A liều cao theo phác đồ của Bộ Y Tế để chống biến chứng loét giác mạc. Vệ sinh mắt, mũi, họng bằng nước muối sinh lý.",
      reference: "Quyết định 1327/QĐ-BYT Bộ Y Tế"
    },
    {
      id: "D04",
      name: "COVID-19",
      severity: "Trung bình đến Nặng (Tùy thuộc biến thể và bệnh nền)",
      color: "#8b5cf6",
      description: "Bệnh nhiễm trùng đường hô hấp do virus SARS-CoV-2 gây ra. Biểu hiện đa dạng từ nhẹ không triệu chứng đến viêm phổi cấp tính ARDS.",
      warningSigns: "Chỉ số SpO2 dưới 95%, thở dốc trên 20 lần/phút khi nghỉ, tím tái môi đầu chi, đau tức ngực liên tục.",
      recommendation: "Thực hiện test nhanh kháng nguyên SARS-CoV-2. Theo dõi chỉ số SpO2 và nhịp thở thường xuyên. Đeo khẩu trang, cách ly phòng lây nhiễm cho người xung quanh.",
      reference: "Quyết định 250/QĐ-BYT Bộ Y Tế"
    },
    {
      id: "D05",
      name: "Bệnh Tay Chân Miệng (HFMD)",
      severity: "Nguy hiểm ở trẻ em (Nguy cơ biến chứng thần kinh, tim mạch do EV71)",
      color: "#06b6d4",
      description: "Bệnh truyền nhiễm do virus đường ruột (Coxsackievirus A16 và Enterovirus 71) gây ra, phổ biến ở trẻ dưới 5 tuổi với các bọng nước điển hình.",
      warningSigns: "Giật mình chới với lúc thiu thiu ngủ (trên 2 lần/30 phút), sốt cao trên 39 độ không hạ, run chi, đi loạng choạng, nôn ói nhiều.",
      recommendation: "Đưa ngay đến bệnh viện nếu có dấu hiệu giật mình. Cho ăn thức ăn lỏng, nguội, mềm. Rửa tay thường xuyên bằng xà phòng sát khuẩn.",
      reference: "Quyết định 1003/QĐ-BYT Bộ Y Tế"
    },
    {
      id: "D06",
      name: "Bệnh Thủy đậu (Varicella / Chickenpox)",
      severity: "Trung bình (Nguy cơ bội nhiễm da và sẹo)",
      color: "#10b981",
      description: "Bệnh truyền nhiễm cấp tính do virus Varicella Zoster gây ra, đặc trưng bởi ban phỏng nước dạng bọng nước trong suốt nhiều lứa tuổi rải rác toàn thân.",
      warningSigns: "Nốt phỏng hóa mủ đục kèm sưng tấy đỏ xung quanh da (bội nhiễm vi khuẩn), sốt cao li bì, ho nhiều.",
      recommendation: "Chấm dung dịch Xanh Methylen hoặc Castellani lên nốt phỏng đã vỡ. Không gãi làm vỡ bọng nước tránh bội nhiễm và sẹo lõm. Dùng thuốc kháng virus Acyclovir nếu có chỉ định sớm của bác sĩ.",
      reference: "Quyết định 3409/QĐ-BYT Bộ Y Tế"
    },
    {
      id: "D07",
      name: "Viêm họng / Viêm amidan cấp",
      severity: "Nhẹ đến Trung bình",
      color: "#64748b",
      description: "Tình trạng viêm nhiễm cấp tính ở niêm mạc họng do virus thông thường hoặc vi khuẩn Streptococcus.",
      warningSigns: "Khó nuốt hoàn toàn, không nuốt được nước bọt, sốt cao kèm hạch cổ sưng to và đau dữ dội.",
      recommendation: "Súc họng bằng nước muối sinh lý ấm 3-4 lần/ngày. Uống nước ấm, hạ sốt giảm đau. Đi khám nếu nghi ngờ nhiễm liên cầu khuẩn để chỉ định kháng sinh phù hợp.",
      reference: "Phác đồ Tai Mũi Họng - Bộ Y Tế"
    }
  ],

  // Danh mục Tập luật sinh (Production Rules with Certainty Factor)
  // Logic: premises là danh sách các triệu chứng kết hợp (AND/OR). Ở đây chuẩn hóa dạng mảng AND.
  rules: [
    // --- LUẬT CHO SỐT XUẤT HUYẾT DENGUE (D01) ---
    {
      id: "R01",
      name: "Luật chẩn đoán Sốt xuất huyết thể điển hình",
      premises: ["S01", "S04", "S05", "S06"],
      conclusion: "D01",
      cf: 0.85,
      description: "IF Sốt cao đột ngột (S01) AND Đau đầu vùng trán (S04) AND Đau hốc mắt (S05) AND Đau cơ toàn thân (S06) THEN Nghi ngờ Sốt xuất huyết (CF = 0.85)"
    },
    {
      id: "R02",
      name: "Luật chẩn đoán Sốt xuất huyết có dấu hiệu xuất huyết",
      premises: ["S01", "S13"],
      conclusion: "D01",
      cf: 0.90,
      description: "IF Sốt cao đột ngột (S01) AND Chấm xuất huyết dưới da/chảy máu cam (S13) THEN Khả năng cao Sốt xuất huyết (CF = 0.90)"
    },
    {
      id: "R03",
      name: "Luật Sốt xuất huyết kèm rối loạn tiêu hóa / nôn ói",
      premises: ["S01", "S06", "S18", "S20"],
      conclusion: "D01",
      cf: 0.75,
      description: "IF Sốt cao (S01) AND Đau mỏi cơ (S06) AND Buồn nôn/đau bụng (S18) AND Mệt li bì (S20) THEN Nghi ngờ Sốt xuất huyết (CF = 0.75)"
    },

    // --- LUẬT CHO CÚM MÙA / CÚM A (D02) ---
    {
      id: "R04",
      name: "Luật chẩn đoán Cúm mùa thể hô hấp trên",
      premises: ["S01", "S03", "S06", "S08", "S09"],
      conclusion: "D02",
      cf: 0.88,
      description: "IF Sốt cao (S01) AND Ớn lạnh rét run (S03) AND Đau mỏi cơ (S06) AND Ho (S08) AND Sổ mũi nghẹt mũi (S09) THEN Nghi ngờ Cúm mùa / Cúm A (CF = 0.88)"
    },
    {
      id: "R05",
      name: "Luật Cúm có đau rát họng và mệt mỏi",
      premises: ["S01", "S08", "S10", "S20"],
      conclusion: "D02",
      cf: 0.80,
      description: "IF Sốt cao (S01) AND Ho (S08) AND Đau rát họng (S10) AND Mệt mỏi (S20) THEN Nghi ngờ Cúm (CF = 0.80)"
    },

    // --- LUẬT CHO BỆNH SỞI (D03) ---
    {
      id: "R06",
      name: "Luật chẩn đoán Sởi giai đoạn phát ban",
      premises: ["S01", "S08", "S09", "S14", "S17"],
      conclusion: "D03",
      cf: 0.95,
      description: "IF Sốt cao (S01) AND Tam chứng viêm long (Ho S08, Sổ mũi S09, Mắt đỏ S17) AND Ban dát sẩn mặt lan thân (S14) THEN Chắc chắn cao Bệnh Sởi (CF = 0.95)"
    },
    {
      id: "R07",
      name: "Luật Sởi giai đoạn khởi phát viêm long",
      premises: ["S01", "S08", "S17"],
      conclusion: "D03",
      cf: 0.70,
      description: "IF Sốt cao (S01) AND Ho nhiều (S08) AND Viêm kết mạc mắt đỏ sợ ánh sáng (S17) THEN Nghi ngờ Sởi thời kỳ khởi phát (CF = 0.70)"
    },

    // --- LUẬT CHO COVID-19 (D04) ---
    {
      id: "R08",
      name: "Luật chẩn đoán COVID-19 có mất khứu giác đặc trưng",
      premises: ["S08", "S10", "S12"],
      conclusion: "D04",
      cf: 0.92,
      description: "IF Ho (S08) AND Đau rát họng (S10) AND Mất/giảm khứu giác vị giác (S12) THEN Khả năng rất cao COVID-19 (CF = 0.92)"
    },
    {
      id: "R09",
      name: "Luật COVID-19 thể sốt vừa kèm khó thở",
      premises: ["S02", "S08", "S11", "S20"],
      conclusion: "D04",
      cf: 0.85,
      description: "IF Sốt nhẹ/vừa (S02) AND Ho (S08) AND Khó thở hụt hơi (S11) AND Mệt mỏi (S20) THEN Nghi ngờ COVID-19 thể tiến triển (CF = 0.85)"
    },
    {
      id: "R10",
      name: "Luật COVID-19 kèm triệu chứng tiêu hóa",
      premises: ["S08", "S10", "S19", "S20"],
      conclusion: "D04",
      cf: 0.72,
      description: "IF Ho (S08) AND Rát họng (S10) AND Tiêu chảy (S19) AND Mệt mỏi (S20) THEN Nghi ngờ COVID-19 (CF = 0.72)"
    },

    // --- LUẬT CHO BỆNH TAY CHÂN MIỆNG (D05) ---
    {
      id: "R11",
      name: "Luật chẩn đoán Tay Chân Miệng điển hình",
      premises: ["S02", "S16"],
      conclusion: "D05",
      cf: 0.94,
      description: "IF Sốt vừa (S02) AND Phỏng nước/loét lòng bàn tay, bàn chân, miệng (S16) THEN Khả năng rất cao Tay Chân Miệng (CF = 0.94)"
    },
    {
      id: "R12",
      name: "Luật Tay Chân Miệng có dấu hiệu cảnh báo thần kinh",
      premises: ["S01", "S16", "S21"],
      conclusion: "D05",
      cf: 0.96,
      description: "IF Sốt cao (S01) AND Bọng nước tay chân miệng (S16) AND Giật mình chới với khi ngủ (S21) THEN Tay Chân Miệng độ 2A trở lên (CF = 0.96 - Nguy hiểm)"
    },

    // --- LUẬT CHO BỆNH THỦY ĐẬU (D06) ---
    {
      id: "R13",
      name: "Luật chẩn đoán Thủy đậu điển hình",
      premises: ["S02", "S06", "S15"],
      conclusion: "D06",
      cf: 0.95,
      description: "IF Sốt nhẹ/vừa (S02) AND Đau mỏi người (S06) AND Nốt phỏng nước 'giọt sương' nhiều lứa tuổi rải rác (S15) THEN Khả năng rất cao Bệnh Thủy đậu (CF = 0.95)"
    },
    {
      id: "R14",
      name: "Luật Thủy đậu giai đoạn phát ban rầm rộ",
      premises: ["S01", "S15"],
      conclusion: "D06",
      cf: 0.88,
      description: "IF Sốt cao (S01) AND Nốt phỏng nước bóng nước trên nền ban đỏ (S15) THEN Nghi ngờ Thủy đậu (CF = 0.88)"
    },

    // --- LUẬT CHO VIÊM HỌNG CẤP TÍNH (D07) ---
    {
      id: "R15",
      name: "Luật chẩn đoán Viêm họng cấp thông thường",
      premises: ["S02", "S08", "S09", "S10"],
      conclusion: "D07",
      cf: 0.82,
      description: "IF Sốt nhẹ (S02) AND Ho (S08) AND Sổ mũi (S09) AND Đau rát họng khi nuốt (S10) THEN Khả năng cao Viêm họng cấp (CF = 0.82)"
    },
    {
      id: "R16",
      name: "Luật Viêm họng cấp do virus đơn thuần",
      premises: ["S10", "S09"],
      conclusion: "D07",
      cf: 0.65,
      description: "IF Đau rát họng (S10) AND Chảy nước mũi/nghẹt mũi (S09) THEN Nghi ngờ Viêm họng cấp (CF = 0.65)"
    }
  ],

  // Danh mục Ca bệnh kiểm thử mẫu (Benchmark Test Cases)
  testCases: [
    {
      id: "TC01",
      name: "Ca bệnh 1: Nghi nhiễm Sốt xuất huyết Dengue ngày 3",
      patientInfo: "Nam, 28 tuổi, sống tại khu vực có ổ dịch muỗi vằn",
      selectedSymptoms: [
        { id: "S01", cf: 1.0 }, // Sốt cao đột ngột
        { id: "S04", cf: 0.9 }, // Đau đầu vùng trán
        { id: "S05", cf: 1.0 }, // Đau sau hốc mắt
        { id: "S06", cf: 0.8 }, // Đau mỏi cơ
        { id: "S13", cf: 0.7 }  // Chấm xuất huyết dưới da
      ],
      expectedDisease: "D01",
      clinicalNote: "Ca bệnh sốt xuất huyết kinh điển với dấu hiệu đau hốc mắt và xuất huyết."
    },
    {
      id: "TC02",
      name: "Ca bệnh 2: Nghi nhiễm Cúm mùa A/B",
      patientInfo: "Nữ, 32 tuổi, làm việc văn phòng máy lạnh",
      selectedSymptoms: [
        { id: "S01", cf: 0.9 }, // Sốt cao
        { id: "S03", cf: 0.9 }, // Ớn lạnh rét run
        { id: "S06", cf: 0.9 }, // Đau nhức mình mẩy
        { id: "S08", cf: 0.8 }, // Ho
        { id: "S09", cf: 1.0 }  // Sổ mũi
      ],
      expectedDisease: "D02",
      clinicalNote: "Hội chứng cúm rõ rệt với sốt rét run và triệu chứng hô hấp trên."
    },
    {
      id: "TC03",
      name: "Ca bệnh 3: Bệnh Sởi ở trẻ nhỏ",
      patientInfo: "Bé trai, 4 tuổi, chưa tiêm phòng vaccine sởi mũi 2",
      selectedSymptoms: [
        { id: "S01", cf: 1.0 }, // Sốt cao
        { id: "S08", cf: 0.9 }, // Ho nhiều
        { id: "S09", cf: 0.8 }, // Chảy nước mũi
        { id: "S14", cf: 1.0 }, // Ban dát sẩn từ mặt lan xuống thân
        { id: "S17", cf: 1.0 }  // Mắt đỏ chảy nước mắt sợ sáng
      ],
      expectedDisease: "D03",
      clinicalNote: "Đầy đủ tam chứng viêm long và phát ban sởi đặc trưng."
    },
    {
      id: "TC04",
      name: "Ca bệnh 4: Nghi nhiễm COVID-19 mất vị giác",
      patientInfo: "Nữ, 25 tuổi, tiếp xúc người nhiễm F0",
      selectedSymptoms: [
        { id: "S08", cf: 0.9 }, // Ho khan
        { id: "S10", cf: 0.9 }, // Rát họng
        { id: "S12", cf: 1.0 }, // Mất khứu giác & vị giác
        { id: "S20", cf: 0.8 }  // Mệt mỏi
      ],
      expectedDisease: "D04",
      clinicalNote: "Mất khứu giác/vị giác là dấu hiệu đặc trưng có độ đặc hiệu rất cao cho COVID-19."
    },
    {
      id: "TC05",
      name: "Ca bệnh 5: Trẻ mắc Tay Chân Miệng có giật mình",
      patientInfo: "Bé gái, 3 tuổi, học tại trường mầm non",
      selectedSymptoms: [
        { id: "S01", cf: 0.9 }, // Sốt cao
        { id: "S16", cf: 1.0 }, // Phỏng nước lòng bàn tay chân miệng
        { id: "S21", cf: 1.0 }  // Giật mình chới với khi ngủ
      ],
      expectedDisease: "D05",
      clinicalNote: "Tay chân miệng có dấu hiệu cảnh báo độ 2A (giật mình khi ngủ), cần nhập viện ngay."
    }
  ]
};

// Export to window for browser usage
if (typeof window !== "undefined") {
  window.DEFAULT_KNOWLEDGE_BASE = DEFAULT_KNOWLEDGE_BASE;
}
