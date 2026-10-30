/**
 * Gemini API Integration & Clinical Hematology Expert Consultation Engine
 * Supports both Client-side API Key & Serverless Central Proxy with Quota Control
 */

const STORAGE_KEY_API = 'gemini_api_key_hematology';
const STORAGE_KEY_MODEL = 'gemini_selected_model';
const DEFAULT_MODEL = 'gemini-3.6-flash';

export const AVAILABLE_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (ประมวลผลเร็วพิเศษ)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (เร็ว เบา ประหยัดโทเคน)' }
];

export function getStoredApiKey() {
  return localStorage.getItem(STORAGE_KEY_API) || '';
}

export function saveStoredApiKey(key) {
  if (!key) {
    localStorage.removeItem(STORAGE_KEY_API);
  } else {
    localStorage.setItem(STORAGE_KEY_API, key.trim());
  }
}

export function getStoredModel() {
  const stored = localStorage.getItem(STORAGE_KEY_MODEL);
  if (stored && AVAILABLE_MODELS.some(m => m.id === stored)) {
    return stored;
  }
  return DEFAULT_MODEL;
}

export function saveStoredModel(model) {
  localStorage.setItem(STORAGE_KEY_MODEL, model);
}

/**
 * Builds the comprehensive prompt for Gemini
 */
export function buildHematologyPrompt(calcData) {
  const { inputs, indices, demoRef, evaluations, morphology } = calcData;

  const pregnancyText = inputs.sex === 'female'
    ? (inputs.isPregnant ? 'ตั้งครรภ์ (Pregnant)' : 'ไม่ได้ตั้งครรภ์ (Not pregnant)')
    : 'ไม่เกี่ยวข้อง (เพศชาย)';

  return `คุณเป็นอายุรแพทย์ผู้เชี่ยวชาญด้านโลหิตวิทยา (Senior Clinical Hematologist) และผู้เชี่ยวชาญด้านเทคนิคการแพทย์ กรุณาช่วยแปลผล วิเคราะห์ดัชนีเม็ดเลือดแดง (RBC Indices) และให้คำแนะนำทางการแพทย์อย่างละเอียด ชัดเจน และเป็นระบบ

### 1. ข้อมูลผู้ป่วย (Demographic Data)
- อายุ: ${inputs.age} ปี
- เพศ: ${inputs.sex === 'female' ? 'หญิง' : 'ชาย'}
- สถานะการตั้งครรภ์: ${pregnancyText}
- กลุ่มอ้างอิง: ${demoRef.groupLabel} (${demoRef.note})

### 2. ผลการตรวจทางห้องปฏิบัติการ (CBC & RBC Indices)
- Hemoglobin (Hb): ${inputs.hb} g/dL (ค่าอ้างอิง: ${demoRef.hb.min} - ${demoRef.hb.max} g/dL) -> สถานะ: ${evaluations.hb.labelTh}
- Hematocrit (Hct): ${inputs.hct} % (ค่าอ้างอิง: ${demoRef.hct.min} - ${demoRef.hct.max} %) -> สถานะ: ${evaluations.hct.labelTh}
- RBC Count (Dilute 1:200 ใน 5 ช่องนับ): ${inputs.rbcRawCount} cells/5 squares
- RBC Count (แปลงหน่วยแล้ว): ${inputs.rbcConverted} x 10⁶/µL (ค่าอ้างอิง: ${demoRef.rbc.min} - ${demoRef.rbc.max} x 10⁶/µL) -> สถานะ: ${evaluations.rbc.labelTh}
- MCV (Mean Corpuscular Volume): ${indices.mcv} fL (ค่าอ้างอิง: 80.0 - 100.0 fL) -> สถานะ: ${evaluations.mcv.labelTh}
- MCH (Mean Corpuscular Hemoglobin): ${indices.mch} pg (ค่าอ้างอิง: 27.0 - 31.0 pg) -> สถานะ: ${evaluations.mch.labelTh}
- MCHC (Mean Corpuscular Hb Concentration): ${indices.mchc} g/dL (ค่าอ้างอิง: 32.0 - 36.0 g/dL) -> สถานะ: ${evaluations.mchc.labelTh}
- Mentzer Index (MCV / RBC): ${indices.mentzerIndex} (${morphology.mentzerTh})

### 3. การประเมินทางสัณฐานวิทยาเบื้องต้น
- ลักษณะเม็ดเลือดแดง: ${morphology.morphologyLabelTh}
- การจำแนกขนาด (Size): ${morphology.sizeCategoryTh}
- การจำแนกความเข้มสี (Chromasia): ${morphology.chromicCategoryTh}

---
### คำสั่งสำหรับการวิเคราะห์ (กรุณาตอบเป็นภาษาไทย โดยใช้ Markdown จัดหัวข้อสวยงาม):
1. **สรุปความผิดปกติของสัณฐานวิทยาและดัชนีเม็ดเลือดแดง**: อธิบายค่า MCV, MCH, MCHC, Hb, Hct ว่าสะท้อนถึงอะไร
2. **การวินิจฉัยแยกโรคที่เป็นไปได้มากที่สุด (Differential Diagnosis)**: 
   - จัดลำดับโรคที่น่าจะเป็นไปได้มากที่สุด เช่น Iron Deficiency Anemia, Thalassemia Trait / Disease, Anemia of Chronic Disease, Megaloblastic Anemia, Sideroblastic Anemia, หรือสรีรวิทยาของการตั้งครรภ์
   - วิเคราะห์เปรียบเทียบโดยใช้ค่า Mentzer Index (${indices.mentzerIndex}) ร่วมด้วย
3. **การตรวจทางห้องปฏิบัติการเพื่อยืนยันการวินิจฉัย (Recommended Laboratory Workup)**: แนะนำการตรวจเพิ่มเติมที่จำเพาะเจาะจง (เช่น Serum Ferritin, Serum Iron/TIBC, Hemoglobin typing, PCR for alpha-thalassemia, Peripheral Blood Smear, Reticulocyte count)
4. **ข้อเสนอแนะทางคลินิกและการดูแลผู้ป่วยเบื้องต้น (Clinical Considerations & Patient Care)**
5. **ข้อจำกัดและข้อควรระวัง**: สิ่งที่ควรซักประวัติเพิ่มเติม (ประวัติครอบครัว, ประวัติการเสียเลือด, โภชนาการ)`;
}

