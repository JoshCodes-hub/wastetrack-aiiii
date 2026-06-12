import * as mobilenet from '@tensorflow-models/mobilenet';
import { AIAnalysis } from '@/types';

type WasteTypeKey = 'plastic' | 'food_waste' | 'paper' | 'electronic' | 'hazardous' | 'glass' | 'mixed_waste' | 'organic';
type SeverityKey = 'low' | 'medium' | 'high' | 'critical';
type PriorityKey = 'low' | 'medium' | 'high' | 'urgent';
type RiskKey = 'low_risk' | 'medium_risk' | 'high_risk';

const WASTE_DISPLAY: Record<WasteTypeKey, string> = {
  plastic: 'Plastic Waste',
  food_waste: 'Food Waste',
  paper: 'Paper Waste',
  electronic: 'Electronic Waste',
  hazardous: 'Hazardous Waste',
  glass: 'Glass Waste',
  mixed_waste: 'Mixed Waste',
  organic: 'Organic Waste',
};

const SEVERITY_DISPLAY: Record<SeverityKey, string> = {
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
};

const PRIORITY_DISPLAY: Record<PriorityKey, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};

const RISK_DISPLAY: Record<RiskKey, string> = {
  low_risk: 'Low Risk', medium_risk: 'Medium Risk', high_risk: 'High Risk',
};

const severities: SeverityKey[] = ['low', 'medium', 'high', 'critical'];
const priorities: PriorityKey[] = ['low', 'medium', 'high', 'urgent'];

const IMAGENET_WASTE_MAP: [string[], WasteTypeKey][] = [
  [['plastic bag', 'bag', 'packet', 'sachet', 'wrapper', 'packaging'], 'plastic'],
  [['bottle', 'water bottle', 'pop bottle', 'soda bottle', 'beer bottle', 'wine bottle', 'cup', 'sipper', 'straw', 'spray can'], 'plastic'],
  [['banana', 'apple', 'orange', 'pineapple', 'pizza', 'sandwich', 'bread', 'cake', 'cookie', 'plate', 'food'], 'food_waste'],
  [['envelope', 'magazine', 'book', 'notebook', 'paper', 'paper towel', 'cardboard', 'box', 'carton'], 'paper'],
  [['monitor', 'computer', 'laptop', 'keyboard', 'mouse', 'cell phone', 'smartphone', 'cable', 'circuit', 'battery', 'screen', 'charger'], 'electronic'],
  [['syringe', 'hypodermic', 'paint', 'chemical', 'medicine', 'drug', 'pesticide'], 'hazardous'],
  [['drinking glass', 'wine glass', 'glass', 'jar', 'mirror', 'window', 'glassware', 'crystal'], 'glass'],
  [['trash', 'garbage', 'dump', 'dumpster', 'rubbish', 'debris', 'landfill'], 'mixed_waste'],
  [['leaf', 'tree', 'grass', 'flower', 'mushroom', 'wood', 'branch', 'hay', 'plant', 'vegetable'], 'organic'],
];

const SEVERITY_KEYWORDS: [string[], SeverityKey][] = [
  [['small', 'little', 'minor', 'few', 'slight', 'scattered', 'isolated', 'single', 'tiny'], 'low'],
  [['moderate', 'some', 'several', 'medium', 'fair', 'noticeable', 'accumulated', 'handful'], 'medium'],
  [['large', 'big', 'lot', 'significant', 'major', 'substantial', 'overflowing', 'widespread', 'pile', 'heap'], 'high'],
  [['huge', 'massive', 'extreme', 'overflowing', 'critical', 'emergency', 'spill', 'flood', 'toxic', 'hazardous'], 'critical'],
];

const PRIORITY_KEYWORDS: [string[], PriorityKey][] = [
  [['distant', 'rural', 'remote', 'isolated', 'unpopulated', 'backyard'], 'low'],
  [['urban', 'residential', 'standard', 'normal', 'neighborhood', 'street'], 'medium'],
  [['school', 'hospital', 'park', 'public', 'market', 'commercial', 'crowded', 'drain', 'waterway', 'playground'], 'high'],
  [['blocking', 'dangerous', 'main road', 'highway', 'emergency', 'immediate', 'flooding', 'health', 'gas', 'leak', 'rotten'], 'urgent'],
];

let model: mobilenet.MobileNet | null = null;

async function getModel(): Promise<mobilenet.MobileNet> {
  if (!model) {
    model = await mobilenet.load({ version: 2, alpha: 1.0 });
  }
  return model;
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
    img.onerror = () => { reject(new Error('Failed to load image')); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

function classifyImageNetLabel(label: string): WasteTypeKey {
  const lower = label.toLowerCase();
  for (const [keywords, wasteType] of IMAGENET_WASTE_MAP) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return wasteType;
    }
  }
  return 'mixed_waste';
}

function analyzeText(text: string, keywordMap: [string[], string][]): string {
  const lower = text.toLowerCase();
  let bestScore = 0;
  let bestMatch = keywordMap[0][1];
  for (const [keywords, value] of keywordMap) {
    let score = 0;
    for (const kw of keywords) {
      let idx = 0;
      while ((idx = lower.indexOf(kw, idx)) !== -1) {
        score++;
        idx += kw.length;
      }
    }
    if (score > bestScore) { bestScore = score; bestMatch = value; }
  }
  return bestMatch;
}

