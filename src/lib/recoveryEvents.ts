import { getPainState, getRefluxState } from './metricInterpretation';
import { format } from 'date-fns';

interface DailyLogBase {
  id: number;
  date: string | Date;
  pain: number;
  reflux: number;
  walkedToday: boolean;
}

interface WorkoutSessionBase {
  id: number;
  date: string | Date;
}

export interface ProtocolChangeBase {
  id: number;
  changedAt: string | Date;
  changes: string;
}

export type EventSeverity = 'positive' | 'negative' | 'neutral';
export type EventImportance = 'major' | 'medium' | 'minor';
export type EventCategory = 'pain' | 'reflux' | 'activity' | 'recovery';

export interface RecoveryEvent {
  id: string;
  type: string;
  headline: string;
  date: string;
  severity: EventSeverity;
  importance: EventImportance;
  priority: number; // 0-100 scale for explicit Dashboard ranking
  category: EventCategory;
  timelineEligible: boolean;
  dashboardEligible: boolean;
}

export function formatDayKey(date: string | Date): string {
  return format(new Date(date), 'yyyy-MM-dd');
}

export interface RecoveryEventProvider {
  getEvents(logs: DailyLogBase[], workouts: WorkoutSessionBase[], protocolChanges?: ProtocolChangeBase[]): RecoveryEvent[];
  selectDashboardEvents(events: RecoveryEvent[], maxCount?: number): RecoveryEvent[];
  selectTimelineEvents(events: RecoveryEvent[]): RecoveryEvent[];
}

