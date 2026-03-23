// ============================================
// SUPABASE CLIENT - AI/ML Tracker
// Uses Supabase when available and falls back
// to localStorage when the remote DB fails.
// ============================================

const SUPABASE_URL = 'https://keqxbgccsgnoosxldtns.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcXhiZ2Njc2dub29zeGxkdG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzgzMTksImV4cCI6MjA4OTc1NDMxOX0.6NPjCev_ceX97McfzJXt3WUnJPYQpOoB5U4zTIOjAM4';

const STORAGE_KEYS = {
  dailyLogs: 'tracker_daily_logs',
  userSkills: 'tracker_user_skills',
  milestones: 'tracker_milestones',
  rewardsLog: 'tracker_rewards_log',
  weeklyReports: 'tracker_weekly_reports',
  projectSummaries: 'tracker_project_summaries'
};

const DEFAULT_SKILLS = [
  { skill_name: 'Python', skill_level: 35 },
  { skill_name: 'PyTorch', skill_level: 20 },
  { skill_name: 'Computer Vision', skill_level: 25 },
  { skill_name: 'NLP / Transformers', skill_level: 18 },
  { skill_name: 'RAG / Vector DB', skill_level: 15 },
  { skill_name: 'MLOps / Deploy', skill_level: 12 }
];

const DEFAULT_MILESTONES = [
  { title: 'Week 1 Foundation Complete', description: 'Python, NumPy, pandas, sklearn basics locked in.', week_number: 1, milestone_type: 'week', points: 100 },
  { title: 'Week 2 Deep Learning Core', description: 'PyTorch fundamentals and training loops complete.', week_number: 2, milestone_type: 'week', points: 120 },
  { title: 'Project 1 Shipped', description: 'First portfolio project demo is ready.', week_number: 2, milestone_type: 'project', points: 300 },
  { title: 'Week 4 RAG System Ready', description: 'Retrieval pipeline and vector DB flow completed.', week_number: 4, milestone_type: 'project', points: 350 },
  { title: 'Week 6 MLOps Stack Ready', description: 'Monitoring, CI/CD, and deployment pieces are in place.', week_number: 6, milestone_type: 'project', points: 400 },
  { title: 'Week 8 Final Portfolio Push', description: 'AI agent, demos, and presentation assets are complete.', week_number: 8, milestone_type: 'project', points: 500 }
];

const dbState = {
  mode: 'initializing',
  reason: ''
};

function setDbMode(mode, reason = '') {
  dbState.mode = mode;
  dbState.reason = reason;
}

