/**
 * HemaCalc AI - Main Application Controller
 * Includes Local Storage Patient History & Central Vercel Gemini Proxy Integration
 */

import { calculateRBCIndices } from './reference-ranges.js';
import { 
  getStoredApiKey, 
  saveStoredApiKey, 
  getStoredModel, 
  saveStoredModel, 
  AVAILABLE_MODELS,
  consultGeminiAPI, 
  generateOfflineExpertAnalysis 
} from './gemini-api.js';
import { marked } from 'marked';

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

// Storage Keys
const STORAGE_KEY_HISTORY = 'hemacalc_records_v1';

// App State
let currentCalculation = null;
let currentRecordId = null;

// DOM Elements - Form
const form = document.getElementById('rbc-form');
const inputHb = document.getElementById('input-hb');
const inputHct = document.getElementById('input-hct');
const inputRbcCount = document.getElementById('input-rbc-count');
const convertedRbcVal = document.getElementById('converted-rbc-val');
const inputAge = document.getElementById('input-age');
const radioSexMale = document.getElementById('radio-sex-male');
const radioSexFemale = document.getElementById('radio-sex-female');
const checkPregnancy = document.getElementById('check-pregnancy');
const pregnancyContainer = document.getElementById('pregnancy-container');

// DOM Elements - Results
const emptyStateView = document.getElementById('empty-state-view');
const activeResultsView = document.getElementById('active-results-view');
const patientSummaryBadge = document.getElementById('patient-summary-badge');
const indicesTableBody = document.getElementById('indices-table-body');
const resultToolbar = document.getElementById('result-toolbar');

// DOM Elements - Morphology
const morphSizeVal = document.getElementById('morph-size-val');
const morphChromicVal = document.getElementById('morph-chromic-val');
const morphDiagnosisPill = document.getElementById('morph-diagnosis-pill');
const mentzerVal = document.getElementById('mentzer-val');
const mentzerDesc = document.getElementById('mentzer-desc');

// DOM Elements - AI
const aiPlaceholderView = document.getElementById('ai-placeholder-view');
const aiLoadingView = document.getElementById('ai-loading-view');
const aiMarkdownOutput = document.getElementById('ai-markdown-output');
const btnTriggerAi = document.getElementById('btn-trigger-ai');
const btnQuickAi = document.getElementById('btn-quick-ai');
const activeModelBadge = document.getElementById('active-model-badge');

// DOM Elements - Header & API Modal
const btnOpenApiModal = document.getElementById('btn-open-api-modal');
const apiStatusDot = document.getElementById('api-status-dot');
const apiStatusText = document.getElementById('api-status-text');
const apiModal = document.getElementById('api-modal');
const btnCloseApiModal = document.getElementById('btn-close-api-modal');
const btnCancelApiModal = document.getElementById('btn-cancel-api-modal');
const btnSaveApiKey = document.getElementById('btn-save-api-key');
const btnClearApiKey = document.getElementById('btn-clear-api-key');
const modalInputApiKey = document.getElementById('modal-input-api-key');
const modalSelectModel = document.getElementById('modal-select-model');
const btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');

// DOM Elements - History
const btnOpenHistory = document.getElementById('btn-open-history');
const historyModal = document.getElementById('history-modal');
const btnCloseHistory = document.getElementById('btn-close-history');
const btnOkHistory = document.getElementById('btn-ok-history');
const btnClearHistory = document.getElementById('btn-clear-history');
const btnExportHistory = document.getElementById('btn-export-history');
const btnSaveRecord = document.getElementById('btn-save-record');
const historyListContainer = document.getElementById('history-list-container');
const historyBadgeCount = document.getElementById('history-badge-count');
const historyTotalCount = document.getElementById('history-total-count');

// DOM Elements - Formula & Theme
const formulaModal = document.getElementById('formula-modal');
const btnFormulaInfo = document.getElementById('btn-formula-info');
const btnCloseFormula = document.getElementById('btn-close-formula');
const btnOkFormula = document.getElementById('btn-ok-formula');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const btnReset = document.getElementById('btn-reset');
const btnCopyReport = document.getElementById('btn-copy-report');
const btnPrintReport = document.getElementById('btn-print-report');

