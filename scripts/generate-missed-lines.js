#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..', 'frontend');
const DEFAULT_COVERAGE = path.join(FRONTEND_ROOT, 'coverage', 'lcov.info');
const DEFAULT_OUTPUT = path.join(FRONTEND_ROOT, 'missed-lines.json');

function parseArgs(argv) {
  const options = {
    coverage: DEFAULT_COVERAGE,
    out: DEFAULT_OUTPUT,
    format: 'json',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--coverage' && argv[i + 1]) {
      options.coverage = resolveFromRoot(argv[i + 1]);
      i += 1;
    } else if (arg === '--out' && argv[i + 1]) {
      options.out = resolveFromRoot(argv[i + 1]);
      i += 1;
    } else if (arg === '--format' && argv[i + 1]) {
      const format = argv[i + 1].toLowerCase();
      if (format !== 'json' && format !== 'txt') {
        throw new Error(`Unsupported format "${format}". Use "json" or "txt".`);
      }
      options.format = format;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
      break;
    } else {
      throw new Error(`Unknown argument "${arg}". Use --help to see available options.`);
    }
  }

  return options;
}

function resolveFromRoot(targetPath) {
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(FRONTEND_ROOT, targetPath);
}

function normalizePath(filePath) {
  const normalized = path.relative(
    FRONTEND_ROOT,
    path.isAbsolute(filePath) ? filePath : path.resolve(FRONTEND_ROOT, filePath),
  );
  return normalized.split(path.sep).join('/');
}

function printHelp() {
  console.log(`Usage: node scripts/generate-missed-lines.js [options]

Options:
  --coverage <path>   Path to the lcov.info file (default: coverage/lcov.info)
  --out <path>        Output file path (default: missed-lines.json)
  --format <format>   Output format: "json" or "txt" (default: json)
  --help              Show this message
`);
}

function parseCoverage(coverageFile) {
  const report = {};
  let currentFile = null;

  const lines = fs.readFileSync(coverageFile, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith('SF:')) {
      currentFile = normalizePath(line.slice(3));
      if (!report[currentFile]) {
        report[currentFile] = [];
      }
    } else if (line.startsWith('DA:') && currentFile) {
      const [lineNumber, hitCount] = line.slice(3).split(',').map((token) => parseInt(token, 10));
      if (Number.isInteger(lineNumber) && hitCount === 0) {
        report[currentFile].push(lineNumber);
      }
    } else if (line === 'end_of_record') {
      currentFile = null;
    }
  }

  const missedEntries = Object.entries(report)
    .map(([filePath, missedLines]) => [filePath, Array.from(new Set(missedLines)).sort((a, b) => a - b)])
    .filter(([, missedLines]) => missedLines.length > 0)
    .sort(([fileA], [fileB]) => fileA.localeCompare(fileB));

  return missedEntries;
}

function writeOutput(entries, outputFile, format) {
  if (format === 'json') {
    const jsonObject = entries.reduce((acc, [filePath, missedLines]) => {
      acc[filePath] = missedLines;
      return acc;
    }, {});
    fs.writeFileSync(outputFile, `${JSON.stringify(jsonObject, null, 2)}\n`);
  } else {
    const textLines = entries.map(([filePath, missedLines]) => `${filePath}: ${missedLines.join(', ')}`);
    fs.writeFileSync(outputFile, `${textLines.join('\n')}\n`);
  }
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    return;
  }

  if (!fs.existsSync(options.coverage)) {
    console.error(`Coverage file not found at "${options.coverage}".`);
    process.exit(1);
  }

  const entries = parseCoverage(options.coverage);
  writeOutput(entries, options.out, options.format);

  console.log(`Wrote ${entries.length} entries to ${normalizePath(options.out)} in ${options.format.toUpperCase()} format.`);
}

main();
