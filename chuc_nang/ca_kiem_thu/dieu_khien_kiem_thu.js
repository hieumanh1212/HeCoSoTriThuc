/**
 * FEATURE MODULE: TEST CASES CONTROLLER
 * Render danh sách ca bệnh lâm sàng mẫu và nạp dữ liệu kiểm thử
 */

class TestCasesController {
  constructor({ kbManager, onLoadTestCase }) {
    this.kbManager = kbManager;
    this.onLoadTestCase = onLoadTestCase;
    this.container = document.getElementById("testCasesContainer");
  }

  renderTestCases() {
    if (!this.container) return;
    const kb = this.kbManager.getKB();
    const cases = kb.testCases || [];

    this.container.innerHTML = cases.map(tc => {
      const expDis = (kb.diseases || []).find(d => d.id === tc.expectedDisease);
      return `
        <div class="test-case-card">
          <div>
            <div class="tc-header">
              <span class="tc-id">${tc.id}</span>
              <h3 class="tc-title">${tc.name}</h3>
              <div class="tc-patient"><i class="fa-solid fa-user"></i> ${tc.patientInfo}</div>
            </div>

            <div class="tc-symptoms-list">
              <div style="font-weight: 600; margin-bottom: 0.35rem; color: var(--text-secondary);">Triệu chứng ghi nhận:</div>
              ${tc.selectedSymptoms.map(s => {
                const sym = (kb.symptoms || []).find(x => x.id === s.id);
                return `<span class="tc-symptom-tag">[${s.id}] ${sym ? sym.name : s.id} (CF: ${s.cf})</span>`;
              }).join("")}
            </div>

            <div style="font-size: 0.82rem; margin-bottom: 0.75rem;">
              <strong>Bác sĩ chẩn đoán:</strong> 
              <span style="color: #f87171; font-weight: 700;">[${tc.expectedDisease}] ${expDis ? expDis.name : tc.expectedDisease}</span>
            </div>

            <div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic; margin-bottom: 1rem;">
              "${tc.clinicalNote}"
            </div>
          </div>

          <button class="btn-primary btn-load-testcase" data-tc-id="${tc.id}" style="width: 100%; justify-content: center;">
            <i class="fa-solid fa-play"></i> Nạp ca này & Chẩn đoán ngay
          </button>
        </div>
      `;
    }).join("");

    this.container.querySelectorAll(".btn-load-testcase").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tcId = e.currentTarget.getAttribute("data-tc-id");
        this.loadTestCase(tcId);
      });
    });
  }

  loadTestCase(tcId) {
    const kb = this.kbManager.getKB();
    const tc = (kb.testCases || []).find(c => c.id === tcId);
    if (!tc) return;

    const symptomsMap = {};
    tc.selectedSymptoms.forEach(s => {
      symptomsMap[s.id] = s.cf;
    });

    if (this.onLoadTestCase) {
      this.onLoadTestCase(symptomsMap);
    }
  }
}

if (typeof window !== "undefined") {
  window.TestCasesController = TestCasesController;
}