// Clinical Presets Data
const PRESETS = {
  'normal-male': {
    name: 'ชายวัยผู้ใหญ่ปกติ (Normal Male Adult)',
    hb: 15.2,
    hct: 45.5,
    rbcCount: 495, // 4.95 x 10^6/uL
    age: 32,
    sex: 'male',
    isPregnant: false
  },
  'iron-deficiency': {
    name: 'โลหิตจางจากการขาดธาตุเหล็ก (Iron Deficiency Anemia)',
    hb: 9.2,
    hct: 29.5,
    rbcCount: 380, // 3.80 x 10^6/uL -> MCV = 77.6, MCH = 24.2, Mentzer = 20.4 (>13)
    age: 28,
    sex: 'female',
    isPregnant: false
  },
  'thalassemia-trait': {
    name: 'พาหะธาลัสซีเมีย (Thalassemia Trait)',
    hb: 10.8,
    hct: 34.0,
    rbcCount: 540, // 5.40 x 10^6/uL -> MCV = 63.0, MCH = 20.0, Mentzer = 11.7 (<13)
    age: 24,
    sex: 'female',
    isPregnant: false
  },
  'pregnancy': {
    name: 'หญิงตั้งครรภ์ (Pregnancy Hemodilution)',
    hb: 11.2,
    hct: 34.5,
    rbcCount: 390, // 3.90 x 10^6/uL
    age: 29,
    sex: 'female',
    isPregnant: true
  },
  'macrocytic': {
    name: 'เม็ดเลือดแดงขนาดใหญ่ / ขาด B12 หรือโฟเลต (Macrocytic Anemia)',
    hb: 10.5,
    hct: 31.0,
    rbcCount: 280, // 2.80 x 10^6/uL -> MCV = 110.7
    age: 68,
    sex: 'male',
    isPregnant: false
  },
  'pediatric': {
    name: 'เด็กปฐมวัย (Pediatric Case 3 ปี)',
    hb: 12.0,
    hct: 36.0,
    rbcCount: 435, // 4.35 x 10^6/uL
    age: 3,
    sex: 'male',
    isPregnant: false
  }
};

/* ==========================================================================
   Initialization
   ========================================================================== */

function init() {
  setupEventListeners();
  updateApiStatusUI();
  updateHistoryBadge();
  initTheme();
  handleSexChange();
  updateRbcConversionPreview();
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

function setupEventListeners() {
  // Live RBC Count conversion as user types
  inputRbcCount.addEventListener('input', updateRbcConversionPreview);

  // Sex toggle change
  radioSexMale.addEventListener('change', handleSexChange);
  radioSexFemale.addEventListener('change', handleSexChange);

  // Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    performCalculation();
  });

  // Quick AI button in form
  btnQuickAi.addEventListener('click', () => {
    if (!currentCalculation) {
      if (form.checkValidity()) {
        performCalculation();
      } else {
        form.reportValidity();
        return;
      }
    }
    triggerAIAnalysis();
  });

  // AI trigger button inside AI card
  btnTriggerAi.addEventListener('click', () => {
    if (!currentCalculation) {
      showToast('กรุณากรอกข้อมูลและคำนวณผลเลือดก่อนส่งให้ AI วิเคราะห์', 'info');
      return;
    }
    triggerAIAnalysis();
  });

  // Reset form
  btnReset.addEventListener('click', resetForm);

  // Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      loadPreset(presetKey);
    });
  });

  // API Modal
  btnOpenApiModal.addEventListener('click', openApiModal);
  btnCloseApiModal.addEventListener('click', closeApiModal);
  btnCancelApiModal.addEventListener('click', closeApiModal);
  btnSaveApiKey.addEventListener('click', saveApiModalConfig);
  btnClearApiKey.addEventListener('click', clearApiKey);
  btnToggleKeyVisibility.addEventListener('click', toggleKeyVisibility);

  // History Modal & Actions
  btnOpenHistory.addEventListener('click', openHistoryModal);
  btnCloseHistory.addEventListener('click', closeHistoryModal);
  btnOkHistory.addEventListener('click', closeHistoryModal);
  btnClearHistory.addEventListener('click', handleClearAllHistory);
  btnExportHistory.addEventListener('click', handleExportHistory);
  if (btnSaveRecord) {
    btnSaveRecord.addEventListener('click', handleManualSaveRecord);
  }

  // Formula Modal
  btnFormulaInfo.addEventListener('click', () => formulaModal.classList.add('active'));
  btnCloseFormula.addEventListener('click', () => formulaModal.classList.remove('active'));
  btnOkFormula.addEventListener('click', () => formulaModal.classList.remove('active'));

  // Theme Toggle
  btnThemeToggle.addEventListener('click', toggleTheme);

  // Copy & Print
  btnCopyReport.addEventListener('click', copyReportToClipboard);
  btnPrintReport.addEventListener('click', () => window.print());

  // Close modals on clicking outside dialog
  window.addEventListener('click', (e) => {
    if (e.target === apiModal) closeApiModal();
    if (e.target === historyModal) closeHistoryModal();
    if (e.target === formulaModal) formulaModal.classList.remove('active');
  });
}