function createId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftLocalDate(baseDate, deltaDays) {
  const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  date.setDate(date.getDate() + deltaDays);
  return date;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function compareDateDesc(a, b) {
  return String(b.log_date || '').localeCompare(String(a.log_date || ''));
}

function compareDateAsc(a, b) {
  return String(a.log_date || '').localeCompare(String(b.log_date || ''));
}

function compareCreatedDesc(a, b) {
  return String(b.created_at || '').localeCompare(String(a.created_at || ''));
}

function compareWeekAsc(a, b) {
  return asNumber(a.week_number) - asNumber(b.week_number);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return clone(fallback);
    const parsed = JSON.parse(raw);

    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : clone(fallback);
    }

    if (fallback && typeof fallback === 'object') {
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : clone(fallback);
    }

    return parsed == null ? clone(fallback) : parsed;
  } catch (error) {
    console.warn(`Storage read failed for ${key}:`, error);
    return clone(fallback);
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Storage write failed for ${key}:`, error);
  }
}

function seedSkills() {
  const existing = readStorage(STORAGE_KEYS.userSkills, []);
  if (existing.length) return existing;

  const seeded = DEFAULT_SKILLS.map(skill => ({
    id: createId('skill'),
    skill_name: skill.skill_name,
    skill_level: skill.skill_level,
    updated_at: nowIso()
  }));

  writeStorage(STORAGE_KEYS.userSkills, seeded);
  return seeded;
}

function seedMilestones() {
  const existing = readStorage(STORAGE_KEYS.milestones, []);
  if (existing.length) return existing;

  const seeded = DEFAULT_MILESTONES.map(milestone => ({
    id: createId('milestone'),
    title: milestone.title,
    description: milestone.description,
    week_number: milestone.week_number,
    milestone_type: milestone.milestone_type,
    points: milestone.points,
    is_completed: false,
    completed_at: null
  }));

  writeStorage(STORAGE_KEYS.milestones, seeded);
  return seeded;
}

function ensureLocalSeedData() {
  seedSkills();
  seedMilestones();
  if (!readStorage(STORAGE_KEYS.dailyLogs, []).length) {
    writeStorage(STORAGE_KEYS.dailyLogs, []);
  }
  if (!readStorage(STORAGE_KEYS.rewardsLog, []).length) {
    writeStorage(STORAGE_KEYS.rewardsLog, []);
  }
  if (!readStorage(STORAGE_KEYS.weeklyReports, []).length) {
    writeStorage(STORAGE_KEYS.weeklyReports, []);
  }
  if (!readStorage(STORAGE_KEYS.projectSummaries, []).length) {
    writeStorage(STORAGE_KEYS.projectSummaries, []);
  }
}

ensureLocalSeedData();

let supabase = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    setDbMode('remote', 'Supabase client initialized');
  } catch (error) {
    console.warn('Supabase init failed, falling back to local storage:', error);
    setDbMode('fallback', 'Supabase client initialization failed');
  }
} else {
  setDbMode('fallback', 'Supabase SDK unavailable');
}

async function withFallback(remoteAction, fallbackAction, fallbackReason) {
  if (dbState.mode === 'fallback') {
    return fallbackAction();
  }

  if (supabase) {
    try {
      const result = await remoteAction();
      if (!result?.error) {
        setDbMode('remote', 'Supabase connected');
        return { ...result, source: 'remote' };
      }

      console.warn('Supabase request failed, using local fallback:', result.error);
    } catch (error) {
      console.warn('Supabase request threw, using local fallback:', error);
    }
  }

  setDbMode('fallback', fallbackReason);
  return fallbackAction();
}

const LocalDB = {
  getDailyLogs() {
    return safeArray(readStorage(STORAGE_KEYS.dailyLogs, [])).sort(compareDateDesc);
  },

  saveDailyLogs(logs) {
    writeStorage(STORAGE_KEYS.dailyLogs, logs);
  },

  getSkills() {
    return safeArray(readStorage(STORAGE_KEYS.userSkills, seedSkills())).sort((a, b) =>
      String(a.skill_name || '').localeCompare(String(b.skill_name || ''))
    );
  },

  saveSkills(skills) {
    writeStorage(STORAGE_KEYS.userSkills, skills);
  },

  getMilestones() {
    return safeArray(readStorage(STORAGE_KEYS.milestones, seedMilestones())).sort(compareWeekAsc);
  },

  saveMilestones(milestones) {
    writeStorage(STORAGE_KEYS.milestones, milestones);
  },

  getRewards() {
    return safeArray(readStorage(STORAGE_KEYS.rewardsLog, [])).sort(compareCreatedDesc);
  },

  saveRewards(rewards) {
    writeStorage(STORAGE_KEYS.rewardsLog, rewards);
  },

  getWeeklyReports() {
    return safeArray(readStorage(STORAGE_KEYS.weeklyReports, [])).sort((a, b) =>
      asNumber(b.week_number) - asNumber(a.week_number)
    );
  },

  saveWeeklyReports(reports) {
    writeStorage(STORAGE_KEYS.weeklyReports, reports);
  },

  getProjectSummaries() {
    return safeArray(readStorage(STORAGE_KEYS.projectSummaries, [])).sort((a, b) =>
      asNumber(b.project_number) - asNumber(a.project_number)
    );
  },

  saveProjectSummaries(summaries) {
    writeStorage(STORAGE_KEYS.projectSummaries, summaries);
  }
};

function normalizeLog(log) {
  return {
    id: log.id || createId('log'),
    log_date: log.date || log.log_date || formatLocalDate(),
    hours_spent: asNumber(log.hours_spent ?? log.hours),
    tasks_completed: asNumber(log.tasks_completed ?? log.tasksCompleted),
    focus_area: log.focus_area || log.focusArea || '',
    topics_learned: safeArray(log.topics_learned || log.topicsLearned),
    difficulty: asNumber(log.difficulty, 3),
    mood: log.mood || 'okay',
    energy_level: asNumber(log.energy_level ?? log.energyLevel, 3),
    notes: log.notes || '',
    checklist: log.checklist || {},
    streak_day: asNumber(log.streak_day ?? log.streakDay),
    week_number: asNumber(log.week_number ?? log.weekNumber, 1),
    created_at: log.created_at || nowIso()
  };
}

function normalizeReward(entry) {
  return {
    id: entry.id || createId('reward'),
    log_type: entry.log_type || entry.type || 'reward',
    title: entry.title || 'Untitled',
    description: entry.description || '',
    triggered_by: entry.triggered_by || entry.triggeredBy || '',
    points: asNumber(entry.points),
    created_at: entry.created_at || nowIso()
  };
}

function normalizeWeeklyReport(entry) {
  return {
    id: entry.id || createId('weekly_report'),
    week_number: asNumber(entry.week_number ?? entry.weekNumber, 1),
    title: entry.title || `Weekly Review - Week ${asNumber(entry.week_number ?? entry.weekNumber, 1)}`,
    summary_text: entry.summary_text || entry.summaryText || '',
    checklist: entry.checklist || {},
    points_awarded: asNumber(entry.points_awarded ?? entry.pointsAwarded),
    created_at: entry.created_at || nowIso(),
    updated_at: nowIso()
  };
}

function normalizeProjectSummary(entry) {
  return {
    id: entry.id || createId('project_summary'),
    project_number: asNumber(entry.project_number ?? entry.projectNumber, 1),
    title: entry.title || `Project ${asNumber(entry.project_number ?? entry.projectNumber, 1)} Summary`,
    project_name: entry.project_name || entry.projectName || '',
    summary_text: entry.summary_text || entry.summaryText || '',
    checklist: entry.checklist || {},
    points_awarded: asNumber(entry.points_awarded ?? entry.pointsAwarded),
    created_at: entry.created_at || nowIso(),
    updated_at: nowIso()
  };
}

function computeCurrentStreak(logs) {
  const dates = new Set(safeArray(logs).map(log => String(log.log_date || '')));
  let streak = 0;
  let cursor = new Date();

  while (dates.has(formatLocalDate(cursor))) {
    streak += 1;
    cursor = shiftLocalDate(cursor, -1);
  }

  return streak;
}

function getStatsFromLogs(logs) {
  const safeLogs = safeArray(logs);
  if (!safeLogs.length) {
    return {
      totalDays: 0,
      totalHours: 0,
      avgHours: 0,
      currentStreak: 0,
      bestMood: 'okay',
      totalTasks: 0
    };
  }

  const totalDays = safeLogs.length;
  const totalHours = safeLogs.reduce((sum, log) => sum + asNumber(log.hours_spent), 0);
  const totalTasks = safeLogs.reduce((sum, log) => sum + asNumber(log.tasks_completed), 0);
  const moodCounts = {};

  safeLogs.forEach(log => {
    const mood = log.mood || 'okay';
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });

  const bestMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'okay';

  return {
    totalDays,
    totalHours: Math.round(totalHours * 10) / 10,
    avgHours: Math.round((totalHours / totalDays) * 10) / 10,
    currentStreak: computeCurrentStreak(safeLogs),
    bestMood,
    totalTasks
  };
}

const DailyLogs = {
  async create(log) {
    const normalized = normalizeLog(log);

    return withFallback(
      async () => supabase.from('daily_logs').insert([{
        log_date: normalized.log_date,
        hours_spent: normalized.hours_spent,
        tasks_completed: normalized.tasks_completed,
        focus_area: normalized.focus_area,
        topics_learned: normalized.topics_learned,
        difficulty: normalized.difficulty,
        mood: normalized.mood,
        energy_level: normalized.energy_level,
        notes: normalized.notes,
        checklist: normalized.checklist,
        streak_day: normalized.streak_day,
        week_number: normalized.week_number
      }]).select(),
      async () => {
        const logs = LocalDB.getDailyLogs().filter(item => item.log_date !== normalized.log_date);
        logs.push(normalized);
        LocalDB.saveDailyLogs(logs.sort(compareDateDesc));
        return { data: [normalized], error: null, source: 'local' };
      },
      'Daily log create fallback'
    );
  },

  async getAll() {
    return withFallback(
      async () => supabase.from('daily_logs').select('*').order('log_date', { ascending: false }),
      async () => ({ data: LocalDB.getDailyLogs(), error: null, source: 'local' }),
      'Daily logs read fallback'
    );
  },

  async getRecent(days = 14) {
    const since = formatLocalDate(shiftLocalDate(new Date(), -days));

    return withFallback(
      async () => supabase.from('daily_logs').select('*').gte('log_date', since).order('log_date', { ascending: true }),
      async () => {
        const data = LocalDB.getDailyLogs()
          .filter(log => String(log.log_date || '') >= since)
          .sort(compareDateAsc);
        return { data, error: null, source: 'local' };
      },
      'Recent daily logs fallback'
    );
  },

  async getByWeek(weekNum) {
    return withFallback(
      async () => supabase.from('daily_logs').select('*').eq('week_number', weekNum).order('log_date', { ascending: true }),
      async () => {
        const data = LocalDB.getDailyLogs()
          .filter(log => asNumber(log.week_number) === asNumber(weekNum))
          .sort(compareDateAsc);
        return { data, error: null, source: 'local' };
      },
      'Daily logs by week fallback'
    );
  },

  async delete(id) {
    return withFallback(
      async () => supabase.from('daily_logs').delete().eq('id', id),
      async () => {
        const nextLogs = LocalDB.getDailyLogs().filter(log => log.id !== id);
        LocalDB.saveDailyLogs(nextLogs);
        return { data: null, error: null, source: 'local' };
      },
      'Daily log delete fallback'
    );
  },

  async getStats() {
    const { data } = await this.getAll();
    return getStatsFromLogs(data);
  }
};

const UserSkills = {
  async getAll() {
    return withFallback(
      async () => supabase.from('user_skills').select('*').order('skill_name'),
      async () => ({ data: LocalDB.getSkills(), error: null, source: 'local' }),
      'Skills read fallback'
    );
  },

  async update(id, level) {
    return withFallback(
      async () => supabase.from('user_skills').update({ skill_level: level, updated_at: nowIso() }).eq('id', id).select(),
      async () => {
        const nextSkills = LocalDB.getSkills().map(skill =>
          skill.id === id ? { ...skill, skill_level: asNumber(level), updated_at: nowIso() } : skill
        );
        LocalDB.saveSkills(nextSkills);
        return { data: nextSkills.filter(skill => skill.id === id), error: null, source: 'local' };
      },
      'Skills update fallback'
    );
  },

  async updateByName(name, level) {
    return withFallback(
      async () => supabase.from('user_skills').update({ skill_level: level, updated_at: nowIso() }).eq('skill_name', name).select(),
      async () => {
        const nextSkills = LocalDB.getSkills().map(skill =>
          skill.skill_name === name ? { ...skill, skill_level: asNumber(level), updated_at: nowIso() } : skill
        );
        LocalDB.saveSkills(nextSkills);
        return { data: nextSkills.filter(skill => skill.skill_name === name), error: null, source: 'local' };
      },
      'Skills update-by-name fallback'
    );
  }
};

const Milestones = {
  async getAll() {
    return withFallback(
      async () => supabase.from('milestones').select('*').order('week_number', { ascending: true }),
      async () => ({ data: LocalDB.getMilestones(), error: null, source: 'local' }),
      'Milestones read fallback'
    );
  },

  async complete(id) {
    return withFallback(
      async () => supabase.from('milestones').update({ is_completed: true, completed_at: nowIso() }).eq('id', id).select(),
      async () => {
        const nextMilestones = LocalDB.getMilestones().map(item =>
          item.id === id ? { ...item, is_completed: true, completed_at: nowIso() } : item
        );
        LocalDB.saveMilestones(nextMilestones);
        return { data: nextMilestones.filter(item => item.id === id), error: null, source: 'local' };
      },
      'Milestone complete fallback'
    );
  },

  async getByWeek(weekNum) {
    return withFallback(
      async () => supabase.from('milestones').select('*').eq('week_number', weekNum),
      async () => {
        const data = LocalDB.getMilestones().filter(item => asNumber(item.week_number) === asNumber(weekNum));
        return { data, error: null, source: 'local' };
      },
      'Milestones by week fallback'
    );
  }
};

const RewardsLog = {
  async create(entry) {
    const normalized = normalizeReward(entry);

    return withFallback(
      async () => supabase.from('rewards_log').insert([{
        log_type: normalized.log_type,
        title: normalized.title,
        description: normalized.description,
        triggered_by: normalized.triggered_by,
        points: normalized.points
      }]).select(),
      async () => {
        const rewards = LocalDB.getRewards();
        rewards.push(normalized);
        LocalDB.saveRewards(rewards.sort(compareCreatedDesc));
        return { data: [normalized], error: null, source: 'local' };
      },
      'Rewards create fallback'
    );
  },

  async getAll() {
    return withFallback(
      async () => supabase.from('rewards_log').select('*').order('created_at', { ascending: false }),
      async () => ({ data: LocalDB.getRewards(), error: null, source: 'local' }),
      'Rewards read fallback'
    );
  },

  async getRecent(limit = 10) {
    return withFallback(
      async () => supabase.from('rewards_log').select('*').order('created_at', { ascending: false }).limit(limit),
      async () => ({ data: LocalDB.getRewards().slice(0, limit), error: null, source: 'local' }),
      'Recent rewards fallback'
    );
  }
};

const WeeklyReports = {
  async upsert(entry) {
    const normalized = normalizeWeeklyReport(entry);

    return withFallback(
      async () => supabase.from('weekly_reports').upsert([{
        id: normalized.id,
        week_number: normalized.week_number,
        title: normalized.title,
        summary_text: normalized.summary_text,
        checklist: normalized.checklist,
        points_awarded: normalized.points_awarded,
        updated_at: normalized.updated_at
      }], { onConflict: 'week_number' }).select(),
      async () => {
        const reports = LocalDB.getWeeklyReports().filter(item => asNumber(item.week_number) !== normalized.week_number);
        reports.push(normalized);
        LocalDB.saveWeeklyReports(reports);
        return { data: [normalized], error: null, source: 'local' };
      },
      'Weekly reports upsert fallback'
    );
  },

  async getAll() {
    return withFallback(
      async () => supabase.from('weekly_reports').select('*').order('week_number', { ascending: false }),
      async () => ({ data: LocalDB.getWeeklyReports(), error: null, source: 'local' }),
      'Weekly reports read fallback'
    );
  }
};

const ProjectSummaries = {
  async upsert(entry) {
    const normalized = normalizeProjectSummary(entry);

    return withFallback(
      async () => supabase.from('project_summaries').upsert([{
        id: normalized.id,
        project_number: normalized.project_number,
        title: normalized.title,
        project_name: normalized.project_name,
        summary_text: normalized.summary_text,
        checklist: normalized.checklist,
        points_awarded: normalized.points_awarded,
        updated_at: normalized.updated_at
      }], { onConflict: 'project_number' }).select(),
      async () => {
        const summaries = LocalDB.getProjectSummaries().filter(item => asNumber(item.project_number) !== normalized.project_number);
        summaries.push(normalized);
        LocalDB.saveProjectSummaries(summaries);
        return { data: [normalized], error: null, source: 'local' };
      },
      'Project summaries upsert fallback'
    );
  },

  async getAll() {
    return withFallback(
      async () => supabase.from('project_summaries').select('*').order('project_number', { ascending: false }),
      async () => ({ data: LocalDB.getProjectSummaries(), error: null, source: 'local' }),
      'Project summaries read fallback'
    );
  }
};

const RewardEngine = {
  rules: {
    rewards: [
      { trigger: 'streak_3', title: '3-Day Streak!', desc: 'Consistent for 3 days straight', points: 50 },
      { trigger: 'streak_7', title: 'Weekly Warrior!', desc: '7 days without missing', points: 150 },
      { trigger: 'streak_14', title: 'Two-Week Titan!', desc: '14 days of pure discipline', points: 300 },
      { trigger: 'hours_6plus', title: 'Deep Worker', desc: '6+ hours in a single day', points: 30 },
      { trigger: 'all_tasks', title: 'Task Crusher', desc: 'Completed all daily tasks', points: 40 },
      { trigger: 'project_done', title: 'Project Shipped!', desc: 'Completed a portfolio project', points: 500 },
      { trigger: 'week_done', title: 'Week Conquered', desc: 'Finished all weekly tasks', points: 200 }
    ],
    punishments: [
      { trigger: 'missed_day', title: 'Streak Broken', desc: 'Missed a study day', points: -50 },
      { trigger: 'low_hours', title: 'Slacking Alert', desc: 'Less than 2 hours studied', points: -20 },
      { trigger: 'no_report', title: 'Ghost Mode', desc: 'Did not submit daily report', points: -30 },
      { trigger: 'skip_week', title: 'Week Wasted', desc: 'Skipped more than 2 days in a week', points: -100 }
    ]
  },

  async evaluate(logData, stats) {
    const triggered = [];
    const hours = asNumber(logData.hours);

    if (stats.currentStreak >= 3 && stats.currentStreak < 7) {
      triggered.push({ ...this.rules.rewards[0], type: 'reward' });
    }
    if (stats.currentStreak >= 7 && stats.currentStreak < 14) {
      triggered.push({ ...this.rules.rewards[1], type: 'reward' });
    }
    if (stats.currentStreak >= 14) {
      triggered.push({ ...this.rules.rewards[2], type: 'reward' });
    }
    if (hours >= 6) {
      triggered.push({ ...this.rules.rewards[3], type: 'reward' });
    }
    if (hours < 2 && hours > 0) {
      triggered.push({ ...this.rules.punishments[1], type: 'punishment' });
    }

    for (const item of triggered) {
      await RewardsLog.create({
        type: item.type,
        title: item.title,
        description: item.desc,
        triggeredBy: item.trigger,
        points: item.points
      });
    }

    return triggered;
  }
};

const DB = {
  DailyLogs,
  UserSkills,
  Milestones,
  RewardsLog,
  WeeklyReports,
  ProjectSummaries,
  RewardEngine,
  supabase,
  getStatus() {
    return { ...dbState };
  }
};

window.DB = DB;
