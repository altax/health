export interface BodyProfile {
  sex: "male" | "female";
  age: number;
  height: number;
  weight: number;
  chest?: number;
  waist?: number;
  hips?: number;
  neck?: number;
  shoulder?: number;
  thigh?: number;
  calf?: number;
}

export interface BodyProportions {
  totalHeight: number;
  headRadius: number;
  headHeight: number;
  neckRadius: number;
  neckLength: number;
  shoulderWidth: number;
  chestDepth: number;
  chestWidth: number;
  waistWidth: number;
  waistDepth: number;
  hipWidth: number;
  hipDepth: number;
  torsoLength: number;
  upperArmRadius: number;
  upperArmLength: number;
  forearmRadius: number;
  forearmLength: number;
  handRadius: number;
  handLength: number;
  thighRadius: number;
  thighLength: number;
  shinRadius: number;
  shinLength: number;
  footLength: number;
  footHeight: number;
  skinTone: string;
}

export interface HealthMetrics {
  bmi: number;
  bmiCategory: string;
  bmiColor: string;
  bmr: number;
  tdee: number;
  idealWeightMin: number;
  idealWeightMax: number;
  bodyFatEstimate: number;
  bodyFatCategory: string;
  bodyFatColor: string;
  waistToHeightRatio: number | null;
  waistToHipRatio: number | null;
  whrRisk: string;
  whrColor: string;
  cardiovascularRisk: string;
  cardiovascularColor: string;
  recommendations: string[];
}

export function calculateProportions(p: BodyProfile): BodyProportions {
  const H = p.height / 100;
  const bmi = p.weight / (H * H);
  const isMale = p.sex === "male";

  const fatFactor = Math.max(0, (bmi - 18.5) / 25);

  const headR = H / 15;
  const headH = H / 7.5;
  const neckR = isMale ? H * 0.026 + fatFactor * 0.008 : H * 0.022 + fatFactor * 0.007;
  const neckL = H * 0.06;

  const baseShoulderW = isMale ? H * 0.259 : H * 0.234;
  const shoulderW = baseShoulderW + fatFactor * 0.04;

  const chestCirc = p.chest ? p.chest / 100 : (isMale ? H * 0.56 + fatFactor * 0.06 : H * 0.53 + fatFactor * 0.07);
  const chestW = chestCirc / Math.PI;
  const chestD = chestW * 0.72;

  const waistCirc = p.waist ? p.waist / 100 : (isMale ? H * 0.42 + fatFactor * 0.12 : H * 0.40 + fatFactor * 0.14);
  const waistW = waistCirc / Math.PI;
  const waistD = waistW * 0.78;

  const hipCirc = p.hips ? p.hips / 100 : (isMale ? H * 0.50 + fatFactor * 0.08 : H * 0.56 + fatFactor * 0.09);
  const hipW = hipCirc / Math.PI;
  const hipD = hipW * 0.82;

  const torsoL = H * 0.30;

  const uaR = isMale ? H * 0.028 + fatFactor * 0.01 : H * 0.025 + fatFactor * 0.01;
  const uaL = H * 0.186;
  const faR = isMale ? H * 0.022 + fatFactor * 0.007 : H * 0.019 + fatFactor * 0.007;
  const faL = H * 0.146;
  const handR = H * 0.014;
  const handL = H * 0.108;

  const thighR = p.thigh ? (p.thigh / 100) / (2 * Math.PI) : (isMale ? H * 0.035 + fatFactor * 0.016 : H * 0.038 + fatFactor * 0.018);
  const thighL = H * 0.245;
  const shinR = p.calf ? (p.calf / 100) / (2 * Math.PI) : (isMale ? H * 0.024 + fatFactor * 0.008 : H * 0.022 + fatFactor * 0.008);
  const shinL = H * 0.246;
  const footL = H * 0.152;
  const footH = H * 0.036;

  return {
    totalHeight: H,
    headRadius: headR,
    headHeight: headH,
    neckRadius: neckR,
    neckLength: neckL,
    shoulderWidth: shoulderW,
    chestDepth: chestD,
    chestWidth: chestW,
    waistWidth: waistW,
    waistDepth: waistD,
    hipWidth: hipW,
    hipDepth: hipD,
    torsoLength: torsoL,
    upperArmRadius: uaR,
    upperArmLength: uaL,
    forearmRadius: faR,
    forearmLength: faL,
    handRadius: handR,
    handLength: handL,
    thighRadius: thighR,
    thighLength: thighL,
    shinRadius: shinR,
    shinLength: shinL,
    footLength: footL,
    footHeight: footH,
    skinTone: "#C8956C",
  };
}