/* ==========================================================================
   UI Helpers & Handlers
   ========================================================================== */

function updateRbcConversionPreview() {
  const raw = parseFloat(inputRbcCount.value);
  if (!isNaN(raw) && raw > 0) {
    const converted = raw / 100;
    convertedRbcVal.textContent = converted.toFixed(2);
  } else {
    convertedRbcVal.textContent = '0.00';
  }
}

function handleSexChange() {
  const isFemale = radioSexFemale.checked;
  if (isFemale) {
    pregnancyContainer.style.display = 'block';
  } else {
    pregnancyContainer.style.display = 'none';
    checkPregnancy.checked = false;
  }
}

function loadPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return;

  inputHb.value = preset.hb;
  inputHct.value = preset.hct;
  inputRbcCount.value = preset.rbcCount;
  inputAge.value = preset.age;

  if (preset.sex === 'female') {
    radioSexFemale.checked = true;
    radioSexMale.checked = false;
  } else {
    radioSexMale.checked = true;
    radioSexFemale.checked = false;
  }

  handleSexChange();
  checkPregnancy.checked = Boolean(preset.isPregnant);
  updateRbcConversionPreview();

  showToast(`โหลดเคสตัวอย่าง: ${preset.name}`, 'info');

  // Automatically calculate
  performCalculation();
}

function resetForm() {
  form.reset();
  radioSexMale.checked = true;
  handleSexChange();
  updateRbcConversionPreview();
  currentCalculation = null;
  currentRecordId = null;

  emptyStateView.style.display = 'block';
  activeResultsView.style.display = 'none';
  resultToolbar.style.display = 'none';
  patientSummaryBadge.textContent = 'รอการกรอกข้อมูลเพื่อคำนวณ...';

  aiPlaceholderView.style.display = 'block';
  aiLoadingView.style.display = 'none';
  aiMarkdownOutput.style.display = 'none';
  aiMarkdownOutput.innerHTML = '';

  showToast('ล้างข้อมูลเรียบร้อย', 'info');
}

/* ==========================================================================
   Calculation & Results Rendering
   ========================================================================== */

function performCalculation(skipAutoSave = false) {
  const hb = inputHb.value;
  const hct = inputHct.value;
  const rbcRawCount = inputRbcCount.value;
  const age = inputAge.value;
  const sex = radioSexFemale.checked ? 'female' : 'male';
  const isPregnant = sex === 'female' && checkPregnancy.checked;

  try {
    const result = calculateRBCIndices({
      hb,
      hct,
      rbcRawCount,
      age,
      sex,
      isPregnant
    });

    currentCalculation = result;
    renderResults(result);

    // Auto-save to Local History (เครื่องผู้ใช้)
    if (!skipAutoSave) {
      currentRecordId = saveRecordToHistory(result);
    }

    // Scroll slightly to results if on mobile
    if (window.innerWidth <= 1080) {
      document.getElementById('results-card').scrollIntoView({ behavior: 'smooth' });
    }

    showToast('คำนวณและแปลผลสำเร็จ (บันทึกในเครื่องอัตโนมัติ)', 'success');
  } catch (err) {
    showToast(err.message || 'เกิดข้อผิดพลาดในการคำนวณ', 'error');
  }
}

function calculateGaugePosition(value, min, max) {
  const spread = max - min;
  const lowerBound = min - spread * 0.45;
  const upperBound = max + spread * 0.45;

  let pct = ((value - lowerBound) / (upperBound - lowerBound)) * 100;
  if (pct < 5) pct = 5;
  if (pct > 95) pct = 95;
  return pct;
}

