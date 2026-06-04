/**
 * Recovery Tracker — Heatmap Module
 * GitHub-style yearly contribution heatmap.
 * Reuses Calendar.colorClass() for consistent colouring.
 */
'use strict';

RT.Heatmap = (() => {

  function render(containerId, habitId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const habit = RT.Storage.getHabit(habitId);
    if (!habit) return;

    const createdDateStr = RT.Utils.formatDate(new Date(habit.createdAt));
    const today    = new Date();
    const todayStr = RT.Utils.today();

    // Show last 52 weeks, starting on a Monday
    const start = new Date(today);
    start.setDate(start.getDate() - (52 * 7));
    while (start.getDay() !== 1) start.setDate(start.getDate() - 1);

    const startStr = RT.Utils.formatDate(start);
    const entries  = RT.Storage.getEntriesForRange(habitId, startStr, todayStr);

    const counts = {};
    entries.forEach(e => { counts[e.date] = (counts[e.date] || 0) + 1; });

    // Build month labels for the top row
    let html = '<div class="hm"><div class="hm-months">';
    const monthPositions = [];
    let lastMonth = -1, colIdx = 0;
    const walker = new Date(start);
    while (walker <= today) {
      if (walker.getDay() === 1) {
        const m = walker.getMonth();
        if (m !== lastMonth) {
          monthPositions.push({ col: colIdx, label: RT.Utils.getShortMonthName(m) });
          lastMonth = m;
        }
        colIdx++;
      }
      walker.setDate(walker.getDate() + 1);
    }
    monthPositions.forEach(p => {
      html += `<span class="hm-mlabel" style="grid-column:${p.col + 2}">${p.label}</span>`;
    });
    html += '</div>';

    // Day labels (left column)
    html += '<div class="hm-body">';
    html += '<div class="hm-dlabels">';
    ['Mon','','Wed','','Fri','','Sun'].forEach(l => html += `<span>${l}</span>`);
    html += '</div>';

    // Squares grid (flows column-first: Mon→Sun, then next week)
    html += '<div class="hm-grid">';
    const cur = new Date(start);
    while (cur <= today) {
      const ds    = RT.Utils.formatDate(cur);
      const future = ds > todayStr;
      const beforeCreation = ds < createdDateStr;
      const count = counts[ds] || 0;

      let cls = '';
      let showCountValue = false;

      if (future) {
        cls = 'hm-empty';
      } else if (beforeCreation) {
        cls = 'hm-not-tracked';
      } else {
        if (count <= habit.threshold) {
          cls = 'cal-green';
        } else {
          cls = RT.Calendar.colorClass(count);
          showCountValue = true;
        }
      }

      const tip   = `${ds}: ${count} occurrence${count !== 1 ? 's' : ''}`;
      html += `<div class="hm-sq ${cls}" title="${tip}">${showCountValue ? count : ''}</div>`;
      cur.setDate(cur.getDate() + 1);
    }
    html += '</div></div></div>';

    container.innerHTML = html;
  }

  return { render };
})();
