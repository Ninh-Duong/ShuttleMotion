import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const MAX_LOG_BYTES = 1_000_000;
const MAX_RECORDS = 200;

export function createLogger({ dev = false, dir = join(process.cwd(), '.local', 'logs'), maxBytes = MAX_LOG_BYTES, sink = console.log } = {}) {
  const current = join(dir, 'dev.jsonl');
  const previous = join(dir, 'dev.previous.jsonl');
  if (dev) mkdirSync(dir, { recursive: true });

  function write(level, event, details = {}) {
    const record = {
      time: new Date().toISOString(),
      level,
      event,
      message: String(details.message ?? '').slice(0, 300)
    };
    for (const field of ['method', 'route', 'status', 'durationMs']) {
      if (details[field] !== undefined) record[field] = details[field];
    }
    const line = `${JSON.stringify(record)}\n`;
    if (dev) {
      if (existsSync(current) && statSync(current).size + Buffer.byteLength(line) > maxBytes) {
        rmSync(previous, { force: true });
        renameSync(current, previous);
      }
      appendFileSync(current, line);
    }
    sink(JSON.stringify(record));
    return record;
  }

  function recent({ level = '', search = '', limit = MAX_RECORDS } = {}) {
    if (!dev) return [];
    const rows = [previous, current].flatMap(path => {
      if (!existsSync(path)) return [];
      return readFileSync(path, 'utf8').split('\n').filter(Boolean).flatMap(line => {
        try { return [JSON.parse(line)]; } catch { return []; }
      });
    });
    const needle = String(search).toLowerCase().slice(0, 100);
    return rows.filter(row => (!level || row.level === level) &&
      (!needle || `${row.event} ${row.message} ${row.route ?? ''}`.toLowerCase().includes(needle)))
      .slice(-Math.min(Math.max(Number(limit) || MAX_RECORDS, 1), MAX_RECORDS));
  }

  return { write, recent };
}