function renderResults(data) {
  const { inputs, indices, demoRef, evaluations, morphology } = data;

  // 1. Patient Summary Badge
  const sexLabel = inputs.sex === 'female' 
    ? (inputs.isPregnant ? 'หญิง (ตั้งครรภ์ 🤰)' : 'หญิง')
    : 'ชาย';
  patientSummaryBadge.textContent = `ผู้ป่วย: เพศ${sexLabel} | อายุ ${inputs.age} ปี | กลุ่มอ้างอิง: ${demoRef.groupLabel}`;

  // 2. Table Rows
  const tableRows = [
    {
      name: 'Hemoglobin (Hb)',
      sub: 'ความเข้มข้นของฮีโมโกลบิน',
      value: inputs.hb.toFixed(1),
      unit: 'g/dL',
      ref: `${demoRef.hb.min} - ${demoRef.hb.max} g/dL`,
      status: evaluations.hb,
      gaugePct: calculateGaugePosition(inputs.hb, demoRef.hb.min, demoRef.hb.max)
    },
    {
      name: 'Hematocrit (Hct)',
      sub: 'ปริมาตรเม็ดเลือดแดงอัดแน่น',
      value: inputs.hct.toFixed(1),
      unit: '%',
      ref: `${demoRef.hct.min} - ${demoRef.hct.max} %`,
      status: evaluations.hct,
      gaugePct: calculateGaugePosition(inputs.hct, demoRef.hct.min, demoRef.hct.max)
    },
    {
      name: 'RBC Count',
      sub: `นับได้ ${inputs.rbcRawCount} cells/5 ช่อง (Dilute 1:200)`,
      value: inputs.rbcConverted.toFixed(2),
      unit: '× 10⁶/µL',
      ref: `${demoRef.rbc.min} - ${demoRef.rbc.max} × 10⁶/µL`,
      status: evaluations.rbc,
      gaugePct: calculateGaugePosition(inputs.rbcConverted, demoRef.rbc.min, demoRef.rbc.max)
    },
    {
      name: 'MCV (Mean Corpuscular Volume)',
      sub: 'ปริมาตรเฉลี่ยของเม็ดเลือดแดง: (Hct × 10) ÷ RBC',
      value: indices.mcv.toFixed(1),
      unit: 'fL',
      ref: '80.0 - 100.0 fL',
      status: evaluations.mcv,
      gaugePct: calculateGaugePosition(indices.mcv, 80.0, 100.0)
    },
    {
      name: 'MCH (Mean Corpuscular Hemoglobin)',
      sub: 'น้ำหนักฮีโมโกลบินเฉลี่ยในเซลล์: (Hb × 10) ÷ RBC',
      value: indices.mch.toFixed(1),
      unit: 'pg',
      ref: '27.0 - 31.0 pg',
      status: evaluations.mch,
      gaugePct: calculateGaugePosition(indices.mch, 27.0, 31.0)
    },
    {
      name: 'MCHC (Mean Corpuscular Hb Concentration)',
      sub: 'ความเข้มข้นเฉลี่ยของฮีโมโกลบิน: (Hb × 100) ÷ Hct',
      value: indices.mchc.toFixed(1),
      unit: 'g/dL',
      ref: '32.0 - 36.0 g/dL',
      status: evaluations.mchc,
      gaugePct: calculateGaugePosition(indices.mchc, 32.0, 36.0)
    }
  ];

  indicesTableBody.innerHTML = tableRows.map(row => {
    let statusClass = 'normal';
    let statusIcon = '✓';
    if (row.status.status === 'low') {
      statusClass = 'low';
      statusIcon = '▼';
    } else if (row.status.status === 'high') {
      statusClass = 'high';
      statusIcon = '▲';
    }

    return `
      <tr>
        <td>
          <div class="param-name">
            <span>${row.name}</span>
            <span class="param-sub">${row.sub}</span>
          </div>
        </td>
        <td>
          <span class="param-value">${row.value}</span>
          <span class="param-unit">${row.unit}</span>
        </td>
        <td>
          <span class="param-ref">${row.ref}</span>
        </td>
        <td>
          <span class="status-pill ${statusClass}">
            <span>${statusIcon}</span>
            <span>${row.status.labelTh}</span>
          </span>
        </td>
        <td>
          <div class="gauge-track" title="ค่าปัจจุบัน: ${row.value} (${row.status.labelEn})">
            <div class="gauge-zone low"></div>
            <div class="gauge-zone normal"></div>
            <div class="gauge-zone high"></div>
            <div class="gauge-indicator" style="left: ${row.gaugePct}%;"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // 3. Morphology & Mentzer
  morphSizeVal.textContent = morphology.sizeCategoryTh;
  morphChromicVal.textContent = morphology.chromicCategoryTh;
  morphDiagnosisPill.textContent = morphology.morphologyLabelTh;

  mentzerVal.textContent = indices.mentzerIndex.toFixed(1);
  mentzerDesc.textContent = morphology.mentzerTh;

  // 4. Toggle UI views
  emptyStateView.style.display = 'none';
  activeResultsView.style.display = 'block';
  resultToolbar.style.display = 'flex';
}

/* ==========================================================================
   Gemini AI Consultation
   ========================================================================== */

async function triggerAIAnalysis() {
  if (!currentCalculation) return;

  const apiKey = getStoredApiKey();
  const model = getStoredModel();

  // Show loading state
  aiPlaceholderView.style.display = 'none';
  aiMarkdownOutput.style.display = 'none';
  aiLoadingView.style.display = 'block';
  btnTriggerAi.disabled = true;

  try {
    let markdownResponse = '';

    try {
      // Connect to Gemini (routes to user custom key if present, or /api/analyze if central)
      const result = await consultGeminiAPI(currentCalculation, apiKey, model);
      markdownResponse = result.text;

      if (result.source === 'central_key') {
        const remainingText = typeof result.remainingRequests === 'number' 
          ? ` (เหลือโควต้า ${result.remainingRequests} ครั้ง/ชม.)` 
          : '';
        showToast(`รับบทวิเคราะห์จาก Gemini AI กลางสำเร็จ${remainingText}`, 'success');
      } else {
        showToast('รับบทวิเคราะห์จาก Gemini API (คีย์ส่วนตัว) สำเร็จ', 'success');
      }
    } catch (apiErr) {
      console.warn('AI call issue, evaluating fallback:', apiErr);

      if (apiErr.isQuotaLimit) {
        showToast(apiErr.message, 'error');
        markdownResponse = `> ⚠️ **แจ้งเตือนขีดจำกัดโควต้า**: ${apiErr.message}\n\n---\n\n` + generateOfflineExpertAnalysis(currentCalculation);
      } else if (apiErr.isNoCentralKey) {
        showToast(apiErr.message, 'info');
        markdownResponse = generateOfflineExpertAnalysis(currentCalculation);
      } else {
        showToast(`การเชื่อมต่อ AI ขัดข้อง (${apiErr.message}) - สลับใช้บทวิเคราะห์ผู้เชี่ยวชาญในระบบ`, 'info');
        markdownResponse = generateOfflineExpertAnalysis(currentCalculation);
      }
    }

    // Render Markdown
    aiMarkdownOutput.innerHTML = marked.parse(markdownResponse);
    aiLoadingView.style.display = 'none';
    aiMarkdownOutput.style.display = 'block';

    // Attach AI Report to current calculation and update history
    currentCalculation.aiReport = markdownResponse;
    if (currentRecordId) {
      updateRecordInHistory(currentRecordId, { aiReport: markdownResponse });
    }

    // Scroll into view
    aiMarkdownOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    aiLoadingView.style.display = 'none';
    aiPlaceholderView.style.display = 'block';
    showToast(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์', 'error');
  } finally {
    btnTriggerAi.disabled = false;
  }
}

/* ==========================================================================
   Local History Storage (แบบที่ 1: บันทึกเฉพาะในเครื่องผู้ใช้)
   ========================================================================== */

function getHistoryRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse history from localStorage', e);
    return [];
  }
}

function saveRecordToHistory(calcResult) {
  const records = getHistoryRecords();
  const recordId = `rec_${Date.now()}`;
  
  const now = new Date();
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const formattedTime = `${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`;

  const newRecord = {
    id: recordId,
    timestamp: now.toISOString(),
    formattedTime,
    inputs: { ...calcResult.inputs },
    indices: { ...calcResult.indices },
    evaluations: { ...calcResult.evaluations },
    morphology: { ...calcResult.morphology },
    demoRef: { ...calcResult.demoRef },
    aiReport: calcResult.aiReport || null
  };

  // Avoid identical consecutive duplicates
  if (records.length > 0) {
    const last = records[0];
    const isDup = 
      last.inputs.hb === newRecord.inputs.hb &&
      last.inputs.hct === newRecord.inputs.hct &&
      last.inputs.rbcRawCount === newRecord.inputs.rbcRawCount &&
      last.inputs.age === newRecord.inputs.age &&
      last.inputs.sex === newRecord.inputs.sex;

    if (isDup) {
      records[0] = { ...last, ...newRecord, id: last.id };
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(records));
      updateHistoryBadge();
      return last.id;
    }
  }

  // Prepend new record, keep up to 50
  records.unshift(newRecord);
  if (records.length > 50) records.pop();

  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(records));
  updateHistoryBadge();
  return recordId;
}

function updateRecordInHistory(recordId, fields) {
  const records = getHistoryRecords();
  const idx = records.findIndex(r => r.id === recordId);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...fields };
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(records));
  }
}

function deleteHistoryRecord(recordId) {
  let records = getHistoryRecords();
  records = records.filter(r => r.id !== recordId);
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(records));
  updateHistoryBadge();
  renderHistoryList();
  showToast('ลบรายการประวัติแล้ว', 'info');
}

function updateHistoryBadge() {
  const records = getHistoryRecords();
  const count = records.length;
  if (historyBadgeCount) {
    historyBadgeCount.textContent = count;
    historyBadgeCount.setAttribute('data-count', count);
  }
  if (historyTotalCount) {
    historyTotalCount.textContent = count;
  }
}

function openHistoryModal() {
  renderHistoryList();
  historyModal.classList.add('active');
}

function closeHistoryModal() {
  historyModal.classList.remove('active');
}

function handleManualSaveRecord() {
  if (!currentCalculation) {
    showToast('กรุณากรอกและคำนวณผลเลือดก่อนบันทึก', 'info');
    return;
  }
  currentRecordId = saveRecordToHistory(currentCalculation);
  showToast('บันทึกผลการตรวจลงในประวัติของเครื่องแล้ว', 'success');
}

function handleClearAllHistory() {
  const records = getHistoryRecords();
  if (records.length === 0) {
    showToast('ไม่มีประวัติให้ล้าง', 'info');
    return;
  }

  if (window.confirm('คุณต้องการลบประวัติผลตรวจทั้งหมดที่บันทึกไว้ในเครื่องนี้ใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)')) {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    updateHistoryBadge();
    renderHistoryList();
    showToast('ล้างประวัติทั้งหมดในเครื่องเรียบร้อยแล้ว', 'info');
  }
}

function handleExportHistory() {
  const records = getHistoryRecords();
  if (records.length === 0) {
    showToast('ยังไม่มีประวัติให้ส่งออก', 'info');
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `hemacalc-history-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast('ส่งออกไฟล์สำรอง JSON สำเร็จ', 'success');
}

function loadRecordIntoForm(record) {
  inputHb.value = record.inputs.hb;
  inputHct.value = record.inputs.hct;
  inputRbcCount.value = record.inputs.rbcRawCount;
  inputAge.value = record.inputs.age;

  if (record.inputs.sex === 'female') {
    radioSexFemale.checked = true;
    radioSexMale.checked = false;
  } else {
    radioSexMale.checked = true;
    radioSexFemale.checked = false;
  }

  handleSexChange();
  checkPregnancy.checked = Boolean(record.inputs.isPregnant);
  updateRbcConversionPreview();

  // Perform calculation
  performCalculation(true);
  currentRecordId = record.id;

  // Restore AI report if recorded
  if (record.aiReport) {
    currentCalculation.aiReport = record.aiReport;
    aiPlaceholderView.style.display = 'none';
    aiLoadingView.style.display = 'none';
    aiMarkdownOutput.innerHTML = marked.parse(record.aiReport);
    aiMarkdownOutput.style.display = 'block';
  } else {
    aiPlaceholderView.style.display = 'block';
    aiLoadingView.style.display = 'none';
    aiMarkdownOutput.style.display = 'none';
    aiMarkdownOutput.innerHTML = '';
  }

  closeHistoryModal();
  showToast(`โหลดประวัติผลตรวจ: ${record.formattedTime}`, 'success');
}

function renderHistoryList() {
  const records = getHistoryRecords();
  updateHistoryBadge();

  if (!records || records.length === 0) {
    historyListContainer.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">📂</div>
        <h4>ยังไม่มีประวัติการบันทึกข้อมูล</h4>
        <p>เมื่อคุณกรอกและคำนวณผลเลือด ระบบจะบันทึกผลการตรวจลงในเครื่องของคุณโดยอัตโนมัติ เพื่อให้เปิดดูหรือโหลดข้อมูลซ้ำได้ทุกเวลา</p>
      </div>
    `;
    return;
  }

  historyListContainer.innerHTML = records.map(record => {
    const sexLabel = record.inputs.sex === 'female' 
      ? `เพศหญิง${record.inputs.isPregnant ? ' (ตั้งครรภ์ 🤰)' : ''}`
      : 'เพศชาย';

    let pillClass = 'normal';
    if (record.morphology.isAnemic) pillClass = 'alert';
    else if (record.indices.mcv < 80 || record.indices.mcv > 100) pillClass = 'warning';

    return `
      <div class="history-card" data-id="${record.id}">
        <div class="history-card-header">
          <div class="history-patient-meta">
            <span class="history-time-badge">🕒 ${record.formattedTime}</span>
            <span class="history-demographic-badge">👤 ${sexLabel} • อายุ ${record.inputs.age} ปี</span>
          </div>
          <span class="preset-tag ${pillClass}">${record.morphology.morphologyLabelTh}</span>
        </div>

        <div class="history-card-metrics">
          <div class="history-metric-col">
            <span class="metric-col-label">Hb</span>
            <span class="metric-col-val">${record.inputs.hb} g/dL</span>
          </div>
          <div class="history-metric-col">
            <span class="metric-col-label">Hct</span>
            <span class="metric-col-val">${record.inputs.hct}%</span>
          </div>
          <div class="history-metric-col">
            <span class="metric-col-label">RBC</span>
            <span class="metric-col-val">${record.inputs.rbcConverted}</span>
          </div>
          <div class="history-metric-col">
            <span class="metric-col-label">MCV</span>
            <span class="metric-col-val">${record.indices.mcv} fL</span>
          </div>
          <div class="history-metric-col">
            <span class="metric-col-label">MCH</span>
            <span class="metric-col-val">${record.indices.mch} pg</span>
          </div>
          <div class="history-metric-col">
            <span class="metric-col-label">Mentzer</span>
            <span class="metric-col-val">${record.indices.mentzerIndex}</span>
          </div>
        </div>

        <div class="history-card-actions">
          <button type="button" class="btn-sm btn-ghost btn-copy-history" data-id="${record.id}" title="คัดลอกสรุปผลนี้">
            📋 คัดลอก
          </button>
          <button type="button" class="btn-danger-ghost btn-delete-history" data-id="${record.id}" title="ลบรายการนี้">
            🗑️ ลบ
          </button>
          <button type="button" class="btn-history-load btn-load-history" data-id="${record.id}" title="โหลดข้อมูลนี้ใส่ฟอร์ม">
            📥 โหลดข้อมูลนี้
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach card event listeners
  historyListContainer.querySelectorAll('.btn-load-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const recId = btn.dataset.id;
      const target = records.find(r => r.id === recId);
      if (target) loadRecordIntoForm(target);
    });
  });

  historyListContainer.querySelectorAll('.btn-delete-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const recId = btn.dataset.id;
      deleteHistoryRecord(recId);
    });
  });

  historyListContainer.querySelectorAll('.btn-copy-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const recId = btn.dataset.id;
      const target = records.find(r => r.id === recId);
      if (target) {
        copySingleHistoryRecord(target);
      }
    });
  });
}

