// ============================================
// APP.JS — Main Page Interactivity
// ============================================

// ---- STATE ----
let currentWeek = 0;
let totalPoints = 0;

// ---- WEEK NAVIGATION ----
function setWeek(i) {
  document.querySelectorAll('.week-section').forEach((s, idx) => {
    s.classList.toggle('active', idx === i);
  });
  document.querySelectorAll('.wbtn').forEach((b, idx) => {
    b.classList.toggle('active', idx === i);
  });
  currentWeek = i;
  document.getElementById('prog').style.width = ((i + 1) / 8 * 100) + '%';
  document.getElementById('mainContent').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- DAY CARD TOGGLE ----
function tog(card) {
  const isOpen = card.classList.contains('open');
  const parentGrid = card.closest('.days-grid');
  parentGrid.querySelectorAll('.day-card').forEach(c => c.classList.remove('open'));
  if (!isOpen) card.classList.add('open');
}

// ---- SCROLL TO TOP ----
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scrollTop');
  if (btn) btn.classList.toggle('show', window.scrollY > 300);
});

// ---- DAILY REPORT MODAL ----
function openReportModal() {
  const modal = document.getElementById('reportModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('reportDate').value = today;
  document.getElementById('reportWeek').value = currentWeek + 1;
}

function closeReportModal() {
  document.getElementById('reportModal').classList.remove('active');
  document.body.style.overflow = '';
}

async function submitDailyReport() {
  const btn = document.getElementById('submitReportBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const date = document.getElementById('reportDate').value;
  const hours = parseFloat(document.getElementById('reportHours').value) || 0;
  const focusArea = document.getElementById('reportFocus').value;
  const customFocus = document.getElementById('reportCustomFocus').value;
  const difficulty = parseInt(document.getElementById('reportDifficulty').value) || 3;
  const mood = document.getElementById('reportMood').value;
  const energy = parseInt(document.getElementById('reportEnergy').value) || 3;
  const notes = document.getElementById('reportNotes').value;
  const weekNum = parseInt(document.getElementById('reportWeek').value) || 1;

  // Gather checklist
  const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
  const checklist = {};
  let tasksCompleted = 0;
  checkboxes.forEach(cb => {
    checklist[cb.name] = cb.checked;
    if (cb.checked) tasksCompleted++;
  });

  // Gather topics
  const topicInputs = document.querySelectorAll('.topic-tag');
  const topics = [];
  topicInputs.forEach(t => {
    if (t.textContent.trim()) topics.push(t.textContent.trim());
  });

  const logData = {
    date,
    hours,
    tasksCompleted,
    focusArea: customFocus || focusArea,
    topicsLearned: topics,
    difficulty,
    mood,
    energyLevel: energy,
    notes,
    checklist,
    weekNumber: weekNum
  };

  try {
    const { data, error } = await window.DB.DailyLogs.create(logData);
    if (error) throw error;

    // Get stats and evaluate rewards
    const stats = await window.DB.DailyLogs.getStats();
    const triggered = await window.DB.RewardEngine.evaluate(logData, stats);

    closeReportModal();
    
    // Show reward/punishment notifications
    if (triggered.length > 0) {
      showRewardNotifications(triggered);
    } else {
      showToast('Daily report saved!', 'success');
    }

    // Update stats display
    updateStatsDisplay(stats);
  } catch (err) {
    console.error('Submit error:', err);
    showToast('Error saving report. Try again.', 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Submit Report';
}

// ---- REWARD NOTIFICATIONS ----
function showRewardNotifications(triggered) {
  triggered.forEach((t, i) => {
    setTimeout(() => {
      const isReward = t.type === 'reward';
      const notif = document.createElement('div');
      notif.className = `reward-notif ${isReward ? 'reward' : 'punishment'}`;
      notif.innerHTML = `
        <div class="rn-icon">${isReward ? '🏆' : '⚠️'}</div>
        <div class="rn-body">
          <div class="rn-title">${t.title}</div>
          <div class="rn-desc">${t.desc}</div>
          <div class="rn-points">${t.points > 0 ? '+' : ''}${t.points} pts</div>
        </div>
      `;
      document.body.appendChild(notif);
      requestAnimationFrame(() => notif.classList.add('show'));
      setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 400);
      }, 3500);
    }, i * 600);
  });
}

// ---- TOAST ----
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ---- STATS DISPLAY ----
async function updateStatsDisplay(stats) {
  if (!stats) stats = await window.DB.DailyLogs.getStats();
  const els = {
    totalDays: document.getElementById('statDays'),
    totalHours: document.getElementById('statHours'),
    currentStreak: document.getElementById('statStreak'),
    totalTasks: document.getElementById('statTasks')
  };
  if (els.totalDays) els.totalDays.textContent = stats.totalDays;
  if (els.totalHours) els.totalHours.textContent = stats.totalHours;
  if (els.currentStreak) els.currentStreak.textContent = stats.currentStreak;
  if (els.totalTasks) els.totalTasks.textContent = stats.totalTasks;
}

// ---- TOPICS INPUT ----
function addTopicTag(input) {
  if (input.value.trim() && (event.key === 'Enter' || event.key === ',')) {
    event.preventDefault();
    const container = document.getElementById('topicsContainer');
    const tag = document.createElement('span');
    tag.className = 'topic-tag';
    tag.innerHTML = `${input.value.trim()} <span class="tag-x" onclick="this.parentElement.remove()">×</span>`;
    container.insertBefore(tag, input);
    input.value = '';
  }
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', async () => {
  // Load stats
  if (window.DB) {
    try {
      await updateStatsDisplay();
    } catch (e) {
      console.log('Stats load deferred:', e);
    }
  }
});
