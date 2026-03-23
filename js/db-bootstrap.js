// Emergency DB bootstrap.
// If the main DB client did not initialize, use localStorage only.

(function () {
  if (window.DB) return;

  const KEYS = {
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
    { title: 'Week 1 Foundation Complete', description: 'Core foundations finished.', week_number: 1, milestone_type: 'week', points: 100, is_completed: false, completed_at: null },
    { title: 'Project 1 Shipped', description: 'First project demo ready.', week_number: 2, milestone_type: 'project', points: 300, is_completed: false, completed_at: null },
    { title: 'RAG System Ready', description: 'Retrieval pipeline built.', week_number: 4, milestone_type: 'project', points: 350, is_completed: false, completed_at: null },
    { title: 'Final Portfolio Push', description: 'Portfolio assets completed.', week_number: 8, milestone_type: 'project', points: 500, is_completed: false, completed_at: null }
  ];

  function nowIso() {
    return new Date().toISOString();
  }

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return prefix + '_' + window.crypto.randomUUID();
    }
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }

  function asNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function fmtDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function shiftDate(date, days) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }

  function read(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return JSON.parse(JSON.stringify(fallback));
      const parsed = JSON.parse(raw);
      if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : JSON.parse(JSON.stringify(fallback));
      return parsed == null ? JSON.parse(JSON.stringify(fallback)) : parsed;
    } catch (error) {
      return JSON.parse(JSON.stringify(fallback));
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('DB bootstrap storage write failed:', error);
    }
  }

  function seed() {
    const skills = read(KEYS.userSkills, []);
    if (!skills.length) {
      write(KEYS.userSkills, DEFAULT_SKILLS.map(function (item) {
        return { id: createId('skill'), skill_name: item.skill_name, skill_level: item.skill_level, updated_at: nowIso() };
      }));
    }

    const milestones = read(KEYS.milestones, []);
    if (!milestones.length) {
      write(KEYS.milestones, DEFAULT_MILESTONES.map(function (item) {
        return {
          id: createId('milestone'),
          title: item.title,
          description: item.description,
          week_number: item.week_number,
          milestone_type: item.milestone_type,
          points: item.points,
          is_completed: item.is_completed,
          completed_at: item.completed_at
        };
      }));
    }

    if (!read(KEYS.dailyLogs, []).length) write(KEYS.dailyLogs, []);
    if (!read(KEYS.rewardsLog, []).length) write(KEYS.rewardsLog, []);
    if (!read(KEYS.weeklyReports, []).length) write(KEYS.weeklyReports, []);
    if (!read(KEYS.projectSummaries, []).length) write(KEYS.projectSummaries, []);
  }

  function getLogs() {
    return read(KEYS.dailyLogs, []).sort(function (a, b) {
      return String(b.log_date || '').localeCompare(String(a.log_date || ''));
    });
  }

  function saveLogs(logs) {
    write(KEYS.dailyLogs, logs);
  }

  function getRewards() {
    return read(KEYS.rewardsLog, []).sort(function (a, b) {
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
  }

  function saveRewards(rewards) {
    write(KEYS.rewardsLog, rewards);
  }

  function getWeeklyReports() {
    return read(KEYS.weeklyReports, []).sort(function (a, b) {
      return asNumber(b.week_number) - asNumber(a.week_number);
    });
  }

  function saveWeeklyReports(reports) {
    write(KEYS.weeklyReports, reports);
  }

  function getProjectSummaries() {
    return read(KEYS.projectSummaries, []).sort(function (a, b) {
      return asNumber(b.project_number) - asNumber(a.project_number);
    });
  }

  function saveProjectSummaries(summaries) {
    write(KEYS.projectSummaries, summaries);
  }

  function getSkills() {
    return read(KEYS.userSkills, []).sort(function (a, b) {
      return String(a.skill_name || '').localeCompare(String(b.skill_name || ''));
    });
  }

  function saveSkills(skills) {
    write(KEYS.userSkills, skills);
  }

  function getMilestones() {
    return read(KEYS.milestones, []).sort(function (a, b) {
      return asNumber(a.week_number) - asNumber(b.week_number);
    });
  }

  function saveMilestones(milestones) {
    write(KEYS.milestones, milestones);
  }

  function statsFromLogs(logs) {
    const safeLogs = Array.isArray(logs) ? logs : [];
    if (!safeLogs.length) {
      return { totalDays: 0, totalHours: 0, avgHours: 0, currentStreak: 0, bestMood: 'okay', totalTasks: 0 };
    }

    const totalHours = safeLogs.reduce(function (sum, log) { return sum + asNumber(log.hours_spent); }, 0);
    const totalTasks = safeLogs.reduce(function (sum, log) { return sum + asNumber(log.tasks_completed); }, 0);
    const dates = new Set(safeLogs.map(function (log) { return String(log.log_date || ''); }));
    let streak = 0;
    let cursor = new Date();

    while (dates.has(fmtDate(cursor))) {
      streak += 1;
      cursor = shiftDate(cursor, -1);
    }

    return {
      totalDays: safeLogs.length,
      totalHours: Math.round(totalHours * 10) / 10,
      avgHours: Math.round((totalHours / safeLogs.length) * 10) / 10,
      currentStreak: streak,
      bestMood: 'okay',
      totalTasks: totalTasks
    };
  }

  seed();

  const DailyLogs = {
    async create(log) {
      const normalized = {
        id: createId('log'),
        log_date: log.date || fmtDate(new Date()),
        hours_spent: asNumber(log.hours),
        tasks_completed: asNumber(log.tasksCompleted),
        focus_area: log.focusArea || '',
        topics_learned: Array.isArray(log.topicsLearned) ? log.topicsLearned : [],
        difficulty: asNumber(log.difficulty, 3),
        mood: log.mood || 'okay',
        energy_level: asNumber(log.energyLevel, 3),
        notes: log.notes || '',
        checklist: log.checklist || {},
        streak_day: asNumber(log.streakDay),
        week_number: asNumber(log.weekNumber, 1),
        created_at: nowIso()
      };

      const logs = getLogs().filter(function (item) { return item.log_date !== normalized.log_date; });
      logs.push(normalized);
      saveLogs(logs);
      return { data: [normalized], error: null, source: 'bootstrap-local' };
    },

    async getAll() {
      return { data: getLogs(), error: null, source: 'bootstrap-local' };
    },

    async getRecent(days) {
      const since = fmtDate(shiftDate(new Date(), -(days || 14)));
      const data = getLogs().filter(function (log) { return String(log.log_date || '') >= since; }).sort(function (a, b) {
        return String(a.log_date || '').localeCompare(String(b.log_date || ''));
      });
      return { data: data, error: null, source: 'bootstrap-local' };
    },

    async getByWeek(weekNum) {
      const data = getLogs().filter(function (log) { return asNumber(log.week_number) === asNumber(weekNum); });
      return { data: data, error: null, source: 'bootstrap-local' };
    },

    async delete(id) {
      saveLogs(getLogs().filter(function (log) { return log.id !== id; }));
      return { data: null, error: null, source: 'bootstrap-local' };
    },

    async getStats() {
      return statsFromLogs(getLogs());
    }
  };

  const UserSkills = {
    async getAll() {
      return { data: getSkills(), error: null, source: 'bootstrap-local' };
    },

    async update(id, level) {
      const next = getSkills().map(function (skill) {
        return skill.id === id ? { ...skill, skill_level: asNumber(level), updated_at: nowIso() } : skill;
      });
      saveSkills(next);
      return { data: next.filter(function (skill) { return skill.id === id; }), error: null, source: 'bootstrap-local' };
    },

    async updateByName(name, level) {
      const next = getSkills().map(function (skill) {
        return skill.skill_name === name ? { ...skill, skill_level: asNumber(level), updated_at: nowIso() } : skill;
      });
      saveSkills(next);
      return { data: next.filter(function (skill) { return skill.skill_name === name; }), error: null, source: 'bootstrap-local' };
    }
  };

  const Milestones = {
    async getAll() {
      return { data: getMilestones(), error: null, source: 'bootstrap-local' };
    },

    async complete(id) {
      const next = getMilestones().map(function (item) {
        return item.id === id ? { ...item, is_completed: true, completed_at: nowIso() } : item;
      });
      saveMilestones(next);
      return { data: next.filter(function (item) { return item.id === id; }), error: null, source: 'bootstrap-local' };
    },

    async getByWeek(weekNum) {
      return { data: getMilestones().filter(function (item) { return asNumber(item.week_number) === asNumber(weekNum); }), error: null, source: 'bootstrap-local' };
    }
  };

  const RewardsLog = {
    async create(entry) {
      const item = {
        id: createId('reward'),
        log_type: entry.log_type || entry.type || 'reward',
        title: entry.title || 'Untitled',
        description: entry.description || '',
        triggered_by: entry.triggered_by || entry.triggeredBy || '',
        points: asNumber(entry.points),
        created_at: nowIso()
      };
      const rewards = getRewards();
      rewards.push(item);
      saveRewards(rewards);
      return { data: [item], error: null, source: 'bootstrap-local' };
    },

    async getAll() {
      return { data: getRewards(), error: null, source: 'bootstrap-local' };
    },

    async getRecent(limit) {
      return { data: getRewards().slice(0, limit || 10), error: null, source: 'bootstrap-local' };
    }
  };

  const WeeklyReports = {
    async upsert(entry) {
      const item = {
        id: entry.id || createId('weekly_report'),
        week_number: asNumber(entry.week_number || entry.weekNumber, 1),
        title: entry.title || ('Weekly Review - Week ' + asNumber(entry.week_number || entry.weekNumber, 1)),
        summary_text: entry.summary_text || entry.summaryText || '',
        checklist: entry.checklist || {},
        points_awarded: asNumber(entry.points_awarded || entry.pointsAwarded),
        created_at: entry.created_at || nowIso(),
        updated_at: nowIso()
      };
      const next = getWeeklyReports().filter(function (report) {
        return asNumber(report.week_number) !== item.week_number;
      });
      next.push(item);
      saveWeeklyReports(next);
      return { data: [item], error: null, source: 'bootstrap-local' };
    },

    async getAll() {
      return { data: getWeeklyReports(), error: null, source: 'bootstrap-local' };
    }
  };

  const ProjectSummaries = {
    async upsert(entry) {
      const item = {
        id: entry.id || createId('project_summary'),
        project_number: asNumber(entry.project_number || entry.projectNumber, 1),
        title: entry.title || ('Project ' + asNumber(entry.project_number || entry.projectNumber, 1) + ' Summary'),
        project_name: entry.project_name || entry.projectName || '',
        summary_text: entry.summary_text || entry.summaryText || '',
        checklist: entry.checklist || {},
        points_awarded: asNumber(entry.points_awarded || entry.pointsAwarded),
        created_at: entry.created_at || nowIso(),
        updated_at: nowIso()
      };
      const next = getProjectSummaries().filter(function (summary) {
        return asNumber(summary.project_number) !== item.project_number;
      });
      next.push(item);
      saveProjectSummaries(next);
      return { data: [item], error: null, source: 'bootstrap-local' };
    },

    async getAll() {
      return { data: getProjectSummaries(), error: null, source: 'bootstrap-local' };
    }
  };

  const RewardEngine = {
    rules: {
      rewards: [
        { trigger: 'streak_3', title: '3-Day Streak!', desc: 'Consistent for 3 days straight', points: 50 },
        { trigger: 'streak_7', title: 'Weekly Warrior!', desc: '7 days without missing', points: 150 },
        { trigger: 'streak_14', title: 'Two-Week Titan!', desc: '14 days of pure discipline', points: 300 },
        { trigger: 'hours_6plus', title: 'Deep Worker', desc: '6+ hours in a single day', points: 30 }
      ],
      punishments: [
        { trigger: 'low_hours', title: 'Slacking Alert', desc: 'Less than 2 hours studied', points: -20 }
      ]
    },

    async evaluate(logData, stats) {
      const triggered = [];
      const hours = asNumber(logData.hours);

      if (stats.currentStreak >= 3 && stats.currentStreak < 7) triggered.push({ ...this.rules.rewards[0], type: 'reward' });
      if (stats.currentStreak >= 7 && stats.currentStreak < 14) triggered.push({ ...this.rules.rewards[1], type: 'reward' });
      if (stats.currentStreak >= 14) triggered.push({ ...this.rules.rewards[2], type: 'reward' });
      if (hours >= 6) triggered.push({ ...this.rules.rewards[3], type: 'reward' });
      if (hours < 2 && hours > 0) triggered.push({ ...this.rules.punishments[0], type: 'punishment' });

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

  window.DB = {
    DailyLogs: DailyLogs,
    UserSkills: UserSkills,
    Milestones: Milestones,
    RewardsLog: RewardsLog,
    WeeklyReports: WeeklyReports,
    ProjectSummaries: ProjectSummaries,
    RewardEngine: RewardEngine,
    supabase: null,
    getStatus: function () {
      return { mode: 'bootstrap-local', reason: 'Main DB client was unavailable' };
    }
  };
})();
