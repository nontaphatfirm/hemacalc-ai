/**
 * Reference Ranges & Hematology Calculation Engine
 * 
 * Contains demographic-adjusted reference ranges for:
 * - Hemoglobin (Hb) [g/dL]
 * - Hematocrit (Hct) [%]
 * - Red Blood Cell count (RBC) [10^6/µL]
 * 
 * Standard RBC Indices reference ranges:
 * - MCV: 80.0 - 100.0 fL
 * - MCH: 27.0 - 31.0 pg
 * - MCHC: 32.0 - 36.0 g/dL
 */

export const INDICES_REFERENCE = {
  mcv: {
    min: 80.0,
    max: 100.0,
    unit: 'fL',
    nameTh: 'ปริมาตรเฉลี่ยของเม็ดเลือดแดง (MCV)',
    nameEn: 'Mean Corpuscular Volume',
    formula: '(Hct × 10) / RBC'
  },
  mch: {
    min: 27.0,
    max: 31.0,
    unit: 'pg',
    nameTh: 'ปริมาณฮีโมโกลบินเฉลี่ยในเม็ดเลือดแดง (MCH)',
    nameEn: 'Mean Corpuscular Hemoglobin',
    formula: '(Hb × 10) / RBC'
  },
  mchc: {
    min: 32.0,
    max: 36.0,
    unit: 'g/dL',
    nameTh: 'ความเข้มข้นเฉลี่ยของฮีโมโกลบินในเม็ดเลือดแดง (MCHC)',
    nameEn: 'Mean Corpuscular Hemoglobin Concentration',
    formula: '(Hb × 100) / Hct'
  }
};

/**
 * Returns reference range for Hb, Hct, and RBC based on age, sex, and pregnancy status
 * @param {number} age - Age in years
 * @param {string} sex - 'male' | 'female'
 * @param {boolean} isPregnant - Pregnancy status (relevant if female)
 */
