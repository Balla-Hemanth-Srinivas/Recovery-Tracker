/**
 * Recovery Tracker — Statistics Module
 * All streak / success / extra stat calculations and the Stats view renderer.
 */
'use strict';

RT.Stats = (() => {

  /* ─── Core Calculator ─── */

  function calculate(habitId, startDate, endDate) {
    const habit = RT.Storage.getHabit(habitId);
    if (!habit) return null;

    const todayStr     = RT.Utils.today();
    const effectiveEnd = endDate > todayStr ? todayStr : endDate;
    const threshold    = habit.threshold;
    const rangeEntries = RT.Storage.getEntriesForRange(habitId, startDate, effectiveEnd);

    // Count per date in range
    const countByDate = {};
    rangeEntries.forEach(e => { countByDate[e.date] = (countByDate[e.date] || 0) + 1; });

    const allDates        = RT.Utils.dateRange(startDate, effectiveEnd);
    const trackedDays     = allDates.length;
    const totalOccurrences = rangeEntries.length;
    let cleanDays = 0;
    allDates.forEach(d => { if ((countByDate[d] || 0) <= threshold) cleanDays++; });

    // Overall streaks (use ALL entries, not just range)
    const allEntries     = RT.Storage.getAllEntries(habitId);
    const allCountByDate = {};
    allEntries.forEach(e => { allCountByDate[e.date] = (allCountByDate[e.date] || 0) + 1; });
    const { currentStreak, longestStreak } = streaks(allCountByDate, threshold, habit.createdAt);

    // Success rate
    const successPct = trackedDays > 0 ? Math.round((cleanDays / trackedDays) * 100) : 100;

    // Average per day
    const avgPerDay = trackedDays > 0 ? (totalOccurrences / trackedDays).toFixed(1) : '0.0';

    // Last occurrence
    const sortedDates = allEntries.map(e => e.date).sort((a, b) => b.localeCompare(a));
    const lastOccurrence = sortedDates[0] || null;

    // This month
    const now        = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const monthEntries = RT.Storage.getEntriesForRange(habitId, monthStart, todayStr);

    // Extras
    const { bestWeek, bestMonth, highestDay } = extras(allCountByDate);

    return {
      currentStreak, longestStreak, cleanDays, totalOccurrences, trackedDays,
      successPct, avgPerDay, lastOccurrence,
      occurrencesThisMonth: monthEntries.length,
      bestWeek, bestMonth, highestDay, countByDate
    };
  }

  /* ─── Streaks ─── */

  function streaks(countByDate, threshold, createdAt) {
    const todayStr  = RT.Utils.today();
    const startStr  = createdAt ? RT.Utils.formatDate(new Date(createdAt)) : todayStr;

    // Current streak (walk backwards from today)
    let currentStreak = 0;
    let d = new Date(todayStr + 'T00:00:00');
    const startD = new Date(startStr + 'T00:00:00');
    while (d >= startD) {
      if ((countByDate[RT.Utils.formatDate(d)] || 0) <= threshold) currentStreak++;
      else break;
      d.setDate(d.getDate() - 1);
    }

    // Longest streak (walk forward through all days)
    let longestStreak = 0, temp = 0;
    const walker = new Date(startD);
    const end    = new Date(todayStr + 'T00:00:00');
    while (walker <= end) {
      if ((countByDate[RT.Utils.formatDate(walker)] || 0) <= threshold) {
        temp++;
        if (temp > longestStreak) longestStreak = temp;
      } else {
        temp = 0;
      }
      walker.setDate(walker.getDate() + 1);
    }

    return { currentStreak, longestStreak };
  }

  /* ─── Extra Stats ─── */

  function extras(countByDate) {
    let highestDay = { date: null, count: 0 };
    const weekTotals  = {};
    const monthTotals = {};

    Object.entries(countByDate).forEach(([date, count]) => {
      if (count > highestDay.count) highestDay = { date, count };
      const ws = RT.Utils.getWeekStart(date);
      weekTotals[ws]  = (weekTotals[ws]  || 0) + count;
      const mo = date.substring(0, 7);
      monthTotals[mo] = (monthTotals[mo] || 0) + count;
    });

    // Best = lowest total
    let bestWeek  = { key: null, total: Infinity };
    let bestMonth = { key: null, total: Infinity };
    Object.entries(weekTotals).forEach(([k, v]) =>  { if (v < bestWeek.total)  bestWeek  = { key: k, total: v }; });
    Object.entries(monthTotals).forEach(([k, v]) => { if (v < bestMonth.total) bestMonth = { key: k, total: v }; });

    const fmtMonth = m => {
      const [y, mo] = m.split('-');
      return RT.Utils.getShortMonthName(parseInt(mo)-1) + ' ' + y;
    };

    return {
      bestWeek:  bestWeek.key  ? `Wk of ${RT.Utils.formatRelativeDate(bestWeek.key)} (${bestWeek.total})` : 'N/A',
      bestMonth: bestMonth.key ? `${fmtMonth(bestMonth.key)} (${bestMonth.total})` : 'N/A',
      highestDay: highestDay.date ? `${RT.Utils.formatRelativeDate(highestDay.date)} (${highestDay.count})` : 'N/A'
    };
  }

  /* ─── Date-range helper ─── */

  function getDateRange(period) {
    const now = new Date();
    const t   = RT.Utils.today();
    switch (period) {
      case 'week':  { const s = new Date(now); s.setDate(s.getDate()-6); return { start: RT.Utils.formatDate(s), end: t }; }
      case 'month': { return { start: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, end: t }; }
      case 'year':  { return { start: `${now.getFullYear()}-01-01`, end: t }; }
      default:       return { start: '2020-01-01', end: t };
    }
  }

  /* ─── Render Stats View ─── */

  function renderStatsView(habitId) {
    const view  = RT.Utils.$('#view-stats');
    const habit = RT.Storage.getHabit(habitId);

    if (!habit) {
      view.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h2>No Statistics</h2>
          <p>Create a habit first to see statistics.</p>
          <button class="btn btn-primary" onclick="RT.App.navigate('home')">Go Home</button>
        </div>`;
      return;
    }

    let period = 'month';

    function draw() {
      const range = getDateRange(period);
      const s     = calculate(habitId, range.start, range.end);
      if (!s) return;

      view.innerHTML = `
        <div class="view-header">
          <button class="header-btn back-btn" id="stats-back">‹</button>
          <h1 class="view-title">${habit.emoji} Statistics</h1>
        </div>

        <div class="period-selector">
          ${['week','month','year','all'].map(p => `
            <button class="period-btn${p===period?' active':''}" data-p="${p}">
              ${p.charAt(0).toUpperCase()+p.slice(1)}
            </button>`).join('')}
        </div>

        <div class="stats-grid">
          <div class="stat-card card"><div class="stat-value">${s.currentStreak}</div><div class="stat-label">Current Streak</div></div>
          <div class="stat-card card"><div class="stat-value">${s.longestStreak}</div><div class="stat-label">Best Streak</div></div>
          <div class="stat-card card"><div class="stat-value">${s.successPct}%</div><div class="stat-label">Success Rate</div></div>
          <div class="stat-card card"><div class="stat-value">${s.cleanDays}</div><div class="stat-label">Clean Days</div></div>
          <div class="stat-card card"><div class="stat-value">${s.occurrencesThisMonth}</div><div class="stat-label">This Month</div></div>
          <div class="stat-card card"><div class="stat-value">${s.avgPerDay}</div><div class="stat-label">Avg / Day</div></div>
        </div>

        <div class="detail-card card">
          <div class="detail-row"><span>Last Occurrence</span><span>${s.lastOccurrence ? RT.Utils.formatRelativeDate(s.lastOccurrence) : 'Never'}</span></div>
          <div class="detail-row"><span>Best Week</span><span>${s.bestWeek}</span></div>
          <div class="detail-row"><span>Best Month</span><span>${s.bestMonth}</span></div>
          <div class="detail-row"><span>Highest Day</span><span>${s.highestDay}</span></div>
        </div>

        <div class="chart-card card">
          <h3 class="chart-title">Daily Trend</h3>
          <div class="chart-wrap"><canvas id="chart-trend"></canvas></div>
        </div>

        <div class="chart-card card">
          <h3 class="chart-title">Monthly Comparison</h3>
          <div class="chart-wrap"><canvas id="chart-monthly"></canvas></div>
        </div>

        <div class="chart-card card">
          <h3 class="chart-title">Heatmap</h3>
          <div id="heatmap-container" class="heatmap-wrap"></div>
        </div>`;

      // Period buttons
      view.querySelectorAll('.period-btn').forEach(btn =>
        btn.addEventListener('click', () => { period = btn.dataset.p; draw(); })
      );

      view.querySelector('#stats-back').addEventListener('click', () => RT.App.navigate('habit/' + habitId));

      // Charts & heatmap
      const r = getDateRange(period);
      RT.Charts.renderTrend('chart-trend', habitId, r.start, r.end);
      RT.Charts.renderMonthly('chart-monthly', habitId);
      RT.Heatmap.render('heatmap-container', habitId);
    }

    draw();
  }

  return { calculate, renderStatsView, getDateRange };
})();