function copySingleHistoryRecord(rec) {
  const summary = `📋 ผลการตรวจเม็ดเลือดแดง (บันทึกเมื่อ: ${rec.formattedTime})
ผู้ป่วย: เพศ${rec.inputs.sex === 'female' ? 'หญิง' + (rec.inputs.isPregnant ? ' (ตั้งครรภ์)' : '') : 'ชาย'} อายุ ${rec.inputs.age} ปี
- Hb: ${rec.inputs.hb} g/dL | Hct: ${rec.inputs.hct}% | RBC: ${rec.inputs.rbcConverted} x 10⁶/µL
- MCV: ${rec.indices.mcv} fL | MCH: ${rec.indices.mch} pg | MCHC: ${rec.indices.mchc} g/dL
- Mentzer Index: ${rec.indices.mentzerIndex} (${rec.morphology.mentzerTh})
- ลักษณะสัณฐานวิทยา: ${rec.morphology.morphologyLabelTh}`;

  navigator.clipboard.writeText(summary).then(() => {
    showToast('คัดลอกข้อมูลประวัติไปยังคลิปบอร์ดแล้ว', 'success');
  }).catch(() => {
    showToast('ไม่สามารถคัดลอกได้', 'error');
  });
}

/* ==========================================================================
   API Key Management Modal
   ========================================================================== */

