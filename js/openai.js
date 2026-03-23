// ============================================
// AI MENTOR CLIENT
// Works with OpenAI when a key is configured,
// and falls back to a built-in mentor locally.
// ============================================

const OPENAI_MODEL = (window.OPENAI_CONFIG && window.OPENAI_CONFIG.model) || 'gpt-4.1-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY_STORAGE = 'openai_api_key';

// ── Daily request limit ──────────────────────────────────────────────────────
const DAILY_LIMIT = 8;
const DAILY_COUNT_KEY = 'ai_daily_count';

function getDailyCount() {
  try {
    const raw = JSON.parse(localStorage.getItem(DAILY_COUNT_KEY) || '{}');
    const today = new Date().toISOString().split('T')[0];
    return raw.date === today ? (raw.count || 0) : 0;
  } catch (e) { return 0; }
}

function incrementDailyCount() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const count = getDailyCount() + 1;
    localStorage.setItem(DAILY_COUNT_KEY, JSON.stringify({ date: today, count }));
    return count;
  } catch (e) { return 0; }
}

function isLimitReached() {
  return getDailyCount() >= DAILY_LIMIT;
}

function getLimitMessage() {
  const count = getDailyCount();
  return `Daily AI limit reached (${count}/${DAILY_LIMIT} requests used today). Come back tomorrow — limits reset at midnight. Keep working on your projects in the meantime! 💪`;
}

function getRemainingRequests() {
  return Math.max(0, DAILY_LIMIT - getDailyCount());
}

const SYSTEM_PROMPT = `You are an AI learning coach for Shahriyor, a final-year student building an AI/ML portfolio under time pressure.

Rules:
- Reply in English
- Be concise, warm, practical, and easy to understand
- Use actual performance context when provided
- Use roadmap and project data directly when it is available
- If the user asks about a week, roadmap item, or finished project, answer with the exact roadmap details first
- Distinguish between confirmed tracker evidence and schedule-based roadmap expectations
- If the user seems confused about timing, mention the exact week number and calendar dates
- Give generalized feedback when needed, not just roadmap-specific comments
- Identify patterns, tradeoffs, blind spots, and the next best move
- Encourage discipline, focus, and execution without sounding harsh
- For greetings or casual messages, reply like a friendly helpful assistant first
- Keep reports short, structured, and useful`;

const MISSION_START_DATE = '2026-03-22T00:00:00';

const ROADMAP_WEEKS = [
  {
    number: 1,
    title: 'PyTorch + CNN + CV Foundations',
    topics: [
      'PyTorch deep dive (autograd, tensors)',
      'CNN architecture (ResNet, EfficientNet)',
      'Transfer learning practice',
      'OpenCV and image preprocessing'
    ],
    projectNumber: 1,
    projectAction: 'Project 1 starts'
  },
  {
    number: 2,
    title: 'Object Detection + Anomaly + Project 1',
    topics: [
      'YOLOv8 real-time detection',
      'Segmentation basics',
      'Anomaly detection and classical ML',
      'FastAPI model serving'
    ],
    projectNumber: 1,
    projectAction: 'Project 1 deadline'
  },
  {
    number: 3,
    title: 'Embeddings + Vector DBs + LLMs',
    topics: [
      'Word2Vec to BERT to CLIP',
      'Vector databases: Chroma and Qdrant',
      'LLM architecture: GPT and LLaMA',
      'Advanced prompt engineering'
    ],
    projectNumber: 2,
    projectAction: 'Project 2 starts'
  },
  {
    number: 4,
    title: 'RAG + Fine-tuning + Cost Math',
    topics: [
      'RAG pipeline: chunking and reranking',
      'LoRA fine-tuning',
      'Multimodal RAG with images and text',
      'Token cost calculation'
    ],
    projectNumber: 2,
    projectAction: 'Project 2 deadline'
  },
  {
    number: 5,
    title: 'MLOps Stack - Experiment + Tracking',
    topics: [
      'Docker and Docker Compose',
      'MLflow and Weights & Biases',
      'DVC data versioning',
      'Model registry and versioning'
    ],
    projectNumber: 3,
    projectAction: 'Project 3 starts'
  },
  {
    number: 6,
    title: 'System Design + Monitoring + Project 3',
    topics: [
      'System design: caching, routing, load balancing',
      'Prometheus and Grafana monitoring',
      'Model drift detection',
      'CI/CD for ML with GitHub Actions'
    ],
    projectNumber: 3,
    projectAction: 'Project 3 deadline'
  },
  {
    number: 7,
    title: 'AI Agent + Advanced Production',
    topics: [
      'Model quantization',
      'A/B testing frameworks',
      'Cost optimization strategies',
      'Security for ML systems'
    ],
    projectNumber: 4,
    projectAction: 'Project 4 starts'
  },
  {
    number: 8,
    title: 'Portfolio + Interview + Applications',
    topics: [
      'GitHub portfolio optimization',
      'Technical interview prep',
      'LinkedIn and AI/ML resume',
      'Mock interviews and presentation'
    ],
    projectNumber: 4,
    projectAction: 'Project 4 deadline and demo day'
  }
];

const ROADMAP_PROJECTS = [
  {
    number: 1,
    name: 'AIAS / AttendIQ',
    aliases: ['AttendIQ', 'Project 1'],
    startWeek: 1,
    deadlineWeek: 2,
    summary: 'Body-based smart attendance system with YOLOv8, ByteTrack, and OSNet Re-ID.'
  },
  {
    number: 2,
    name: 'VisionRAG',
    aliases: ['Project 2'],
    startWeek: 3,
    deadlineWeek: 4,
    summary: 'Multimodal RAG app using CLIP embeddings, Qdrant, and an LLM.'
  },
  {
    number: 3,
    name: 'MLPulse',
    aliases: ['Project 3'],
    startWeek: 5,
    deadlineWeek: 6,
    summary: 'Production ML system with serving, MLflow, monitoring, CI/CD, and drift detection.'
  },
  {
    number: 4,
    name: 'NeuralNexus',
    aliases: ['Project 4', 'NeuralNexus Dashboard'],
    startWeek: 7,
    deadlineWeek: 8,
    summary: 'Autonomous AI agent with tools, streaming chat UI, memory, and cost tracking.'
  }
];

