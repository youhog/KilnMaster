
export interface FiringSegment {
  id: string;
  type: 'ramp' | 'hold';
  rate?: number; // Degrees per hour (only for ramp)
  targetTemp: number; // Target temperature in Celsius
  holdTime?: number; // Minutes to hold (only for hold/soak)
}

export interface FiringSchedule {
  id: string;
  name: string;
  segments: FiringSegment[];
  estimatedDurationMinutes: number;
  clayWeight?: number; // Estimated weight of clay in kg
}

export interface FiringLog {
  id: string;
  scheduleName: string;
  date: string;
  predictedDuration: number; // Minutes
  theoreticalDuration?: number; // Minutes
  actualDuration: number; // Minutes
  clayWeight?: number; // Weight of clay in kg
  notes: string;
  outcome: 'perfect' | 'underfired' | 'overfired' | 'error' | 'failure';
}

export interface CalibrationResult {
  factor: number; // Multiplier, e.g., 1.05 means kiln is 5% slower than theoretical
  advice: string;
}

export const outcomeMap: Record<string, string> = {
  'perfect': '完美',
  'underfired': '溫度不足',
  'overfired': '過溫',
  'error': '錯誤',
  'failure': '失敗'
};

// Helper to create empty segments
export const createEmptySegment = (): FiringSegment => ({
  id: crypto.randomUUID(),
  type: 'ramp',
  rate: 150,
  targetTemp: 600,
  holdTime: 0,
});

// Calculate theoretical duration based on physics (rate and hold time)
export const calculateTheoreticalDuration = (segments: FiringSegment[]): number => {
  let totalMinutes = 0;
  let currentTemp = 25; // Start at ambient temperature

  segments.forEach(seg => {
    if (seg.type === 'ramp') {
      const rate = seg.rate ?? 0;
      const target = seg.targetTemp;
      
      // Calculate ramp duration
      if (rate > 0) {
        const tempDiff = Math.abs(target - currentTemp);
        const durationMinutes = (tempDiff / rate) * 60;
        totalMinutes += durationMinutes;
      }
      
      // Update current temp to target
      currentTemp = target;
    } else if (seg.type === 'hold') {
      // Add hold time
      const duration = seg.holdTime ?? 0;
      totalMinutes += duration;
    }
  });

  return Math.round(totalMinutes);
};

// Helper to calculate temperature points for charting
export const calculateSchedulePoints = (segments: FiringSegment[]) => {
  let currentTemp = 25;
  let currentTime = 0;
  const points = [{ time: 0, temp: 25 }];

  segments.forEach(seg => {
    if (seg.type === 'hold') {
      currentTime += seg.holdTime || 0;
      points.push({ time: currentTime, temp: currentTemp });
    } else if (seg.type === 'ramp' && seg.rate && seg.rate > 0) {
      const diff = Math.abs(seg.targetTemp - currentTemp);
      const minutes = (diff / seg.rate) * 60;
      currentTime += minutes;
      currentTemp = seg.targetTemp;
      points.push({ time: currentTime, temp: currentTemp });
    }
  });

  return points;
};
