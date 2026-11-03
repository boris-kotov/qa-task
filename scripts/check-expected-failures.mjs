#!/usr/bin/env node
// Verifies that every test marked as a known defect (`knownDefect` → test.fail) failed for the expected reason.
// Playwright's test.fail treats ANY failure as expected, so a setup error or a new regression would be hidden.
// Reads the JSON report of the last run (reports/results.json) and compares each expected failure's error
// with its "expected-error" annotation (a regular expression). Runs automatically after `npm test` (posttest).
import { readFileSync } from 'node:fs';

const REPORT = process.argv[2] ?? 'reports/results.json';
const ANNOTATION = 'expected-error';
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');

const report = JSON.parse(readFileSync(REPORT, 'utf8'));
const problems = [];
let checked = 0;

function visit(suite) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests) {
      if (test.expectedStatus !== 'failed') continue;
      for (const result of test.results) {
        const title = `${spec.file} › ${spec.title}`;
        const annotation = [...(test.annotations ?? []), ...(result.annotations ?? [])].find((a) => a.type === ANNOTATION);
        if (!annotation) {
          problems.push(`${title}: test.fail without an "${ANNOTATION}" annotation — use knownDefect()`);
          continue;
        }
        if (result.status !== 'failed') continue; // passed / timed out are already reported by Playwright as unexpected
        checked++;
        const message = stripAnsi((result.errors ?? []).map((e) => e.message ?? '').join('\n'));
        if (!new RegExp(annotation.description).test(message)) {
          problems.push(`${title}: failed for an unexpected reason.\n    expected error /${annotation.description}/\n    actual: ${message.split('\n').slice(0, 4).join(' | ')}`);
        }
      }
    }
  }
  for (const child of suite.suites ?? []) visit(child);
}

for (const suite of report.suites ?? []) visit(suite);

if (problems.length > 0) {
  console.error(`check-expected-failures: ${problems.length} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-expected-failures: OK, ${checked} expected failure(s) failed for the expected reason.`);