export function getDemographicReferenceRanges(age, sex, isPregnant = false) {
  const isFemale = sex === 'female';
  const ageNum = Number(age);

  // 1. Pregnant Female (Any age where pregnancy applies)
  if (isFemale && isPregnant) {
    return {
      groupLabel: 'หญิงตั้งครรภ์ (Pregnant Female)',
      hb: { min: 11.0, max: 14.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 33.0, max: 44.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 3.50, max: 4.80, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์ปรับตามสรีรวิทยาหญิงตั้งครรภ์ (Physiological Hemodilution)'
    };
  }

  // 2. Neonate / Infant (under 2 years)
  if (ageNum < 2) {
    return {
      groupLabel: 'ทารก / เด็กเล็ก (< 2 ปี)',
      hb: { min: 10.5, max: 13.5, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 32.0, max: 40.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 3.70, max: 5.00, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์ปกติสำหรับเด็กเล็ก'
    };
  }

  // 3. Young Children (2 - 5 years)
  if (ageNum <= 5) {
    return {
      groupLabel: 'เด็กปฐมวัย (2 - 5 ปี)',
      hb: { min: 11.0, max: 14.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 33.0, max: 42.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 3.90, max: 5.10, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์มาตรฐานเด็กเล็กตามองค์การอนามัยโลก (WHO)'
    };
  }

  // 4. Children (6 - 11 years)
  if (ageNum <= 11) {
    return {
      groupLabel: 'เด็กวัยเรียน (6 - 11 ปี)',
      hb: { min: 11.5, max: 15.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 35.0, max: 45.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 4.00, max: 5.20, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์มาตรฐานเด็กวัยเรียน'
    };
  }

  // 5. Adolescents (12 - 17 years)
  if (ageNum <= 17) {
    if (isFemale) {
      return {
        groupLabel: 'วัยรุ่นหญิง (12 - 17 ปี)',
        hb: { min: 11.8, max: 15.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
        hct: { min: 35.0, max: 45.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
        rbc: { min: 4.00, max: 5.20, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
        note: 'เกณฑ์มาตรฐานวัยรุ่นหญิง'
      };
    } else {
      return {
        groupLabel: 'วัยรุ่นชาย (12 - 17 ปี)',
        hb: { min: 12.5, max: 16.5, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
        hct: { min: 37.0, max: 49.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
        rbc: { min: 4.30, max: 5.70, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
        note: 'เกณฑ์มาตรฐานวัยรุ่นชาย'
      };
    }
  }

  // 6. Elderly (> 65 years)
  if (ageNum >= 65) {
    if (isFemale) {
      return {
        groupLabel: 'ผู้สูงอายุหญิง (≥ 65 ปี)',
        hb: { min: 11.7, max: 15.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
        hct: { min: 35.0, max: 46.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
        rbc: { min: 3.80, max: 5.10, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
        note: 'เกณฑ์ปรับตามสรีรวิทยาผู้สูงอายุ'
      };
    } else {
      return {
        groupLabel: 'ผู้สูงอายุชาย (≥ 65 ปี)',
        hb: { min: 12.6, max: 17.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
        hct: { min: 38.0, max: 50.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
        rbc: { min: 4.10, max: 5.60, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
        note: 'เกณฑ์ปรับตามสรีรวิทยาผู้สูงอายุ'
      };
    }
  }

  // 7. General Adults (18 - 64 years)
  if (isFemale) {
    return {
      groupLabel: 'หญิงวัยผู้ใหญ่ (Adult Female: 18 - 64 ปี)',
      hb: { min: 12.0, max: 15.5, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 36.0, max: 48.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 4.00, max: 5.20, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์มาตรฐานผู้ใหญ่หญิง'
    };
  } else {
    return {
      groupLabel: 'ชายวัยผู้ใหญ่ (Adult Male: 18 - 64 ปี)',
      hb: { min: 13.0, max: 17.5, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 40.0, max: 52.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 4.50, max: 5.90, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์มาตรฐานผู้ใหญ่ชาย'
    };
  }
}

/**
 * Evaluates whether a value is Low, Normal, or High
 * @param {number} value 
 * @param {number} min 
 * @param {number} max 
 * @returns {{ status: 'low' | 'normal' | 'high', labelTh: string, labelEn: string }}
 */
export function evaluateStatus(value, min, max) {
  const val = Number(value);
  if (isNaN(val)) return { status: 'unknown', labelTh: 'ไม่ระบุ', labelEn: 'Unknown' };
  
  if (val < min) {
    return { status: 'low', labelTh: 'ต่ำกว่าปกติ (Low)', labelEn: 'Low' };
  } else if (val > max) {
    return { status: 'high', labelTh: 'สูงกว่าปกติ (High)', labelEn: 'High' };
  } else {
    return { status: 'normal', labelTh: 'ปกติ (Normal)', labelEn: 'Normal' };
  }
}

/**
 * Calculates all RBC indices and full diagnostic evaluation
 */
export function calculateRBCIndices({ hb, hct, rbcRawCount, age, sex, isPregnant }) {
  const hbVal = parseFloat(hb);
  const hctVal = parseFloat(hct);
  const rbcRawVal = parseFloat(rbcRawCount);
  const ageVal = parseFloat(age);

  if (isNaN(hbVal) || isNaN(hctVal) || isNaN(rbcRawVal) || isNaN(ageVal)) {
    throw new Error('กรุณากรอกข้อมูลตัวเลขให้ครบถ้วนและถูกต้อง');
  }

  if (hbVal <= 0 || hctVal <= 0 || rbcRawVal <= 0 || ageVal < 0) {
    throw new Error('ค่าทางโลหิตวิทยาและอายุต้องเป็นจำนวนบวกที่มากกว่า 0');
  }

  // 1. RBC Count conversion: Count in 5 squares / 100 => 10^6 / µL
  // Standard hemocytometer counting formula: 
  // Cells in 5 small squares (dilution 1:200, depth 0.1mm, volume 0.02 µL)
  // RBC (cells/µL) = (Cells counted × 200) / 0.02 = Cells counted × 10,000
  // RBC (10^6/µL) = (Cells counted × 10,000) / 1,000,000 = Cells counted / 100
  const rbcConverted = rbcRawVal / 100;

  // 2. RBC Indices calculations
  // MCV = (Hct × 10) / RBC
  const mcv = (hctVal * 10) / rbcConverted;

  // MCH = (Hb × 10) / RBC
  const mch = (hbVal * 10) / rbcConverted;

  // MCHC = (Hb × 100) / Hct
  const mchc = (hbVal * 100) / hctVal;

  // Mentzer Index = MCV / RBC
  const mentzerIndex = mcv / rbcConverted;

  // 3. Demographic reference ranges
  const demoRef = getDemographicReferenceRanges(ageVal, sex, isPregnant);

  // 4. Status evaluations
  const hbStatus = evaluateStatus(hbVal, demoRef.hb.min, demoRef.hb.max);
  const hctStatus = evaluateStatus(hctVal, demoRef.hct.min, demoRef.hct.max);
  const rbcStatus = evaluateStatus(rbcConverted, demoRef.rbc.min, demoRef.rbc.max);

  const mcvStatus = evaluateStatus(mcv, INDICES_REFERENCE.mcv.min, INDICES_REFERENCE.mcv.max);
  const mchStatus = evaluateStatus(mch, INDICES_REFERENCE.mch.min, INDICES_REFERENCE.mch.max);
  const mchcStatus = evaluateStatus(mchc, INDICES_REFERENCE.mchc.min, INDICES_REFERENCE.mchc.max);

  // 5. Morphologic Classification
  let sizeCategory = 'Normocytic';
  let sizeCategoryTh = 'ขนาดปกติ (Normocytic)';
  if (mcv < 80.0) {
    sizeCategory = 'Microcytic';
    sizeCategoryTh = 'ขนาดเล็กกว่าปกติ (Microcytic)';
  } else if (mcv > 100.0) {
    sizeCategory = 'Macrocytic';
    sizeCategoryTh = 'ขนาดใหญ่กว่าปกติ (Macrocytic)';
  }

  let chromicCategory = 'Normochromic';
  let chromicCategoryTh = 'ติดสีปกติ (Normochromic)';
  if (mchc < 32.0 || mch < 27.0) {
    chromicCategory = 'Hypochromic';
    chromicCategoryTh = 'ติดสีจาง (Hypochromic)';
  } else if (mchc > 36.0) {
    chromicCategory = 'Hyperchromic';
    chromicCategoryTh = 'ติดสีเข้มจัด / ผิดปกติ (Hyperchromic/Spherocytes)';
  }

  const isAnemic = hbStatus.status === 'low' || hctStatus.status === 'low';
  let morphologyLabelTh = '';
  let morphologyLabelEn = '';

  if (isAnemic) {
    if (sizeCategory === 'Microcytic' && chromicCategory === 'Hypochromic') {
      morphologyLabelTh = 'ภาวะโลหิตจางชนิดเม็ดเลือดแดงขนาดเล็กติดสีจาง (Microcytic Hypochromic Anemia)';
      morphologyLabelEn = 'Microcytic Hypochromic Anemia';
    } else if (sizeCategory === 'Normocytic' && chromicCategory === 'Normochromic') {
      morphologyLabelTh = 'ภาวะโลหิตจางชนิดเม็ดเลือดแดงขนาดและสีปกติ (Normocytic Normochromic Anemia)';
      morphologyLabelEn = 'Normocytic Normochromic Anemia';
    } else if (sizeCategory === 'Macrocytic') {
      morphologyLabelTh = 'ภาวะโลหิตจางชนิดเม็ดเลือดแดงขนาดใหญ่ (Macrocytic Anemia)';
      morphologyLabelEn = 'Macrocytic Anemia';
    } else {
      morphologyLabelTh = `ภาวะโลหิตจางชนิด ${sizeCategory} ${chromicCategory}`;
      morphologyLabelEn = `${sizeCategory} ${chromicCategory} Anemia`;
    }
  } else {
    if (hbStatus.status === 'high' || hctStatus.status === 'high' || rbcStatus.status === 'high') {
      morphologyLabelTh = 'ภาวะเม็ดเลือดแดงมีความเข้มข้นสูง (Polycythemia / Erythrocytosis)';
      morphologyLabelEn = 'Erythrocytosis / Polycythemia';
    } else {
      morphologyLabelTh = 'ค่าดัชนีเม็ดเลือดแดงอยู่ในเกณฑ์ปกติ (Normal RBC Indices & Morphology)';
      morphologyLabelEn = 'Normal Red Blood Cell Indices';
    }
  }

  // Mentzer Index Interpretation
  let mentzerTh = '';
  if (isAnemic || mcv < 80) {
    if (mentzerIndex < 13.0) {
      mentzerTh = 'Mentzer Index < 13: บ่งชี้ไปทาง "พาหะธาลัสซีเมีย (Thalassemia Trait)" มากกว่าขาดธาตุเหล็ก เนื่องจากจำนวน RBC ยังคงสูงเมื่อเทียบกับ MCV ที่เล็กลง';
    } else {
      mentzerTh = 'Mentzer Index > 13: บ่งชี้ไปทาง "โลหิตจางจากการขาดธาตุเหล็ก (Iron Deficiency Anemia)" มากกว่าพาหะธาลัสซีเมีย เนื่องจากจำนวน RBC ลดลงสัมพันธ์กับขนาดเม็ดเลือด';
    }
  } else {
    mentzerTh = `Mentzer Index = ${mentzerIndex.toFixed(1)} (ปกติไม่มีภาวะโลหิตจาง)`;
  }

  return {
    inputs: {
      hb: hbVal,
      hct: hctVal,
      rbcRawCount: rbcRawVal,
      rbcConverted: Number(rbcConverted.toFixed(2)),
      age: ageVal,
      sex,
      isPregnant
    },
    indices: {
      mcv: Number(mcv.toFixed(1)),
      mch: Number(mch.toFixed(1)),
      mchc: Number(mchc.toFixed(1)),
      mentzerIndex: Number(mentzerIndex.toFixed(1))
    },
    demoRef,
    indicesRef: INDICES_REFERENCE,
    evaluations: {
      hb: hbStatus,
      hct: hctStatus,
      rbc: rbcStatus,
      mcv: mcvStatus,
      mch: mchStatus,
      mchc: mchcStatus
    },
    morphology: {
      sizeCategory,
      sizeCategoryTh,
      chromicCategory,
      chromicCategoryTh,
      isAnemic,
      morphologyLabelTh,
      morphologyLabelEn,
      mentzerTh
    }
  };
}