function openApiModal() {
  modalInputApiKey.value = getStoredApiKey();
  modalSelectModel.value = getStoredModel();
  modalInputApiKey.type = 'password';
  btnToggleKeyVisibility.textContent = '👁️';
  apiModal.classList.add('active');
}

function closeApiModal() {
  apiModal.classList.remove('active');
}

function saveApiModalConfig() {
  const key = modalInputApiKey.value.trim();
  const model = modalSelectModel.value;

  saveStoredApiKey(key);
  saveStoredModel(model);
  updateApiStatusUI();
  closeApiModal();

  showToast(key ? 'บันทึก Gemini API Key ส่วนตัวสำเร็จ' : 'ใช้บริการ AI กลางของระบบฟรี', 'success');
}

function clearApiKey() {
  saveStoredApiKey('');
  modalInputApiKey.value = '';
  updateApiStatusUI();
  closeApiModal();
  showToast('สลับมาใช้บริการ AI กลางของระบบฟรี', 'info');
}

function toggleKeyVisibility() {
  if (modalInputApiKey.type === 'password') {
    modalInputApiKey.type = 'text';
    btnToggleKeyVisibility.textContent = '🙈';
  } else {
    modalInputApiKey.type = 'password';
    btnToggleKeyVisibility.textContent = '👁️';
  }
}

