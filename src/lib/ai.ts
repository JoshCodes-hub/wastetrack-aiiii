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
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const PRIORITY_DISPLAY: Record<PriorityKey, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const RISK_DISPLAY: Record<RiskKey, string> = {
  low_risk: 'Low Risk',
  medium_risk: 'Medium Risk',
  high_risk: 'High Risk',
};

const wasteKeywords: Record<WasteTypeKey, string[]> = {
  plastic: ['bottle', 'plastic', 'bag', 'wrapper', 'container', 'packaging', 'straw', 'cup', 'sachet', 'nylon'],
  food_waste: ['food', 'leftover', 'fruit', 'vegetable', 'rotten', 'organic', 'peel', 'bread', 'meal', 'cooked'],
  paper: ['paper', 'cardboard', 'box', 'newspaper', 'magazine', 'envelope', 'tissue', 'carton', 'book'],
  electronic: ['electronic', 'wire', 'cable', 'phone', 'computer', 'battery', 'circuit', 'screen', 'charger', 'laptop'],
  hazardous: ['chemical', 'paint', 'oil', 'solvent', 'toxic', 'medical', 'syringe', 'bleach', 'acid', 'pesticide'],
  glass: ['glass', 'bottle', 'jar', 'mirror', 'window', 'broken glass', 'ceramic'],
  mixed_waste: ['mixed', 'trash', 'garbage', 'waste', 'rubbish', 'debris', 'litter', 'dump', 'pile', 'assorted'],
  organic: ['leaf', 'grass', 'wood', 'garden', 'plant', 'flower', 'branch', 'hay', 'straw', 'manure'],
};

const severityIndicators: Record<SeverityKey, string[]> = {
  low: ['small', 'little', 'minor', 'few', 'slight', 'scattered', 'isolated', 'single'],
  medium: ['moderate', 'some', 'several', 'medium', 'fair', 'noticeable', 'accumulated'],
  high: ['large', 'big', 'lot', 'significant', 'major', 'substantial', 'overflowing', 'widespread', 'pile'],
  critical: ['huge', 'massive', 'extreme', 'overflowing', 'critical', 'emergency', 'spill', 'flood', 'toxic spill'],
};

const priorityKeywords: Record<PriorityKey, string[]> = {
  low: ['distant', 'rural', 'remote', 'not urgent', 'isolated', 'unpopulated'],
  medium: ['urban', 'residential', 'standard', 'normal', 'neighborhood', 'street'],
  high: ['school', 'hospital', 'park', 'public', 'market', 'commercial', 'crowded', 'drain', 'waterway'],
  urgent: ['blocking', 'dangerous', 'main road', 'highway', 'emergency', 'immediate', 'flooding', 'health hazard'],
};

function getRandomConfidence(): number {
  return 0.78 + Math.random() * 0.18;
}

function analyzeByKeywords(text: string, keywordMap: Record<string, string[]>): string {
  const lower = text.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [key, keywords] of Object.entries(keywordMap)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = key;
    }
  }
  return bestMatch || Object.keys(keywordMap)[Math.floor(Math.random() * Object.keys(keywordMap).length)];
}

function estimateQuantity(severity: SeverityKey, wasteType: WasteTypeKey): string {
  const isSpecial = wasteType === 'hazardous' || wasteType === 'electronic';
  if (isSpecial) {
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

function assessEnvironmentalRisk(wasteType: WasteTypeKey, severity: SeverityKey, priority: PriorityKey): RiskKey {
  const highRiskWaste: WasteTypeKey[] = ['hazardous', 'electronic'];
  const mediumRiskWaste: WasteTypeKey[] = ['plastic', 'mixed_waste'];

  if (highRiskWaste.includes(wasteType) && (severity === 'high' || severity === 'critical')) return 'high_risk';
  if (mediumRiskWaste.includes(wasteType) && severity === 'critical') return 'high_risk';
  if (highRiskWaste.includes(wasteType) && severity === 'medium') return 'medium_risk';
  if (severity === 'critical' || priority === 'urgent') return 'high_risk';
  if (severity === 'high' || priority === 'high') return 'medium_risk';
  return 'low_risk';
}

function generateRecommendedAction(
  wasteType: WasteTypeKey,
  severity: SeverityKey,
  priority: PriorityKey,
  risk: RiskKey
): string {
  const urgency = priority === 'urgent' ? 'Immediate' : priority === 'high' ? 'Prompt' : 'Scheduled';
  const timeframes: Record<PriorityKey, string> = {
    low: 'within 72 hours',
    medium: 'within 48 hours',
    high: 'within 24 hours',
    urgent: 'within 2 hours',
  };

  const baseActions: Record<WasteTypeKey, string> = {
    plastic: `Collect and segregate for recycling. ${risk === 'high_risk' ? 'Avoid waterway contamination.' : 'Send to MRF for processing.'}`,
    food_waste: `Collect for composting or anaerobic digestion. ${severity === 'critical' ? 'Address odor and pest concerns immediately.' : 'Dispose in green waste stream.'}`,
    paper: `Bundle and send for recycling. ${severity === 'high' ? 'Ensure dry storage to maintain recyclability.' : 'Standard recycling protocol.'}`,
    electronic: `Handle as e-waste. ${risk === 'high_risk' ? 'Check for battery leakage or hazardous components. Use PPE.' : 'Send to certified e-waste recycler.'}`,
    hazardous: `Isolate area. Use protective equipment. ${severity === 'critical' ? 'Evacuate area if toxic fumes detected. Contact HAZMAT team.' : 'Dispose at licensed hazardous waste facility.'}`,
    glass: `Sweep and collect. ${severity === 'high' ? 'Use caution with broken pieces. Segregate by color if possible.' : 'Send for glass recycling.'}`,
    mixed_waste: `Sort into recyclable and non-recyclable streams. ${risk === 'high_risk' ? 'Prioritize removal to prevent environmental spread.' : 'Standard landfill diversion protocol.'}`,
    organic: `Collect for composting. ${severity === 'high' ? 'Check for appropriate moisture levels.' : 'Add to green waste processing.'}`,
  };

  return `${urgency} action required ${timeframes[priority]}. ${baseActions[wasteType]}`;
}

export async function analyzeWasteImage(imageFile: File, description?: string): Promise<AIAnalysis> {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

  const textToAnalyze = `${imageFile.name} ${description || ''}`;
  const confidence = getRandomConfidence();

  const wasteKey = analyzeByKeywords(textToAnalyze, wasteKeywords) as WasteTypeKey;
  const sevKey = analyzeByKeywords(textToAnalyze, severityIndicators) as SeverityKey;
  const priKey = analyzeByKeywords(textToAnalyze, priorityKeywords) as PriorityKey;

  const riskKey = assessEnvironmentalRisk(wasteKey, sevKey, priKey);

  return {
    wasteType: WASTE_DISPLAY[wasteKey],
    severity: SEVERITY_DISPLAY[sevKey],
    priority: PRIORITY_DISPLAY[priKey],
    estimatedQuantity: estimateQuantity(sevKey, wasteKey),
    environmentalRisk: RISK_DISPLAY[riskKey],
    recommendedAction: generateRecommendedAction(wasteKey, sevKey, priKey, riskKey),
    confidence,
  };
}
