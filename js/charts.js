/**
 * Recovery Tracker — Charts Module
 * Chart.js line (daily trend) and bar (monthly comparison) charts.
 * Theme-aware: reads CSS custom properties for colours.
 */
'use strict';

RT.Charts = (() => {
  let trendInst   = null;
  let monthlyInst = null;

  function colors() {
    const s = getComputedStyle(document.documentElement);
    return {
      text:    s.getPropertyValue('--text-secondary').trim()  || '#94a3b8',
      grid:    s.getPropertyValue('--border-color').trim()    || '#334155',
      accent:  s.getPropertyValue('--accent').trim()          || '#06b6d4',
      success: s.getPropertyValue('--success').trim()         || '#22c55e'
    };
  }

  /* ─── Daily Trend (Line Chart) ─── */

  function renderTrend(canvasId, habitId, start, end) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    if (trendInst) trendInst.destroy();

    const c      = colors();
    const dates  = RT.Utils.dateRange(start, end);
    const entries = RT.Storage.getEntriesForRange(habitId, start, end);

    const countMap = {};
    entries.forEach(e => { countMap[e.date] = (countMap[e.date] || 0) + 1; });

    const data   = dates.map(d => countMap[d] || 0);
    const labels = dates.map(d => { const p = d.split('-'); return p[1]+'/'+p[2]; });

    trendInst = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Occurrences', data,
          borderColor: c.accent,
          backgroundColor: c.accent + '20',
          fill: true, tension: 0.35,
          pointRadius: dates.length > 60 ? 0 : 3,
          pointBackgroundColor: c.accent,
          borderWidth: 2
        }]
      },
      options: chartOptions(c)
    });
  }

  /* ─── Monthly Comparison (Bar Chart) ─── */

  function renderMonthly(canvasId, habitId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    if (monthlyInst) monthlyInst.destroy();

    const c   = colors();
    const all = RT.Storage.getAllEntries(habitId);
    if (all.length === 0) return;

    const monthTotals = {};
    all.forEach(e => {
      const m = e.date.substring(0, 7);
      monthTotals[m] = (monthTotals[m] || 0) + 1;
    });

    const months = Object.keys(monthTotals).sort().slice(-12);
    const labels = months.map(m => {
      const [y, mo] = m.split('-');
      return RT.Utils.getShortMonthName(parseInt(mo)-1) + ' ' + y.slice(2);
    });
    const data = months.map(m => monthTotals[m]);

    monthlyInst = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Occurrences', data,
          backgroundColor: data.map(v => v === 0 ? c.success + '80' : c.accent + '80'),
          borderColor:      data.map(v => v === 0 ? c.success : c.accent),
          borderWidth: 1, borderRadius: 6
        }]
      },
      options: { ...chartOptions(c), scales: {
        x: { ticks: { color: c.text }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: c.text, stepSize: 1 }, grid: { color: c.grid + '30' } }
      }}
    });
  }

  function chartOptions(c) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: c.text, maxTicksLimit: 10, maxRotation: 45 }, grid: { color: c.grid + '30' } },
        y: { beginAtZero: true, ticks: { color: c.text, stepSize: 1 }, grid: { color: c.grid + '30' } }
      }
    };
  }

  return { renderTrend, renderMonthly };
})();
