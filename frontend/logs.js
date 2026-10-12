const form = document.querySelector('#filters');
const rows = document.querySelector('#rows');
const status = document.querySelector('#status');

async function refresh() {
  const params = new URLSearchParams(new FormData(form));
  try {
    const response = await fetch(`/__dev/logs?${params}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const logs = await response.json();
    rows.replaceChildren(...logs.slice().reverse().map(log => {
      const row = document.createElement('tr');
      for (const value of [log.time, log.level, log.event, [log.message, log.method, log.route, log.status, log.durationMs == null ? '' : `${log.durationMs} ms`].filter(value => value !== '' && value !== undefined).join(' · ')]) {
        const cell = document.createElement('td');
        cell.textContent = String(value ?? '');
        row.append(cell);
      }
      return row;
    }));
    status.textContent = `${logs.length} recent event${logs.length === 1 ? '' : 's'}. Auto-refreshes every 3 seconds.`;
  } catch (error) {
    status.textContent = `Could not load logs: ${error.message}`;
  }
}

form.addEventListener('submit', event => { event.preventDefault(); refresh(); });
setInterval(refresh, 3000);
refresh();
