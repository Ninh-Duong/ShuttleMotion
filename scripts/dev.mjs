import { prepareDependencies } from './environment.mjs';
import { startServer } from '../backend/server.mjs';

try {
  const setupEvents = [];
  prepareDependencies({ report: message => { console.log(message); setupEvents.push(message); } });
  await startServer({ dev: true, setupEvents });
} catch (error) {
  console.error(`Startup failed: ${error.message}`);
  process.exitCode = 1;
}