/**
 * Direct call from client if user provides personal API Key
 */
async function callGeminiDirectly(promptText, apiKey, model) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.95,
      maxOutputTokens: 2500
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson?.error?.message || response.statusText;
    } catch {
      errorDetail = response.statusText;
    }

    if (response.status === 400 || response.status === 403) {
      throw new Error(`API Key ส่วนตัวไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึงโมเดล (${errorDetail})`);
    } else if (response.status === 429) {
      const err = new Error('API Key ส่วนตัวของคุณเกินขีดจำกัดการใช้งาน (Quota Exceeded) กรุณารอสักครู่');
      err.isQuotaLimit = true;
      throw err;
    } else {
      throw new Error(`การเชื่อมต่อ Gemini API ล้มเหลว (${response.status}): ${errorDetail}`);
    }
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];

  if (!candidate || !candidate.content?.parts?.[0]?.text) {
    throw new Error('ไม่ได้รับข้อความตอบกลับจากโมเดล Gemini');
  }

  return {
    text: candidate.content.parts[0].text,
    source: 'custom_key'
  };
}

/**
 * Central Serverless Call via /api/analyze (Vercel)
 */
async function callCentralProxy(promptText, model) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptText, model })
  });

  if (!response.ok) {
    let errJson = null;
    try {
      errJson = await response.json();
    } catch {
      //
    }

    const message = errJson?.message || `เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.errorCode = errJson?.error;
    err.isQuotaLimit = response.status === 429 || errJson?.error === 'quota_exhausted' || errJson?.error === 'rate_limited';
    err.isNoCentralKey = errJson?.error === 'no_central_key';
    throw err;
  }

  const data = await response.json();
  return {
    text: data.text,
    source: 'central_key',
    remainingRequests: data.remainingRequests
  };
}

/**
 * Main Consultation function:
 * 1. If user has custom key -> uses custom key directly
 * 2. If no custom key -> calls central /api/analyze
 */
export async function consultGeminiAPI(calcData, userApiKey = '', model = DEFAULT_MODEL) {
  const promptText = buildHematologyPrompt(calcData);

  // If user provided their own key
  if (userApiKey && userApiKey.trim()) {
    return await callGeminiDirectly(promptText, userApiKey.trim(), model);
  }

  // Otherwise, route through Central API Proxy on Vercel
  return await callCentralProxy(promptText, model);
}

/**
 * Offline Expert Hematology Diagnostic Engine
 * Provides immediate high-value clinical interpretation when API key / central quota is unavailable
 */
export function generateOfflineExpertAnalysis(calcData) {
  const { inputs, indices, demoRef, evaluations, morphology } = calcData;
  const isAnemic = morphology.isAnemic;

  let report = '';

  report += `### 🩺 บทวิเคราะห์ทางโลหิตวิทยา (Clinical Hematology Analysis)\n\n`;
  report += `**ผู้ป่วย**: ${inputs.sex === 'female' ? 'เพศหญิง' : 'เพศชาย'} อายุ ${inputs.age} ปี `;
  if (inputs.sex === 'female' && inputs.isPregnant) {
    report += `*(ตั้งครรภ์ - มีผลต่อการเจือจางของพลาสมา)*\n\n`;
  } else {
    report += `\n\n`;
  }

  // Section 1: Summary of RBC morphology
  report += `#### 1. การประเมินสัณฐานวิทยาของเม็ดเลือดแดง (RBC Indices Summary)\n`;
  report += `- **สถานะความเข้มข้นเลือด**: `;
  if (isAnemic) {
    report += `พบ **ภาวะโลหิตจาง (Anemia)** เนื่องจาก Hb (${inputs.hb} g/dL) และ Hct (${inputs.hct}%) ต่ำกว่าเกณฑ์อ้างอิงสำหรับ${demoRef.groupLabel} (${demoRef.hb.min}-${demoRef.hb.max} g/dL)\n`;
  } else if (evaluations.hb.status === 'high' || evaluations.hct.status === 'high') {
    report += `พบ **ภาวะเม็ดเลือดแดงเข้มข้นสูง (Polycythemia / Erythrocytosis)** Hb (${inputs.hb} g/dL) เกินเกณฑ์ปกติ\n`;
  } else {
    report += `ค่าความเข้มข้นของเลือดอยู่ในเกณฑ์ปกติ (Normo-erythroid state)\n`;
  }

  report += `- **ขนาดเม็ดเลือดแดง (MCV = ${indices.mcv} fL)**: ${indices.mcv < 80 ? '🔴 **Microcytic** (ขนาดเล็กกว่า 80 fL)' : indices.mcv > 100 ? '🟣 **Macrocytic** (ขนาดใหญ่กว่า 100 fL)' : '🟢 **Normocytic** (ขนาดปกติ 80-100 fL)'}\n`;
  report += `- **ปริมาณและการติดสีฮีโมโกลบิน (MCH = ${indices.mch} pg, MCHC = ${indices.mchc} g/dL)**: ${indices.mchc < 32 || indices.mch < 27 ? '⚪ **Hypochromic** (ติดสีจาง เม็ดเลือดแดงมีฮีโมโกลบินน้อย)' : '🟢 **Normochromic** (ความเข้มสีปกติ)'}\n`;
  report += `- **การสรุปแบบแผนเซลล์**: **${morphology.morphologyLabelTh}**\n\n`;

  // Section 2: Differential Diagnosis
  report += `#### 2. การวินิจฉัยแยกโรคที่ต้องคำนึงถึง (Differential Diagnosis)\n`;

  if (indices.mcv < 80) {
    // Microcytic
    report += `สำหรับ **Microcytic Anemia (MCV < 80 fL)** โรคที่พบบ่อยที่สุดในประชากรไทยและเอเชีย ได้แก่:\n\n`;

    if (indices.mentzerIndex < 13.0) {
      report += `1. ⭐ **พาหะธาลัสซีเมีย (Thalassemia Trait / Minor)**: **มีความเป็นไปได้สูงมาก**\n`;
      report += `   - **เหตุผลสนับสนุน**: ดัชนี Mentzer (${indices.mentzerIndex}) น้อยกว่า 13 เนื่องจากมีการสร้างเม็ดเลือดแดงจำนวนมากชดเชย (RBC Count = ${inputs.rbcConverted} x 10⁶/µL) แม้เซลล์จะมีขนาดเล็กมาก\n`;
      report += `   - อาจเป็น Alpha-thalassemia trait หรือ Beta-thalassemia trait หรือ Hb E trait\n\n`;
      report += `2. **ภาวะโลหิตจางจากการขาดธาตุเหล็ก (Iron Deficiency Anemia - IDA)**: ยังคงต้องแยกโรคเสมอ หรืออาจพบร่วมกันได้ (Co-existence)\n`;
      report += `3. **ภาวะโลหิตจางจากโรคเรื้อรัง (Anemia of Chronic Disease)**: ในระยะยาวอาจมี microcytosis เล็กน้อย\n`;
      report += `4. **โรคฮีโมโกลบินผิดปกติชนิดอื่นๆ เช่น Hb H disease** (หากโลหิตจางชัดเจน)\n\n`;
    } else {
      report += `1. ⭐ **ภาวะโลหิตจางจากการขาดธาตุเหล็ก (Iron Deficiency Anemia - IDA)**: **มีความเป็นไปได้สูงที่สุด**\n`;
      report += `   - **เหตุผลสนับสนุน**: ดัชนี Mentzer (${indices.mentzerIndex}) มากกว่า 13 ร่วมกับจำนวนเม็ดเลือดแดงลดลงสอดคล้องกับขนาดเซลล์ที่เล็กลง\n`;
      report += `   - พบบ่อยจากการเสียเลือดเรื้อรัง (เช่น ประจำเดือนมามาก, เลือดออกทางเดินอาหาร) หรือการดูดซึมธาตุเหล็กไม่เพียงพอ\n\n`;
      report += `2. **พาหะธาลัสซีเมีย (Thalassemia Trait)**: ต้องตรวจยืนยันเพื่อแยกโรคให้แน่นอน\n`;
      report += `3. **ภาวะโลหิตจางจากโรคไตเรื้อรัง หรือการอักเสบเรื้อรัง (Anemia of Chronic Disease / Inflammation)**\n`;
      report += `4. **Sideroblastic Anemia หรือ ภาวะพิษจากสารตะกั่ว (Lead Poisoning)** (พบได้น้อย)\n\n`;
    }
  } else if (indices.mcv > 100) {
    // Macrocytic
    report += `สำหรับ **Macrocytic Anemia (MCV > 100 fL)** โรคที่ต้องพิจารณา ได้แก่:\n\n`;
    report += `1. **Megaloblastic Anemia**: ภาวะขาดวิตามิน B12 (Cobalamin) หรือ ขาดกรดโฟลิก (Folate deficiency) จากภาวะทุพโภชนาการ หรือการดูดซึมผิดปกติ\n`;
    report += `2. **โรคตับหรือการดื่มแอลกอฮอล์เรื้อรัง (Alcohol-induced / Chronic Liver Disease)**\n`;
    report += `3. **ภาวะเม็ดเลือดแดงตัวอ่อนในกระแสเลือดสูง (Reticulocytosis / Hemolytic recovery)**\n`;
    report += `4. **ภาวะต่อมไทรอยด์ทำงานน้อย (Hypothyroidism)**\n`;
    report += `5. **ผลข้างเคียงจากยา**: เช่น ยากดภูมิคุ้มกัน (Methotrexate, Azathioprine), ยารักษาเอชไอวี หรือยาเคมีบำบัด\n`;
    report += `6. **Myelodysplastic Syndrome (MDS)**: โดยเฉพาะในผู้สูงอายุ\n\n`;
  } else {
    // Normocytic
    report += `สำหรับ **Normocytic Normochromic (MCV 80 - 100 fL)**:\n\n`;
    if (isAnemic) {
      report += `1. **ภาวะโลหิตจางจากโรคเรื้อรัง (Anemia of Chronic Disease / Chronic Kidney Disease)**\n`;
      report += `2. **การเสียเลือดเฉียบพลัน (Acute Blood Loss)** (ก่อนที่ร่างกายจะปรับขนาดเซลล์)\n`;
      report += `3. **ภาวะเม็ดเลือดแดงแตกทำลาย (Hemolytic Anemia)** เช่น AIHA, G6PD deficiency, PNH\n`;
      if (inputs.sex === 'female' && inputs.isPregnant) {
        report += `4. **Physiologic Anemia of Pregnancy**: การเพิ่มขึ้นของ Plasma volume มากกว่า Red cell mass ในหญิงตั้งครรภ์\n`;
      }
      report += `5. **ภาวะไขกระดูกฝ่อ (Aplastic Anemia / Bone Marrow Infiltration)**\n\n`;
    } else {
      report += `1. ดัชนีเม็ดเลือดแดงทุกตัวอยู่ในเกณฑ์มาตรฐานปกติ ไม่มีข้อบ่งชี้ของภาวะโลหิตจางจากค่าที่ได้รับ\n\n`;
    }
  }

  // Section 3: Recommended investigations
  report += `#### 3. การตรวจทางห้องปฏิบัติการเพื่อยืนยันการวินิจฉัย (Recommended Laboratory Workup)\n`;
  if (indices.mcv < 80 || isAnemic) {
    report += `- 🔬 **ตรวจสเมียร์เลือด (Peripheral Blood Smear - PBS)**: เพื่อดูขนาด รูปร่าง (Poikilocytosis เช่น Target cells, Tear drop, Ovalocytes, Basophilic stippling) และสีย้อมของเม็ดเลือดแดง\n`;
    report += `- 🧪 **ชุดตรวจประเมินภาวะธาตุเหล็ก (Iron Studies)**:\n`;
    report += `  - Serum Ferritin (ตัวบ่งชี้ปริมาณธาตุเหล็กสะสมที่แม่นยำที่สุด)\n`;
    report += `  - Serum Iron, Total Iron Binding Capacity (TIBC), และ Transferrin Saturation (%TSAT)\n`;
    report += `- 🧬 **การตรวจคัดกรองและวินิจฉัยธาลัสซีเมีย (Thalassemia Workup)**:\n`;
    report += `  - Hb Typing (HPLC / Capillary Electrophoresis) เพื่อดูสัดส่วน Hb A2, Hb F, Hb E\n`;
    report += `  - DNA Analysis / PCR for Alpha-thalassemia 1 & 2 deletion (หากสงสัยพาหะแอลฟาธาลัสซีเมีย)\n`;
    report += `- 🩸 **Reticulocyte Count & RPI**: เพื่อประเมินการตอบสนองในการสร้างเม็ดเลือดแดงของไขกระดูก\n`;
  } else if (indices.mcv > 100) {
    report += `- 💊 **ตรวจวัดระดับ Serum Vitamin B12 และ Serum/RBC Folate**\n`;
    report += `- 🔬 **Peripheral Blood Smear**: ตรวจหา Hypersegmented Neutrophils และ Oval macrocytes\n`;
    report += `- 🧪 **Liver Function Test (LFT) และ Thyroid Function (TSH, Free T4)**\n`;
    report += `- 🩸 **Reticulocyte Count และ Serum LDH, Total/Direct Bilirubin** (ประเมินภาวะ Hemolysis)\n`;
  } else {
    report += `- ติดตามผล CBC และสุขภาพประจำปีตามความเหมาะสม\n`;
    report += `- หากมีอาการอ่อนเพลีย วิงเวียน หรือมีอาการผิดปกติ ควรตรวจ Peripheral blood smear เพิ่มเติม\n`;
  }

  // Section 4: Clinical recommendations
  report += `\n#### 4. ข้อเสนอแนะทางคลินิกและการดูแลเบื้องต้น (Clinical Guidance)\n`;
  if (isAnemic) {
    report += `- ⚠️ **ห้ามซื้อธาตุเหล็กบำรุงเลือดรับประทานเองก่อนตรวจยืนยัน**: ในประชากรไทยที่มีพาหะธาลัสซีเมียสูง การรับประทานธาตุเหล็กโดยไม่ได้ขาดธาตุเหล็กจริง อาจทำให้เกิดภาวะธาตุเหล็กสะสมเกิน (Iron Overload) ซึ่งเป็นอันตรายต่อตับและหัวใจ\n`;
    report += `- 🥗 **ด้านโภชนาการ**: รับประทานอาหารครบ 5 หมู่ เน้นอาหารที่มีธาตุเหล็กสูง (ตับ เลือด เนื้อแดง ไข่แดง ผักใบเขียวเข้ม) ควบคู่กับวิตามินซีเพื่อช่วยการดูดซึม\n`;
    if (inputs.sex === 'female' && inputs.isPregnant) {
      report += `- 🤰 **หญิงตั้งครรภ์**: โปรดปรึกษาสูติ-นรีแพทย์เพื่อวางแผนการให้ยาบำรุงครรภ์ การตรวจคัดกรองธาลัสซีเมียของคู่สมรส (Couple Screening) เพื่อป้องกันโรคธาลัสซีเมียชนิดรุนแรงในทารก\n`;
    }
  } else {
    report += `- ผลเลือดอยู่ในเกณฑ์ที่น่าพึงพอใจ ควรตรวจติดตามสุขภาพสม่ำเสมอและรักษาสุขอนามัยที่ดี\n`;
  }

  report += `\n> *(หมายเหตุ: บทวิเคราะห์นี้ประมวลผลจากระบบผู้เชี่ยวชาญโลหิตวิทยาอัตโนมัติ เพื่อการเรียนรู้และการคำนวณเบื้องต้น)*`;

  return report;
}
