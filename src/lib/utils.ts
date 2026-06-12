export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestCleaner(
  reportLat: number,
  reportLng: number,
  cleaners: { id: string; latitude?: number; longitude?: number }[]
): string | null {
  let nearestId: string | null = null;
  let minDistance = Infinity;

  for (const cleaner of cleaners) {
    if (cleaner.latitude && cleaner.longitude) {
      const dist = calculateDistance(reportLat, reportLng, cleaner.latitude, cleaner.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestId = cleaner.id;
      }
    }
  }

  return nearestId;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500';
    case 'in_progress':
      return 'bg-blue-500';
    case 'completed':
      return 'bg-green-500';
    case 'empty':
    case 'LOW':
      return 'bg-green-400';
    case 'half_full':
    case 'MEDIUM':
      return 'bg-yellow-500';
    case 'full':
    case 'HIGH':
    case 'FULL':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

export function getStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function getWasteTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    plastic: '🫙',
    paper: '📄',
    food_waste: '🍎',
    mixed_waste: '🗑️',
    hazardous: '☣️',
    electronic: '💻',
  };
  return icons[type] || '🗑️';
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const displayToDbWaste: Record<string, string> = {
  'Plastic Waste': 'plastic',
  'Food Waste': 'food_waste',
  'Paper Waste': 'paper',
  'Electronic Waste': 'electronic',
  'Hazardous Waste': 'hazardous',
  'Glass Waste': 'glass',
  'Mixed Waste': 'mixed_waste',
  'Organic Waste': 'organic',
};

const displayToDbSeverity: Record<string, string> = {
  'Low': 'low',
  'Medium': 'medium',
  'High': 'high',
  'Critical': 'critical',
};

const displayToDbPriority: Record<string, string> = {
  'Low': 'low',
  'Medium': 'medium',
  'High': 'high',
  'Urgent': 'urgent',
};

export function mapAnalysisToDb(analysis: { wasteType: string; severity: string; priority: string }) {
  return {
    waste_type: displayToDbWaste[analysis.wasteType] || 'mixed_waste',
    severity: displayToDbSeverity[analysis.severity] || 'medium',
    priority: displayToDbPriority[analysis.priority] || 'medium',
  };
}