export function calculateHealth(p: BodyProfile): HealthMetrics {
  const H = p.height / 100;
  const bmi = p.weight / (H * H);
  const isMale = p.sex === "male";

  let bmiCategory = "";
  let bmiColor = "";
  if (bmi < 18.5) { bmiCategory = "Недостаток веса"; bmiColor = "#3B82F6"; }
  else if (bmi < 25) { bmiCategory = "Норма"; bmiColor = "#22C55E"; }
  else if (bmi < 30) { bmiCategory = "Избыточный вес"; bmiColor = "#F59E0B"; }
  else if (bmi < 35) { bmiCategory = "Ожирение I ст."; bmiColor = "#EF4444"; }
  else { bmiCategory = "Ожирение II-III ст."; bmiColor = "#7F1D1D"; }

  const bmr = isMale
    ? 88.362 + 13.397 * p.weight + 4.799 * p.height - 5.677 * p.age
    : 447.593 + 9.247 * p.weight + 3.098 * p.height - 4.330 * p.age;

  const tdee = bmr * 1.55;

  const idealMin = isMale ? 22 * H * H : 21 * H * H;
  const idealMax = isMale ? 25 * H * H : 24 * H * H;

  let bodyFat = isMale
    ? 1.20 * bmi + 0.23 * p.age - 16.2
    : 1.20 * bmi + 0.23 * p.age - 5.4;
  bodyFat = Math.max(3, Math.min(60, bodyFat));

  let bfCategory = "";
  let bfColor = "";
  if (isMale) {
    if (bodyFat < 6) { bfCategory = "Атлет"; bfColor = "#3B82F6"; }
    else if (bodyFat < 14) { bfCategory = "Фитнес"; bfColor = "#22C55E"; }
    else if (bodyFat < 18) { bfCategory = "Норма"; bfColor = "#22C55E"; }
    else if (bodyFat < 25) { bfCategory = "Выше нормы"; bfColor = "#F59E0B"; }
    else { bfCategory = "Высокий"; bfColor = "#EF4444"; }
  } else {
    if (bodyFat < 14) { bfCategory = "Атлет"; bfColor = "#3B82F6"; }
    else if (bodyFat < 21) { bfCategory = "Фитнес"; bfColor = "#22C55E"; }
    else if (bodyFat < 25) { bfCategory = "Норма"; bfColor = "#22C55E"; }
    else if (bodyFat < 32) { bfCategory = "Выше нормы"; bfColor = "#F59E0B"; }
    else { bfCategory = "Высокий"; bfColor = "#EF4444"; }
  }

  const whr = p.waist && p.hips ? p.waist / p.hips : null;
  const wthr = p.waist ? (p.waist / p.height) : null;

  let whrRisk = "—";
  let whrColor = "#94A3B8";
  if (whr) {
    if (isMale) {
      if (whr < 0.90) { whrRisk = "Низкий риск"; whrColor = "#22C55E"; }
      else if (whr < 1.0) { whrRisk = "Умеренный"; whrColor = "#F59E0B"; }
      else { whrRisk = "Высокий риск"; whrColor = "#EF4444"; }
    } else {
      if (whr < 0.80) { whrRisk = "Низкий риск"; whrColor = "#22C55E"; }
      else if (whr < 0.85) { whrRisk = "Умеренный"; whrColor = "#F59E0B"; }
      else { whrRisk = "Высокий риск"; whrColor = "#EF4444"; }
    }
  }

  let cvRisk = "Норма";
  let cvColor = "#22C55E";
  let riskScore = 0;
  if (bmi >= 30) riskScore += 2;
  else if (bmi >= 25) riskScore += 1;
  if (p.age > 45 && isMale) riskScore += 1;
  if (p.age > 55 && !isMale) riskScore += 1;
  if (wthr && wthr > 0.5) riskScore += 2;
  if (riskScore >= 4) { cvRisk = "Высокий"; cvColor = "#EF4444"; }
  else if (riskScore >= 2) { cvRisk = "Умеренный"; cvColor = "#F59E0B"; }

  const recs: string[] = [];
  if (bmi < 18.5) recs.push("Увеличьте калорийность рациона — дефицит массы тела повышает риски.");
  if (bmi >= 25) recs.push("Снижение веса на 5–10% значительно улучшает метаболические показатели.");
  if (bmi >= 30) recs.push("Рекомендована консультация эндокринолога и диетолога.");
  if (p.age > 40) recs.push("Аэробные нагрузки 150+ мин/нед снижают кардиориски на 30%.");
  if (wthr && wthr > 0.5) recs.push("Висцеральный жир повышен. Ограничьте рафинированные углеводы.");
  if (recs.length === 0) recs.push("Показатели в норме. Поддерживайте текущий образ жизни.");

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory,
    bmiColor,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    idealWeightMin: Math.round(idealMin * 10) / 10,
    idealWeightMax: Math.round(idealMax * 10) / 10,
    bodyFatEstimate: Math.round(bodyFat * 10) / 10,
    bodyFatCategory: bfCategory,
    bodyFatColor: bfColor,
    waistToHeightRatio: wthr ? Math.round(wthr * 100) / 100 : null,
    waistToHipRatio: whr ? Math.round(whr * 100) / 100 : null,
    whrRisk,
    whrColor,
    cardiovascularRisk: cvRisk,
    cardiovascularColor: cvColor,
    recommendations: recs,
  };
}
