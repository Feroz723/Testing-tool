#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import { auditAll } from './src/audit.js';
import { saveResult } from './src/storage.js';
import { runFlowsForUrl } from './src/flowsRunner.js';
import { generateHtmlReport } from './src/reportGenerator.js';
import { formatToSimpleResults, formatAsString, formatAsJSON } from './src/simpleResultFormatter.js';

const argv = yargs(hideBin(process.argv))
  .option('url', { type: 'string', describe: 'URL or comma-separated URLs' })
  .option('flows', { type: 'boolean', describe: 'Run E2E flows only' })
  .option('thresholds', { type: 'string', describe: 'Path to thresholds JSON' })
  .option('save', { type: 'boolean', describe: 'Save results to data/results.json', default: false })
  .option('simple', { type: 'boolean', describe: 'Output simple test name + pass/fail format', default: false })
  .option('format', { type: 'string', choices: ['json', 'string'], describe: 'Output format for simple results', default: 'string' })
  .help().argv;

// Handle --flows option
if (argv.flows) {
  // Use provided URL or default
  const testUrl = argv.url || process.env.TEST_URL || 'https://example.com';
  console.log(`🧪 Running E2E flows for: ${testUrl}`);
  
  const flowsResult = await runFlowsForUrl(testUrl);
  
  // Generate HTML report
  generateHtmlReport(flowsResult);
  
  // Output results
  if (argv.simple) {
    const simpleResults = formatToSimpleResults(flowsResult);
    if (argv.format === 'json') {
      console.log(formatAsJSON(simpleResults));
    } else {
      console.log(formatAsString(simpleResults));
    }
  } else {
    // Keep original JSON output
    console.log(JSON.stringify(flowsResult, null, 2));
  }
  process.exit(0);
}

// Handle --url option (full test suite: Lighthouse + Pa11y + E2E)
if (!argv.url) {
  console.error('Error: --url is required when not using --flows');
  process.exit(1);
}

const urls = argv.url.split(',').map(s => s.trim()).filter(Boolean);
let thresholds = {};
if (argv.thresholds) {
  thresholds = JSON.parse(fs.readFileSync(argv.thresholds, 'utf-8'));
}

console.log(`🧪 Running full test suite for: ${urls.join(', ')}`);

// Run full audit (Lighthouse + Pa11y + E2E)
const run = await auditAll(urls, thresholds);

if (argv.save) {
  await saveResult(run);
}

// Generate enhanced HTML report for full audit results
generateHtmlReport(run);

// Output results
if (argv.simple) {
  const simpleResults = formatToSimpleResults(run);
  if (argv.format === 'json') {
    console.log(formatAsJSON(simpleResults));
  } else {
    console.log(formatAsString(simpleResults));
  }
} else {
  // Keep original JSON output
  console.log(JSON.stringify(run, null, 2));
}