export const RuntimeEventProvider: RecoveryEventProvider = {
  getEvents(logs: DailyLogBase[], workouts: WorkoutSessionBase[], protocolChanges: ProtocolChangeBase[] = []): RecoveryEvent[] {
    const events: RecoveryEvent[] = [];
    
    const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const workoutDates = new Set(workouts.map(w => formatDayKey(w.date)));

  let walkStreak = 0;
  let consecutiveInactiveDays = 0;
  const recentActivityWindow: boolean[] = [];
  let wasHighVolumeLowPainState = false;

  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];
    const prevLog = i > 0 ? sortedLogs[i - 1] : null;
    const logDate = formatDayKey(log.date);
    const dayEvents: RecoveryEvent[] = [];

    // Track Activity Volume
    const hasWorkout = workoutDates.has(logDate);
    const isActiveDay = log.walkedToday || hasWorkout;

    if (isActiveDay) {
      consecutiveInactiveDays = 0;
    } else {
      consecutiveInactiveDays++;
    }

    recentActivityWindow.push(isActiveDay);
    if (recentActivityWindow.length > 5) {
      recentActivityWindow.shift();
    }

    const activeDaysInWindow = recentActivityWindow.filter(Boolean).length;
    const isHighVolumeWindow = recentActivityWindow.length === 5 && activeDaysInWindow >= 4;
    const currentPainStateForDay = getPainState(log.pain);
    const isCurrentlyHighVolumeLowPain = isHighVolumeWindow && currentPainStateForDay === 'Low';


    // 1. Walking Streaks (Behavior transitions)
    if (log.walkedToday) {
      walkStreak++;
      if (walkStreak === 5) {
        dayEvents.push({ id: `walk-5-${logDate}`, type: 'streak_5', category: 'activity', headline: 'Completed 5 consecutive walks', date: logDate, severity: 'positive', importance: 'medium', priority: 20, timelineEligible: true, dashboardEligible: true });
      } else if (walkStreak === 7) {
        dayEvents.push({ id: `walk-7-${logDate}`, type: 'streak_7', category: 'activity', headline: 'Completed 7 consecutive walks', date: logDate, severity: 'positive', importance: 'major', priority: 40, timelineEligible: true, dashboardEligible: true });
      }
    } else {
      if (walkStreak >= 5) {
        // Punitive events can be discouraging; keep off dashboard
        dayEvents.push({ id: `walk-broken-${logDate}`, type: 'streak_broken', category: 'activity', headline: 'Walking streak broken', date: logDate, severity: 'negative', importance: 'medium', priority: 10, timelineEligible: true, dashboardEligible: false });
      }
      walkStreak = 0;
    }

    if (prevLog) {
      // 2. Pain State Transitions
      const currentPainState = getPainState(log.pain);
      const prevPainState = getPainState(prevLog.pain);
      const painDelta = log.pain - prevLog.pain;

      if (currentPainState === 'High' && prevPainState !== 'High') {
        dayEvents.push({ id: `pain-high-${logDate}`, type: 'pain_high', category: 'pain', headline: 'Pain entered high range', date: logDate, severity: 'negative', importance: 'major', priority: 100, timelineEligible: true, dashboardEligible: true });
      } else if (currentPainState === 'Low' && prevPainState !== 'Low') {
        dayEvents.push({ id: `pain-low-${logDate}`, type: 'pain_low', category: 'pain', headline: 'Returned to low pain range', date: logDate, severity: 'positive', importance: 'major', priority: 80, timelineEligible: true, dashboardEligible: true });
      } else if (painDelta >= 3) {
        dayEvents.push({ id: `pain-flare-${logDate}`, type: 'pain_flare', category: 'pain', headline: 'Pain flare detected', date: logDate, severity: 'negative', importance: 'major', priority: 85, timelineEligible: true, dashboardEligible: true });
      } else if (painDelta <= -3) {
        dayEvents.push({ id: `pain-drop-${logDate}`, type: 'pain_drop', category: 'pain', headline: 'Pain dropped significantly', date: logDate, severity: 'positive', importance: 'medium', priority: 70, timelineEligible: true, dashboardEligible: true });
      }

      // Cross-Metric: Pattern A (Deconditioning Flare)
      // High priority because it represents a negative behavioral outcome
      if ((painDelta >= 2 || (currentPainState === 'High' && prevPainState !== 'High')) && consecutiveInactiveDays >= 3) {
        dayEvents.push({ id: `pain-inactive-flare-${logDate}`, type: 'pain_inactive_flare', category: 'pain', headline: 'Pain increased during a period of reduced activity', date: logDate, severity: 'negative', importance: 'major', priority: 105, timelineEligible: true, dashboardEligible: true });
      }

      // Cross-Metric: Pattern C (Adaptation Success)
      if (isCurrentlyHighVolumeLowPain && !wasHighVolumeLowPainState && painDelta <= 0) {
        // Priority 85 overrides basic pain drops
        dayEvents.push({ id: `pain-adaptation-${logDate}`, type: 'pain_adaptation', category: 'pain', headline: 'Maintaining low pain despite high activity', date: logDate, severity: 'positive', importance: 'major', priority: 85, timelineEligible: true, dashboardEligible: true });
      }

      // 3. Reflux State Transitions
      const currentRefluxState = getRefluxState(log.reflux);
      const prevRefluxState = getRefluxState(prevLog.reflux);
      
      if (currentRefluxState === 'High' && prevRefluxState !== 'High') {
        dayEvents.push({ id: `reflux-high-${logDate}`, type: 'reflux_high', category: 'reflux', headline: 'Reflux entered high range', date: logDate, severity: 'negative', importance: 'major', priority: 90, timelineEligible: true, dashboardEligible: true });
      } else if (currentRefluxState === 'Low' && prevRefluxState !== 'Low') {
        dayEvents.push({ id: `reflux-low-${logDate}`, type: 'reflux_low', category: 'reflux', headline: 'Reflux normalized', date: logDate, severity: 'positive', importance: 'medium', priority: 75, timelineEligible: true, dashboardEligible: true });
      }
    }
    
    // 4. Workout Interactions
    if (hasWorkout && log.pain <= 3 && getPainState(log.pain) === 'Low') {
       dayEvents.push({ id: `workout-low-pain-${logDate}`, type: 'workout_low_pain', category: 'activity', headline: 'Completed workout with low pain', date: logDate, severity: 'positive', importance: 'medium', priority: 30, timelineEligible: true, dashboardEligible: true });
    }

    // Deduplicate: Enforce one primary event per category per day
    const categories = new Set(dayEvents.map(e => e.category));
    categories.forEach(cat => {
      const catEvents = dayEvents.filter(e => e.category === cat);
      // Sort by priority descending
      catEvents.sort((a, b) => b.priority - a.priority);
      // Keep only the highest priority event for this category
      events.push(catEvents[0]);
    });

    wasHighVolumeLowPainState = isCurrentlyHighVolumeLowPain;
  }

  // 5. Protocol Changes
  for (const pc of protocolChanges) {
    const changeDate = formatDayKey(pc.changedAt);
    let headline = 'Protocol updated';
    try {
      const parsed = JSON.parse(pc.changes);
      const keys = Object.keys(parsed);
      
      if (keys.length === 1) {
        const key = keys[0];
        const val = parsed[key];
        if (key === 'sittingTarget') {
          headline = `Sitting breaks target changed from ${val.from} to ${val.to}`;
        } else if (key === 'walkingTarget') {
          headline = `Walking target changed from ${val.from} to ${val.to}`;
        } else if (key === 'recoveryWeights') {
          headline = `Recovery score weights updated`;
        }
      } else if (keys.length > 1) {
        headline = 'Protocol updated: multiple targets adjusted';
      }
    } catch {}

    events.push({
      id: `protocol-change-${pc.id}`,
      type: 'protocol_change',
      category: 'recovery',
      headline,
      date: changeDate,
      severity: 'neutral',
      importance: 'major',
      priority: 20, // Protocol changes are context, not primary dashboard outcomes
      timelineEligible: true,
      dashboardEligible: false,
    });
  }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  selectDashboardEvents(events: RecoveryEvent[], maxCount: number = 3): RecoveryEvent[] {
    // 1. Filter to dashboard-eligible
    const eligible = events.filter(e => e.dashboardEligible);

    return [...eligible].sort((a, b) => {
      // 1. Sort by Priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // 2. Fallback to newest first
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }).slice(0, maxCount);
  },

  selectTimelineEvents(events: RecoveryEvent[]): RecoveryEvent[] {
    // Timeline requires high recall and chronological fidelity
    return events
      .filter(e => e.timelineEligible)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};

// Consumers import this singleton, completely decoupling them from the concrete implementation
export const eventProvider: RecoveryEventProvider = RuntimeEventProvider;
