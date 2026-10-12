import { prepareDependencies, runNpm } from './environment.mjs';

try {
  prepareDependencies({ force: true });
  if (!runNpm(['test'])) throw new Error('Tests failed; deployment preparation stopped.');
  console.log('Deployment preparation completed.');
} catch (error) {
  console.error(`Deployment preparation failed: ${error.message}`);
  process.exitCode = 1;
}