function updateApiStatusUI() {
  const key = getStoredApiKey();
  const model = getStoredModel();
  const foundModel = AVAILABLE_MODELS.find(m => m.id === model);
  const modelLabel = foundModel ? foundModel.name.split(' (')[0] : model;

  if (key) {
    apiStatusDot.classList.add('connected');
    apiStatusText.textContent = 'คีย์ส่วนตัว: เชื่อมต่อแล้ว';
    activeModelBadge.textContent = `${modelLabel} (คีย์ส่วนตัว)`;
  } else {
    apiStatusDot.classList.add('connected');
    apiStatusText.textContent = 'AI กลาง: พร้อมใช้งาน';
    activeModelBadge.textContent = `${modelLabel} (AI กลางฟรี)`;
  }
}

/* ==========================================================================
   Theme & Utilities
   ========================================================================== */

function initTheme() {
  const savedTheme = localStorage.getItem('hemacalc_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('theme-light');
    themeIcon.textContent = '☀️';
  } else {
    document.body.classList.remove('theme-light');
    themeIcon.textContent = '🌙';
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('theme-light');
  localStorage.setItem('hemacalc_theme', isLight ? 'light' : 'dark');
  themeIcon.textContent = isLight ? '☀️' : '🌙';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

function copyReportToClipboard() {
  if (!currentCalculation) return;

  const { inputs, indices, demoRef, evaluations, morphology } = currentCalculation;
  const reportText = `📋 สรุปผลการตรวจและคำนวณดัชนีเม็ดเลือดแดง (HemaCalc AI Report)
-------------------------------------------------------
ข้อมูลผู้ป่วย: เพศ${inputs.sex === 'female' ? 'หญิง' + (inputs.isPregnant ? ' (ตั้งครรภ์)' : '') : 'ชาย'} | อายุ ${inputs.age} ปี
กลุ่มอ้างอิง: ${demoRef.groupLabel}

ผลการตรวจทางห้องปฏิบัติการ:
- Hemoglobin (Hb): ${inputs.hb} g/dL [${evaluations.hb.labelTh}] (เกณฑ์: ${demoRef.hb.min}-${demoRef.hb.max})
- Hematocrit (Hct): ${inputs.hct} % [${evaluations.hct.labelTh}] (เกณฑ์: ${demoRef.hct.min}-${demoRef.hct.max})
- RBC Count (1:200 ใน 5 ช่อง): ${inputs.rbcRawCount} cells/5 ช่อง
- RBC Count (แปลงหน่วย): ${inputs.rbcConverted} x 10⁶/µL [${evaluations.rbc.labelTh}] (เกณฑ์: ${demoRef.rbc.min}-${demoRef.rbc.max})

ดัชนีเม็ดเลือดแดง (RBC Indices):
- MCV: ${indices.mcv} fL [${evaluations.mcv.labelTh}] (เกณฑ์ปกติ: 80 - 100 fL)
- MCH: ${indices.mch} pg [${evaluations.mch.labelTh}] (เกณฑ์ปกติ: 27 - 31 pg)
- MCHC: ${indices.mchc} g/dL [${evaluations.mchc.labelTh}] (เกณฑ์ปกติ: 32 - 36 g/dL)
- Mentzer Index (MCV/RBC): ${indices.mentzerIndex}

การแปลผลทางสัณฐานวิทยา:
- สรุป: ${morphology.morphologyLabelTh}
- Mentzer: ${morphology.mentzerTh}

* หมายเหตุ: รายงานนี้จัดทำขึ้นเพื่อการศึกษาและการคำนวณเบื้องต้นเท่านั้น ไม่สามารถใช้แทนการวินิจฉัยทางการแพทย์ได้`;

  navigator.clipboard.writeText(reportText).then(() => {
    showToast('คัดลอกสรุปผลการตรวจไปยังคลิปบอร์ดแล้ว', 'success');
  }).catch(() => {
    showToast('ไม่สามารถคัดลอกได้ กรุณาลองใหม่', 'error');
  });
}

// Start application
document.addEventListener('DOMContentLoaded', init);