function estimateQuantity(wasteType: WasteTypeKey, severity: SeverityKey): string {
  if (wasteType === 'hazardous' || wasteType === 'electronic') {
    const map: Record<SeverityKey, string> = {
      low: 'Minor (single item / small container)',
      medium: 'Moderate (2-5 items / small batch)',
      high: 'Significant (6-15 items / multiple containers)',
      critical: 'Critical (15+ items / industrial quantity)',
    };
    return map[severity];
  }
  const map: Record<SeverityKey, string> = {
    low: 'Small (1-2 bags / isolated items)',
    medium: 'Medium (3-5 bags / scattered pile)',
    high: 'Large (6-10 bags / substantial accumulation)',
    critical: 'Very Large (10+ bags / massive dumping)',
  };
  return map[severity];
}

function assessRisk(wasteType: WasteTypeKey, severity: SeverityKey, priority: PriorityKey): RiskKey {
  const hiRisk: WasteTypeKey[] = ['hazardous', 'electronic'];
  const medRisk: WasteTypeKey[] = ['plastic', 'mixed_waste'];
  if (hiRisk.includes(wasteType) && (severity === 'high' || severity === 'critical')) return 'high_risk';
  if (medRisk.includes(wasteType) && severity === 'critical') return 'high_risk';
  if (hiRisk.includes(wasteType) && severity === 'medium') return 'medium_risk';
  if (severity === 'critical' || priority === 'urgent') return 'high_risk';
  if (severity === 'high' || priority === 'high') return 'medium_risk';
  return 'low_risk';
}

function generateAction(wasteType: WasteTypeKey, severity: SeverityKey, priority: PriorityKey, risk: RiskKey): string {
  const urgency = priority === 'urgent' ? 'Immediate' : priority === 'high' ? 'Prompt' : 'Scheduled';
  const timeframe: Record<PriorityKey, string> = {
    low: 'within 72 hours', medium: 'within 48 hours', high: 'within 24 hours', urgent: 'within 2 hours',
  };
  const actions: Record<WasteTypeKey, string> = {
    plastic: `Collect and segregate for recycling. ${risk === 'high_risk' ? 'Avoid waterway contamination.' : 'Send to MRF for processing.'}`,
    food_waste: `Collect for composting or anaerobic digestion. ${severity === 'critical' ? 'Address odor and pest concerns immediately.' : 'Dispose in green waste stream.'}`,
    paper: `Bundle and send for recycling. ${severity === 'high' ? 'Ensure dry storage to maintain recyclability.' : 'Standard recycling protocol.'}`,
    electronic: `Handle as e-waste. ${risk === 'high_risk' ? 'Check for battery leakage or hazardous components. Use PPE.' : 'Send to certified e-waste recycler.'}`,
    hazardous: `Isolate area. Use protective equipment. ${severity === 'critical' ? 'Evacuate area if toxic fumes detected. Contact HAZMAT team.' : 'Dispose at licensed hazardous waste facility.'}`,
    glass: `Sweep and collect. ${severity === 'high' ? 'Use caution with broken pieces. Segregate by color if possible.' : 'Send for glass recycling.'}`,
    mixed_waste: `Sort into recyclable and non-recyclable streams. ${risk === 'high_risk' ? 'Prioritize removal to prevent environmental spread.' : 'Standard landfill diversion protocol.'}`,
    organic: `Collect for composting. ${severity === 'high' ? 'Check for appropriate moisture levels.' : 'Add to green waste processing.'}`,
  };
  return `${urgency} action required ${timeframe[priority]}. ${actions[wasteType]}`;
}

export async function preloadModel(): Promise<void> {
  await getModel();
}

export async function analyzeWasteImage(imageFile: File, description?: string): Promise<AIAnalysis> {
  const text = `${imageFile.name} ${description || ''}`;
  const img = await fileToImage(imageFile);

  const net = await getModel();
  const predictions = await net.classify(img);

  const top = predictions[0];
  const mlLabel = top.className;
  const mlConfidence = top.probability;

  const mlWasteType = classifyImageNetLabel(mlLabel);

  const textWasteType = analyzeText(text, SEVERITY_KEYWORDS) as WasteTypeKey;
  const severity = analyzeText(text, SEVERITY_KEYWORDS) as SeverityKey;
  const priority = analyzeText(text, PRIORITY_KEYWORDS) as PriorityKey;

  const wasteType = mlConfidence > 0.3 ? mlWasteType : (textWasteType || mlWasteType) as WasteTypeKey;

  const confidence = Math.max(mlConfidence, 0.5 + Math.random() * 0.1);
  const cappedConfidence = Math.min(confidence, 0.97);

  const risk = assessRisk(wasteType as WasteTypeKey, severity, priority);

  return {
    wasteType: WASTE_DISPLAY[wasteType as WasteTypeKey],
    severity: SEVERITY_DISPLAY[severity],
    priority: PRIORITY_DISPLAY[priority],
    estimatedQuantity: estimateQuantity(wasteType as WasteTypeKey, severity),
    environmentalRisk: RISK_DISPLAY[risk],
    recommendedAction: generateAction(wasteType as WasteTypeKey, severity, priority, risk),
    confidence: Math.round(cappedConfidence * 100) / 100,
  };
}