function getMissionStartDate() {
  const date = new Date(MISSION_START_DATE);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatRoadmapDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getWeekDateRange(weekNumber) {
  const safeWeek = Math.min(8, Math.max(1, Number(weekNumber) || 1));
  const start = getMissionStartDate();
  start.setDate(start.getDate() + ((safeWeek - 1) * 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function getCurrentRoadmapWeek(now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - getMissionStartDate()) / 86400000);
  return Math.min(8, Math.max(1, Math.floor(diffDays / 7) + 1));
}

function getRoadmapProject(projectNumber) {
  return ROADMAP_PROJECTS.find(project => project.number === Number(projectNumber)) || null;
}

function getCurrentRoadmapProject(currentWeek = getCurrentRoadmapWeek()) {
  if (currentWeek <= 2) return getRoadmapProject(1);
  if (currentWeek <= 4) return getRoadmapProject(2);
  if (currentWeek <= 6) return getRoadmapProject(3);
  return getRoadmapProject(4);
}

function getRoadmapSnapshot() {
  const currentWeek = getCurrentRoadmapWeek();
  const currentProject = getCurrentRoadmapProject(currentWeek);
  const currentRange = getWeekDateRange(currentWeek);

  return {
    today: formatRoadmapDate(new Date()),
    missionStart: formatRoadmapDate(getMissionStartDate()),
    currentWeek,
    currentWeekRange: `${formatRoadmapDate(currentRange.start)} - ${formatRoadmapDate(currentRange.end)}`,
    currentProjectNumber: currentProject?.number || null,
    currentProjectName: currentProject?.name || null,
    weeks: ROADMAP_WEEKS.map(week => {
      const range = getWeekDateRange(week.number);
      return {
        number: week.number,
        title: week.title,
        topics: week.topics,
        projectNumber: week.projectNumber,
        projectAction: week.projectAction,
        dateRange: `${formatRoadmapDate(range.start)} - ${formatRoadmapDate(range.end)}`
      };
    }),
    projects: ROADMAP_PROJECTS.map(project => ({
      number: project.number,
      name: project.name,
      aliases: project.aliases,
      summary: project.summary,
      startWeek: project.startWeek,
      deadlineWeek: project.deadlineWeek,
      startDate: formatRoadmapDate(getWeekDateRange(project.startWeek).start),
      deadlineDate: formatRoadmapDate(getWeekDateRange(project.deadlineWeek).end)
    }))
  };
}

function enrichContextData(contextData) {
  const base = contextData && typeof contextData === 'object' ? contextData : {};
  return {
    ...base,
    roadmap: base.roadmap || getRoadmapSnapshot()
  };
}

function readStoredApiKey() {
  try {
    return (window.localStorage.getItem(OPENAI_API_KEY_STORAGE) || '').trim();
  } catch (error) {
    return '';
  }
}

function getApiKey() {
  const configured =
    (window.OPENAI_CONFIG && window.OPENAI_CONFIG.apiKey) ||
    document.querySelector('meta[name="openai-api-key"]')?.content ||
    readStoredApiKey();

  return (configured || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(numbers) {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function getStatsFromLogs(logs) {
  const safeLogs = asArray(logs);
  const totalDays = safeLogs.length;
  const totalHours = safeLogs.reduce((sum, log) => sum + asNumber(log.hours_spent || log.hours), 0);
  const totalTasks = safeLogs.reduce((sum, log) => sum + asNumber(log.tasks_completed || log.tasksCompleted), 0);
  const moods = safeLogs.map(log => log.mood).filter(Boolean);
  const moodCounts = moods.reduce((acc, mood) => {
    acc[mood] = (acc[mood] || 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'okay';

  return {
    totalDays,
    totalHours: round1(totalHours),
    avgHours: totalDays ? round1(totalHours / totalDays) : 0,
    totalTasks,
    bestMood: topMood
  };
}

function getLowestSkills(skills, limit = 3) {
  return asArray(skills)
    .map(skill => ({
      name: skill.skill_name || skill.name || 'Unknown',
      level: asNumber(skill.skill_level || skill.level)
    }))
    .sort((a, b) => a.level - b.level)
    .slice(0, limit);
}

function getHighestSkills(skills, limit = 3) {
  return asArray(skills)
    .map(skill => ({
      name: skill.skill_name || skill.name || 'Unknown',
      level: asNumber(skill.skill_level || skill.level)
    }))
    .sort((a, b) => b.level - a.level)
    .slice(0, limit);
}

function getRecentFocusAreas(logs, limit = 3) {
  const counts = {};
  asArray(logs).forEach(log => {
    const focus = (log.focus_area || log.focusArea || '').trim();
    if (focus) counts[focus] = (counts[focus] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([focus]) => focus);
}

function getCompletedMilestones(milestones) {
  const safeMilestones = asArray(milestones);
  return {
    done: safeMilestones.filter(item => item.is_completed).length,
    total: safeMilestones.length
  };
}

function getRewardSummary(rewards) {
  const safeRewards = asArray(rewards);
  const totalPoints = safeRewards.reduce((sum, item) => sum + asNumber(item.points), 0);
  const rewardsCount = safeRewards.filter(item => item.log_type === 'reward').length;
  const punishmentsCount = safeRewards.filter(item => item.log_type === 'punishment').length;
  return { totalPoints, rewardsCount, punishmentsCount };
}

function getContextSnapshot(contextData) {
  const enriched = enrichContextData(contextData);
  const stats =
    enriched?.stats ||
    getStatsFromLogs(enriched?.recentLogs || enriched?.logs || []);

  return {
    stats,
    recentLogs: asArray(enriched?.recentLogs || enriched?.logs),
    skills: asArray(enriched?.skills),
    milestones: asArray(enriched?.milestones),
    rewards: asArray(enriched?.rewards),
    weeklyReports: asArray(enriched?.weeklyReports),
    projectSummaries: asArray(enriched?.projectSummaries),
    roadmap: enriched?.roadmap || getRoadmapSnapshot()
  };
}

function getSummaryCounts(context) {
  return {
    weekly: asArray(context.weeklyReports).length,
    projects: asArray(context.projectSummaries).length
  };
}

function formatSkillLevel(level) {
  return `${asNumber(level)}%`;
}

function isGreetingMessage(text) {
  return /^(hi|hello|hey|yo|sup|salom|assalomu alaykum)(\b|[\s!.,])/i.test(String(text || '').trim());
}

function isCasualSmallTalk(text) {
  const value = String(text || '').trim().toLowerCase();
  return (
    /^how are you(\b|[\s!?.])/.test(value) ||
    /^what can you do(\b|[\s!?.])/.test(value) ||
    /^who are you(\b|[\s!?.])/.test(value) ||
    /^help(\b|[\s!?.])/.test(value) ||
    /^hello\b.*\bbro\b/.test(value) ||
    /^hi\b.*\bbro\b/.test(value)
  );
}

function shouldUsePerformanceContext(text) {
  return /(focus|study|learn|roadmap|skill|progress|project|milestone|tracker|report|hours|weak|improve|next step|what should i do|plan|week|hafta|tugat|finish|complete)/i.test(
    String(text || '')
  );
}

function extractWeekReference(text) {
  const value = String(text || '').toLowerCase();
  const match =
    value.match(/\bweek\s*(\d{1,2})\b/i) ||
    value.match(/\bhafta\s*(\d{1,2})\b/i) ||
    value.match(/\b(\d{1,2})\s*-?\s*hafta\b/i);
  const weekNumber = match ? Number(match[1]) : null;
  return weekNumber >= 1 && weekNumber <= 8 ? weekNumber : null;
}

function isProjectCompletionQuestion(text) {
  return /(how many (project|proyekt|loyiha)|which project.*(finish|complete|done)|finished project|completed project|have i finished.*project|did i finish.*project|qaysi project|qaysi proyekt|qaysi loyiha|(project|proyekt|loyiha).*(tugat|finish|complete|done)|(tugatdim|tugatganman|finished|completed|done).*(project|proyekt|loyiha)|project.*am i done|projects.*done|nechi.*project|nechta.*project)/i.test(
    String(text || '')
  );
}

function isCurrentRoadmapQuestion(text) {
  return /(current week|which week am i|what week am i in|current project|which project am i on|hozirgi hafta|qaysi hafta|hozir qaysi week|hozir qaysi project)/i.test(
    String(text || '')
  );
}

function matchesProjectReference(text, project) {
  const value = String(text || '').toLowerCase();
  const tokens = [project.name].concat(project.aliases || [], [`project ${project.number}`]);
  return tokens.some(token => value.includes(String(token || '').toLowerCase()));
}

function extractProjectReference(text) {
  const value = String(text || '').toLowerCase();
  const numericMatch =
    value.match(/\bproject\s*(\d)\b/i) ||
    value.match(/\bproyekt\s*(\d)\b/i) ||
    value.match(/\bloyiha\s*(\d)\b/i);

  if (numericMatch) {
    return getRoadmapProject(Number(numericMatch[1]));
  }

  return ROADMAP_PROJECTS.find(project => matchesProjectReference(value, project)) || null;
}

function isCompletionSignal(text) {
  const value = String(text || '').toLowerCase();
  if (!value) return false;
  if (/\b(not done|not finished|in progress|wip|todo|remaining|blocked|next milestone|next step)\b/i.test(value)) {
    return false;
  }
  return /\b(done|completed|finished|shipped|launched|deployed|submitted|finalized|demo ready|production ready|live)\b/i.test(value);
}

function getProjectTrackerState(context, project) {
  const summary = asArray(context.projectSummaries).find(item => Number(item.project_number) === project.number);
  const milestone = asArray(context.milestones).find(item => {
    if (!item?.is_completed) return false;
    const combined = [item.title, item.name, item.description].filter(Boolean).join(' ');
    return matchesProjectReference(combined, project);
  });

  const confirmedComplete =
    isCompletionSignal(summary?.summary_text) ||
    isCompletionSignal(summary?.title) ||
    Boolean(milestone);

  return {
    summary,
    milestone,
    confirmedComplete
  };
}

function buildWeekReply(weekNumber, contextData) {
  const context = getContextSnapshot(contextData);
  const week = ROADMAP_WEEKS.find(item => item.number === Number(weekNumber));
  if (!week) return null;

  const askedRange = getWeekDateRange(week.number);
  const currentWeek = context.roadmap.currentWeek;
  const currentRange = getWeekDateRange(currentWeek);
  const project = getRoadmapProject(week.projectNumber);
  const trackerState = project ? getProjectTrackerState(context, project) : null;
  const lines = [];

  lines.push(`Week ${week.number} is ${formatRoadmapDate(askedRange.start)} to ${formatRoadmapDate(askedRange.end)}.`);

  if (currentWeek === week.number) {
    lines.push(`You are currently in that week right now.`);
  } else {
    lines.push(`Right now you are in Week ${currentWeek} (${formatRoadmapDate(currentRange.start)} to ${formatRoadmapDate(currentRange.end)}).`);
  }

  lines.push(`Focus: ${week.title}.`);
  lines.push(`Main topics: ${week.topics.join(', ')}.`);

  if (project) {
    lines.push(`${week.projectAction}: Project ${project.number} (${project.name}).`);
    if (trackerState?.confirmedComplete) {
      lines.push(`Tracker evidence says ${project.name} looks completed.`);
    } else if (trackerState?.summary) {
      lines.push(`${project.name} has a synced summary, but completion is not clearly confirmed yet.`);
    }
  }

  return lines.join(' ');
}

function buildCurrentRoadmapReply() {
  const roadmap = getRoadmapSnapshot();
  const currentProject = getRoadmapProject(roadmap.currentProjectNumber);
  return `As of ${roadmap.today}, you are in Week ${roadmap.currentWeek} (${roadmap.currentWeekRange}). Current project lane: Project ${currentProject.number} (${currentProject.name}). ${currentProject.name} is scheduled to be finished by the end of Week ${currentProject.deadlineWeek} (${currentProject.deadlineDate}).`;
}

function buildProjectStatusReply(project, contextData) {
  if (!project) return null;

  const context = getContextSnapshot(contextData);
  const state = getProjectTrackerState(context, project);
  const nowWeek = context.roadmap.currentWeek;
  const lines = [];

  lines.push(`Project ${project.number} is ${project.name}.`);
  lines.push(`Roadmap window: Week ${project.startWeek} to Week ${project.deadlineWeek} (${getRoadmapSnapshot().projects.find(item => item.number === project.number)?.startDate} to ${getRoadmapSnapshot().projects.find(item => item.number === project.number)?.deadlineDate}).`);
  lines.push(project.summary);

  if (state.confirmedComplete) {
    lines.push(`Tracker status: looks completed.`);
  } else if (state.summary) {
    lines.push(`Tracker status: summary exists, but completion is not explicitly confirmed.`);
  } else if (nowWeek > project.deadlineWeek) {
    lines.push(`Roadmap status: this project should already be finished by schedule, but I do not see clear completion evidence in the tracker.`);
  } else if (nowWeek < project.startWeek) {
    lines.push(`Roadmap status: this project has not started yet by schedule.`);
  } else {
    lines.push(`Roadmap status: this project is active or upcoming, not finished yet by schedule.`);
  }

  return lines.join(' ');
}

function buildFinishedProjectsReply(contextData) {
  const context = getContextSnapshot(contextData);
  const roadmap = context.roadmap || getRoadmapSnapshot();
  const confirmed = [];
  const shouldBeDone = [];

  ROADMAP_PROJECTS.forEach(project => {
    const state = getProjectTrackerState(context, project);
    if (state.confirmedComplete) {
      confirmed.push(project);
    } else if (roadmap.currentWeek > project.deadlineWeek) {
      shouldBeDone.push(project);
    }
  });

  const lines = [];
  lines.push(`As of ${roadmap.today}, you are in Week ${roadmap.currentWeek} (${roadmap.currentWeekRange}).`);

  if (confirmed.length) {
    lines.push(`Confirmed finished from your tracker: ${confirmed.map(project => `Project ${project.number} (${project.name})`).join(', ')}.`);
  } else {
    lines.push('I do not see clear tracker evidence that a project is fully finished yet.');
  }

  if (shouldBeDone.length) {
    lines.push(`By roadmap schedule, these should already be done: ${shouldBeDone.map(project => `Project ${project.number} (${project.name})`).join(', ')}.`);
  } else {
    const nextDeadlineProject = ROADMAP_PROJECTS.find(project => roadmap.currentWeek <= project.deadlineWeek) || ROADMAP_PROJECTS[ROADMAP_PROJECTS.length - 1];
    const nextDeadline = getRoadmapSnapshot().projects.find(item => item.number === nextDeadlineProject.number)?.deadlineDate;
    lines.push(`By schedule, no project deadline has passed yet. The first deadline is Project ${nextDeadlineProject.number} (${nextDeadlineProject.name}) at the end of Week ${nextDeadlineProject.deadlineWeek} (${nextDeadline}).`);
  }

  if (asArray(context.projectSummaries).length > 0 && !confirmed.length) {
    lines.push('You do have synced project summaries, but a summary alone does not automatically prove the project is finished.');
  }

  return lines.join(' ');
}

function buildRoadmapAwareReply(userMessage, contextData) {
  const weekNumber = extractWeekReference(userMessage);
  if (weekNumber) {
    return buildWeekReply(weekNumber, contextData);
  }

  if (isCurrentRoadmapQuestion(userMessage)) {
    return buildCurrentRoadmapReply();
  }

  if (isProjectCompletionQuestion(userMessage)) {
    return buildFinishedProjectsReply(contextData);
  }

  const project = extractProjectReference(userMessage);
  if (project) {
    return buildProjectStatusReply(project, contextData);
  }

  return null;
}

function buildFocusReply(contextData) {
  const context = getContextSnapshot(contextData);
  const roadmap = context.roadmap || getRoadmapSnapshot();
  const currentWeek = roadmap.currentWeek;
  const currentWeekData = ROADMAP_WEEKS.find(w => w.number === currentWeek);
  const currentProject = getCurrentRoadmapProject(currentWeek);
  const weakSkills = getLowestSkills(context.skills, 2);
  const focusAreas = getRecentFocusAreas(context.recentLogs, 2);
  const lines = [];

  // Week-specific focus first
  if (currentWeekData) {
    lines.push(`Week ${currentWeek} focus: ${currentWeekData.title}.`);
    lines.push(`Core topics this week: ${currentWeekData.topics.slice(0, 2).join(' and ')}.`);
  }

  // Active project
  if (currentProject) {
    lines.push(`Active project: ${currentProject.name}. Every session today should produce something that goes directly into that repo.`);
  }

  // Skill gaps
  if (weakSkills.length) {
    lines.push(`Weakest areas: ${weakSkills.map(skill => `${skill.name} (${formatSkillLevel(skill.level)})`).join(' and ')}. Put at least one dedicated block on these today.`);
  }

  // Hour consistency
  if (context.stats.avgHours < 4 && context.stats.totalDays > 0) {
    lines.push(`You are averaging ${context.stats.avgHours}h/day — below target. Block 4-5h minimum and protect it.`);
  }

  // Prior momentum
  if (focusAreas.length) {
    lines.push(`Recent momentum is around ${focusAreas.join(' and ')} — connect today's work to that thread before starting anything new.`);
  }

  lines.push('Structure: one theory block → one hands-on block → one committed output.');
  return lines.join(' ');
}

function buildMotivationReply(contextData) {
  const context = getContextSnapshot(contextData);
  const roadmap = context.roadmap || getRoadmapSnapshot();
  const currentWeek = roadmap.currentWeek;
  const strongSkills = getHighestSkills(context.skills, 2);
  const weakSkills = getLowestSkills(context.skills, 1);
  const milestoneInfo = getCompletedMilestones(context.milestones);

  // Check confirmed completed projects from tracker data
  const completedProjects = ROADMAP_PROJECTS.filter(project => {
    const state = getProjectTrackerState(context, project);
    return state.confirmedComplete;
  });

  // Check which projects should be done by schedule
  const scheduledDoneProjects = ROADMAP_PROJECTS.filter(
    project => currentWeek > project.deadlineWeek && !completedProjects.find(p => p.number === project.number)
  );

  const currentWeekData = ROADMAP_WEEKS.find(w => w.number === currentWeek);
  const currentProject = getCurrentRoadmapProject(currentWeek);
  const lines = [];

  // Dynamic opening — varies by actual state
  if (completedProjects.length > 0) {
    const names = completedProjects.map(p => p.name).join(' and ');
    lines.push(`You have shipped ${completedProjects.length === 1 ? 'a real project' : completedProjects.length + ' real projects'}: ${names}. That is portfolio evidence, not just study notes.`);
  } else if (context.stats.totalHours > 20) {
    lines.push(`${context.stats.totalHours} total hours logged. That clock does not lie — you are in motion.`);
  } else if (context.stats.totalDays > 3) {
    lines.push(`You showed up ${context.stats.totalDays} days in a row. Showing up when it is hard is the actual skill being built here.`);
  } else if (context.stats.totalDays > 0) {
    lines.push(`Week ${currentWeek} of 8. You are tracking, you are building. The hardest step was starting — you cleared it.`);
  } else {
    lines.push(`Week ${currentWeek} of 8 — ${8 - currentWeek} weeks left on the clock. Every day you execute now compounds directly into your portfolio.`);
  }

  // Skill-specific insight (strong + gap to close)
  if (strongSkills.length > 0 && weakSkills.length > 0) {
    lines.push(`${strongSkills.map(s => s.name).join(' and ')} are your strongest signals right now. Close the gap on ${weakSkills[0].name} (${formatSkillLevel(weakSkills[0].level)}) this week.`);
  } else if (strongSkills.length > 0) {
    lines.push(`${strongSkills.map(s => s.name).join(' and ')} are proven strengths. Keep building on that foundation.`);
  }

  // Milestone progress — specific numbers
  if (milestoneInfo.total > 0) {
    const remaining = milestoneInfo.total - milestoneInfo.done;
    if (milestoneInfo.done === milestoneInfo.total) {
      lines.push(`All ${milestoneInfo.total} milestones cleared. That is full execution.`);
    } else if (milestoneInfo.done > 0) {
      lines.push(`${milestoneInfo.done}/${milestoneInfo.total} milestones done. ${remaining} left — finish those before adding anything new.`);
    } else {
      lines.push(`${milestoneInfo.total} milestones are waiting. Start the first one today, not tomorrow.`);
    }
  }

  // Overdue project warning (honest, not harsh)
  if (scheduledDoneProjects.length > 0) {
    const names = scheduledDoneProjects.map(p => p.name).join(' and ');
    lines.push(`${names} ${scheduledDoneProjects.length === 1 ? 'is' : 'are'} past deadline by schedule. Even a partial version shipped now is better than nothing shipped ever.`);
  }

  // Roadmap-specific call to action for current week
  if (currentWeekData && currentProject) {
    lines.push(`This week: ${currentWeekData.title}. One concrete thing to finish today that lands inside ${currentProject.name}.`);
  }

  return lines.join(' ');
}

function buildGeneralReply(userMessage, contextData) {
  const original = String(userMessage || '').trim();
  const lower = String(userMessage || '').toLowerCase();
  const trimmed = lower.trim();

  if (isGreetingMessage(original)) {
    return 'Hey! Nice to see you. What do you want help with right now: today\'s plan, studying, projects, or a quick explanation?';
  }

  if (isCasualSmallTalk(original)) {
    return 'I am here and ready to help. You can ask me to explain a topic, review your progress, improve your plan, or help you write a short summary.';
  }

  if (trimmed.includes('thank')) {
    return 'You are welcome. If you want, I can help you plan the next step, review progress, or tighten your focus for today.';
  }

  const roadmapReply = buildRoadmapAwareReply(original, contextData);
  if (roadmapReply) {
    return roadmapReply;
  }

  if (lower.includes('focus') || lower.includes('study next') || lower.includes('what should i do today')) {
    return buildFocusReply(contextData);
  }

  if (lower.includes('motivat') || lower.includes('burned out') || lower.includes('tired')) {
    return buildMotivationReply(contextData);
  }

  if (!shouldUsePerformanceContext(original)) {
    // Try to give a meaningful answer for general AI/ML questions
    const lowerTrimmed = lower.trim();
    if (/\b(what is|explain|how does|define|tell me about|difference between|when to use|why use)\b/i.test(lowerTrimmed)) {
      return `That is a good question. I am running in built-in mode right now (no OpenAI key configured), so I cannot generate a full answer. To get a detailed explanation, add your OpenAI API key in the settings. In the meantime, I can help you with your roadmap progress, skill gaps, project status, or weekly focus.`;
    }
    return 'I can help with that. What specifically would you like to know — your current week, project status, skill gaps, or today\'s focus plan?';
  }

  const context = getContextSnapshot(contextData);
  const weakSkills = getLowestSkills(context.skills, 2);
  const focusAreas = getRecentFocusAreas(context.recentLogs, 2);
  const summaryCounts = getSummaryCounts(context);
  const lines = [];

  lines.push('I can help with that.');

  if (weakSkills.length) {
    lines.push(`Your main weak areas right now are ${weakSkills.map(skill => `${skill.name} (${formatSkillLevel(skill.level)})`).join(' and ')}.`);
  }

  if (focusAreas.length) {
    lines.push(`Recent momentum is around ${focusAreas.join(' and ')}.`);
  }

  if (context.stats.totalDays > 0) {
    lines.push(`Current baseline: ${context.stats.avgHours}h/day across ${context.stats.totalDays} logged days.`);
  }

  if (summaryCounts.weekly || summaryCounts.projects) {
    lines.push(`Tracker depth: ${summaryCounts.weekly} weekly reviews and ${summaryCounts.projects} project summaries logged.`);
  }

  lines.push('Best next step: choose one concrete deliverable and finish that before switching context.');
  return lines.join(' ');
}

function buildBiWeeklyReport(logs, skills, milestones, contextData) {
  const stats = getStatsFromLogs(logs);
  const weakSkills = getLowestSkills(skills, 3);
  const strongSkills = getHighestSkills(skills, 2);
  const milestoneInfo = getCompletedMilestones(milestones);
  const focusAreas = getRecentFocusAreas(logs, 3);
  const roadmap = getRoadmapSnapshot();
  const currentWeek = roadmap.currentWeek;
  const currentWeekData = ROADMAP_WEEKS.find(w => w.number === currentWeek);
  const currentProject = getCurrentRoadmapProject(currentWeek);
  const nextWeekData = ROADMAP_WEEKS.find(w => w.number === Math.min(8, currentWeek + 1));

  // Check project completion status
  const fakeContext = enrichContextData(contextData || {});
  const contextSnap = getContextSnapshot(fakeContext);
  const completedProjects = ROADMAP_PROJECTS.filter(project => {
    const state = getProjectTrackerState(contextSnap, project);
    return state.confirmedComplete;
  });
  const overdueProjects = ROADMAP_PROJECTS.filter(
    project => currentWeek > project.deadlineWeek && !completedProjects.find(p => p.number === project.number)
  );

  // Overview — honest assessment
  let overviewLine;
  if (stats.totalDays === 0) {
    overviewLine = `No study days logged in this period. Week ${currentWeek} of 8 is running — every day without a log is a gap in your evidence trail.`;
  } else if (stats.avgHours >= 5) {
    overviewLine = `You logged ${stats.totalDays} days and ${stats.totalHours}h total (${stats.avgHours}h/day). Strong volume — now make sure each hour is tied to a deliverable.`;
  } else {
    overviewLine = `You logged ${stats.totalDays} days and ${stats.totalHours}h total (${stats.avgHours}h/day). Volume needs to go up — aim for at least 4-5h of focused work each day.`;
  }

  // Project status line
  let projectLine;
  if (completedProjects.length > 0) {
    projectLine = `Projects shipped: ${completedProjects.map(p => `Project ${p.number} (${p.name})`).join(', ')}. That is real portfolio evidence.`;
  } else if (overdueProjects.length > 0) {
    projectLine = `Warning: ${overdueProjects.map(p => `Project ${p.number} (${p.name})`).join(', ')} ${overdueProjects.length === 1 ? 'is' : 'are'} past deadline by schedule with no confirmed completion. This is the most urgent gap.`;
  } else {
    projectLine = currentProject
      ? `Active project: ${currentProject.name} (deadline end of Week ${currentProject.deadlineWeek}). Make sure daily work feeds directly into this repo.`
      : 'No active project gap detected.';
  }

  // Next 7-day moves — specific to current roadmap week
  const nextMoves = [];
  if (weakSkills.length >= 2) {
    nextMoves.push(`- Attack ${weakSkills[0].name} and ${weakSkills[1].name} first — these are your lowest-rated skills.`);
  } else if (weakSkills.length === 1) {
    nextMoves.push(`- Focus extra time on ${weakSkills[0].name} — it is holding your skill radar back.`);
  }
  if (currentWeekData) {
    nextMoves.push(`- This week's core topics: ${currentWeekData.topics.slice(0, 2).join(' and ')}. Finish at least one hands-on exercise for each.`);
  }
  if (nextWeekData && nextWeekData.number !== currentWeek) {
    nextMoves.push(`- Preview Week ${nextWeekData.number} topics (${nextWeekData.title}) so you start fast.`);
  }
  nextMoves.push('- Every session must produce one visible output: code, notes, diagram, or demo clip.');
  if (stats.avgHours < 4 && stats.totalDays > 0) {
    nextMoves.push('- Schedule your study blocks the night before — treat them like meetings you cannot skip.');
  }

  return [
    '1. OVERVIEW',
    overviewLine,
    '',
    '2. PROJECT STATUS',
    projectLine,
    '',
    '3. WHAT IS WORKING',
    strongSkills.length
      ? `Strongest skills: ${strongSkills.map(skill => `${skill.name} (${formatSkillLevel(skill.level)})`).join(', ')}.`
      : 'Skill tracker needs more data — log your focus area in each daily report.',
    focusAreas.length
      ? `Recent focus: ${focusAreas.join(', ')}. Stay in these lanes for depth.`
      : 'No repeat focus area found yet — pick one topic and go deep before switching.',
    '',
    '4. MAIN RISKS',
    stats.avgHours < 4 && stats.totalDays > 0
      ? `Only ${stats.avgHours}h/day average — too low for 8-week mission pace. Fix this first.`
      : stats.totalDays === 0 ? 'No days logged — start tracking every session without exception.'
      : `${stats.avgHours}h/day is a reasonable pace. Protect it from inconsistency.`,
    weakSkills.length
      ? `Skill gaps to close: ${weakSkills.map(skill => `${skill.name} (${formatSkillLevel(skill.level)})`).join(', ')}.`
      : 'Keep updating skill levels honestly after each topic.',
    '',
    '5. NEXT 7 DAYS',
    ...nextMoves,
    '',
    '6. BOTTOM LINE',
    milestoneInfo.total > 0
      ? `${milestoneInfo.done}/${milestoneInfo.total} milestones cleared. ${milestoneInfo.done < milestoneInfo.total ? 'Close the open ones before starting new scope.' : 'Full set done — now focus on project quality.'}`
      : `Week ${currentWeek} of 8. Ship something today that you would put in a portfolio.`
  ].join('\n');
}

function buildMonthlyReport(logs, skills, milestones, rewards, contextData) {
  const stats = getStatsFromLogs(logs);
  const weakSkills = getLowestSkills(skills, 3);
  const strongSkills = getHighestSkills(skills, 3);
  const milestoneInfo = getCompletedMilestones(milestones);
  const rewardInfo = getRewardSummary(rewards);
  const focusAreas = getRecentFocusAreas(logs, 4);
  const dailyHours = asArray(logs).map(log => asNumber(log.hours_spent || log.hours));
  const bestDay = dailyHours.length ? Math.max(...dailyHours) : 0;
  const roadmap = getRoadmapSnapshot();
  const currentWeek = roadmap.currentWeek;
  const weeksLeft = 8 - currentWeek;

  // Check project completion from context
  const fakeContext = enrichContextData(contextData || {});
  const contextSnap = getContextSnapshot(fakeContext);
  const completedProjects = ROADMAP_PROJECTS.filter(project => {
    const state = getProjectTrackerState(contextSnap, project);
    return state.confirmedComplete;
  });
  const overdueProjects = ROADMAP_PROJECTS.filter(
    project => currentWeek > project.deadlineWeek && !completedProjects.find(p => p.number === project.number)
  );
  const upcomingDeadlines = ROADMAP_PROJECTS.filter(
    project => project.deadlineWeek >= currentWeek && project.deadlineWeek <= currentWeek + 2
  );

  // Month summary — honest
  const summaryLine = stats.totalDays > 0
    ? `This month: ${stats.totalHours}h across ${stats.totalDays} logged days (${stats.avgHours}h/day average, best day: ${bestDay}h).`
    : `No study days logged this month. Week ${currentWeek} of 8 is active — start logging every session.`;

  // Project status block
  const projectLines = [];
  if (completedProjects.length > 0) {
    projectLines.push(`Shipped: ${completedProjects.map(p => `Project ${p.number} — ${p.name}`).join(', ')}.`);
  }
  if (overdueProjects.length > 0) {
    projectLines.push(`Past deadline, not confirmed done: ${overdueProjects.map(p => `Project ${p.number} — ${p.name}`).join(', ')}. These need to be closed out immediately.`);
  }
  if (upcomingDeadlines.length > 0 && !overdueProjects.length) {
    upcomingDeadlines.forEach(p => {
      const pData = roadmap.projects.find(rp => rp.number === p.number);
      projectLines.push(`Deadline coming: Project ${p.number} (${p.name}) — end of Week ${p.deadlineWeek}${pData ? ` (${pData.deadlineDate})` : ''}.`);
    });
  }
  if (projectLines.length === 0) {
    const nextProject = getCurrentRoadmapProject(currentWeek);
    if (nextProject) {
      projectLines.push(`Active lane: Project ${nextProject.number} — ${nextProject.name}. All work this month should feed into this repo.`);
    }
  }

  // Roadmap-specific next priorities
  const remainingProjects = ROADMAP_PROJECTS.filter(p => p.deadlineWeek >= currentWeek);
  const nextPriorities = [];
  if (overdueProjects.length > 0) {
    nextPriorities.push(`- URGENT: close out ${overdueProjects.map(p => p.name).join(' and ')} first, even with a minimal viable version.`);
  }
  if (weakSkills.length >= 2) {
    nextPriorities.push(`- Dedicate at least one session per week to ${weakSkills[0].name} and ${weakSkills[1].name} specifically.`);
  }
  if (weeksLeft <= 3 && remainingProjects.length > 1) {
    nextPriorities.push(`- ${weeksLeft} weeks left, ${remainingProjects.length} projects remaining. Ruthlessly cut scope — ship something working over something perfect.`);
  } else if (remainingProjects.length > 0) {
    nextPriorities.push(`- Upcoming: ${remainingProjects.slice(0, 2).map(p => `Project ${p.number} (${p.name})`).join(' then ')}. Plan ahead so you are not starting cold.`);
  }
  nextPriorities.push('- Each study session must end with one committed artifact: code pushed, notes saved, demo recorded.');
  nextPriorities.push('- Review your skill radar weekly and update it honestly — it is your best mirror.');

  return [
    '1. MONTH SUMMARY',
    summaryLine,
    `Roadmap position: Week ${currentWeek}/8 — ${weeksLeft} week${weeksLeft !== 1 ? 's' : ''} remaining.`,
    '',
    '2. BY THE NUMBERS',
    `Average hours/day: ${stats.avgHours}h${stats.avgHours < 4 && stats.totalDays > 0 ? ' (target: 4-5h)' : ''}`,
    `Total tasks completed: ${stats.totalTasks}`,
    `Best single-day effort: ${bestDay}h`,
    rewardInfo.totalPoints !== 0 ? `Reward balance: ${rewardInfo.totalPoints} points (${rewardInfo.rewardsCount} rewards, ${rewardInfo.punishmentsCount} punishments)` : '',
    '',
    '3. PROJECT STATUS',
    ...projectLines,
    milestoneInfo.total > 0
      ? `Milestones: ${milestoneInfo.done}/${milestoneInfo.total} completed.`
      : 'Milestone tracker is empty — start logging milestone completions.',
    '',
    '4. SKILL RADAR',
    strongSkills.length
      ? `Strong: ${strongSkills.map(skill => `${skill.name} (${formatSkillLevel(skill.level)})`).join(', ')}.`
      : 'No clear strong skills yet — keep adding honest ratings.',
    weakSkills.length
      ? `Gaps to close: ${weakSkills.map(skill => `${skill.name} (${formatSkillLevel(skill.level)})`).join(', ')}.`
      : 'No skill gap data — fill in the skill tracker.',
    focusAreas.length
      ? `Most studied: ${focusAreas.join(', ')}.`
      : 'No dominant focus area — pick one and go deep.',
    '',
    '5. PRIORITIES FOR NEXT 30 DAYS',
    ...nextPriorities
  ].filter(line => line !== '').join('\n');
}

function buildFallbackNotice(reason) {
  if (reason === 'missing_key') {
    return 'Built-in AI helper mode is active right now.';
  }

  if (reason === 'remote_error') {
    return 'Live AI was unavailable, so I switched to built-in helper mode.';
  }

  return '';
}

const AIChat = {
  conversationHistory: [],

  getStatus() {
    const hasKey = Boolean(getApiKey());
    const remaining = getRemainingRequests();
    const used = getDailyCount();
    if (hasKey && isLimitReached()) {
      return { mode: 'limit', message: `Daily limit reached (${DAILY_LIMIT}/${DAILY_LIMIT}). Resets at midnight.` };
    }
    return hasKey
      ? { mode: 'remote-ready', message: `OpenAI ready (${OPENAI_MODEL}) — ${remaining}/${DAILY_LIMIT} requests left today` }
      : { mode: 'fallback', message: `Built-in AI helper mode active — add API key to unlock full AI (${used}/${DAILY_LIMIT} used today)` };
  },

  setApiKey(apiKey) {
    try {
      if (apiKey && apiKey.trim()) {
        window.localStorage.setItem(OPENAI_API_KEY_STORAGE, apiKey.trim());
      }
    } catch (error) {
      console.warn('Could not store API key:', error);
    }
  },

  clearApiKey() {
    try {
      window.localStorage.removeItem(OPENAI_API_KEY_STORAGE);
    } catch (error) {
      console.warn('Could not clear API key:', error);
    }
  },

  async requestRemote(messages) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('missing_key');
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens: 800,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      let details = 'Remote API request failed';

      try {
        const errorPayload = await response.json();
        details = errorPayload.error?.message || details;
      } catch (error) {
        // Ignore JSON parse errors and keep the generic message.
      }

      throw new Error(details);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error('Empty response from remote API');
    }

    return reply;
  },

  async sendMessage(userMessage, contextData = null) {
    // Check daily limit (only counts remote API calls)
    const apiKey = getApiKey();
    if (apiKey && isLimitReached()) {
      return { success: false, message: getLimitMessage(), mode: 'limit' };
    }

    const enrichedContext = enrichContextData(contextData);
    let messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (enrichedContext) {
      messages.push({
        role: 'system',
        content: `CURRENT PERFORMANCE DATA:\n${JSON.stringify(enrichedContext, null, 2)}`
      });
    }

    const recent = this.conversationHistory.slice(-10);
    messages = messages.concat(recent);
    messages.push({ role: 'user', content: userMessage });

    try {
      const reply = await this.requestRemote(messages);
      incrementDailyCount();
      this.conversationHistory.push({ role: 'user', content: userMessage });
      this.conversationHistory.push({ role: 'assistant', content: reply });
      const remaining = getRemainingRequests();
      return {
        success: true,
        message: reply,
        mode: 'remote',
        remaining,
        notice: remaining <= 2 ? `⚠️ ${remaining} AI request${remaining === 1 ? '' : 's'} left today.` : ''
      };
    } catch (error) {
      const fallbackReply = buildGeneralReply(userMessage, enrichedContext);
      this.conversationHistory.push({ role: 'user', content: userMessage });
      this.conversationHistory.push({ role: 'assistant', content: fallbackReply });

      const reason = error.message === 'missing_key' ? 'missing_key' : 'remote_error';
      console.warn('AI mentor fallback:', error.message);

      return {
        success: true,
        message: fallbackReply,
        mode: 'fallback',
        notice: buildFallbackNotice(reason)
      };
    }
  },

  async getBiWeeklyReport(logs, skills, milestones, weeklyReports = [], projectSummaries = []) {
    if (getApiKey() && isLimitReached()) {
      return { success: false, message: getLimitMessage(), mode: 'limit' };
    }
    const prompt = `Generate a bi-weekly performance report based on the latest logs, skills, and milestones.`;
    const contextData = { reportType: 'biweekly', logs, skills, milestones, weeklyReports, projectSummaries };
    const context = enrichContextData(contextData);

    try {
      const reply = await this.requestRemote([
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'system',
          content: `CURRENT PERFORMANCE DATA:\n${JSON.stringify(context, null, 2)}`
        },
        { role: 'user', content: prompt }
      ]);

      incrementDailyCount();
      return { success: true, message: reply, mode: 'remote' };
    } catch (error) {
      console.warn('Bi-weekly report fallback:', error.message);
      return {
        success: true,
        message: buildBiWeeklyReport(logs, skills, milestones, contextData),
        mode: 'fallback',
        notice: buildFallbackNotice(error.message === 'missing_key' ? 'missing_key' : 'remote_error')
      };
    }
  },

  async getMonthlyReport(logs, skills, milestones, rewards, weeklyReports = [], projectSummaries = []) {
    if (getApiKey() && isLimitReached()) {
      return { success: false, message: getLimitMessage(), mode: 'limit' };
    }
    const prompt = `Generate a monthly performance report based on the latest logs, skills, milestones, and rewards.`;
    const contextData = { reportType: 'monthly', logs, skills, milestones, rewards, weeklyReports, projectSummaries };
    const context = enrichContextData(contextData);

    try {
      const reply = await this.requestRemote([
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'system',
          content: `CURRENT PERFORMANCE DATA:\n${JSON.stringify(context, null, 2)}`
        },
        { role: 'user', content: prompt }
      ]);

      incrementDailyCount();
      return { success: true, message: reply, mode: 'remote' };
    } catch (error) {
      console.warn('Monthly report fallback:', error.message);
      return {
        success: true,
        message: buildMonthlyReport(logs, skills, milestones, rewards, contextData),
        mode: 'fallback',
        notice: buildFallbackNotice(error.message === 'missing_key' ? 'missing_key' : 'remote_error')
      };
    }
  },

  clearHistory() {
    this.conversationHistory = [];
  }
};

window.AIChat = AIChat;
