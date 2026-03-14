#!/bin/bash
# PreToolUse guard: prevent raw deploy commands, redirect to pipeline scripts
# Receives JSON input on stdin from Claude Code

node -e "
  const fs = require('fs');
  const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
  const cmd = (input.tool_input && input.tool_input.command) || '';

  // Block raw archive builds (should go through deploy-asc.sh)
  if (/xcodebuild\s+.*archive/.test(cmd) && !/deploy-asc\.sh/.test(cmd)) {
    process.stderr.write(
      'Blocked: Use scripts/deploy-asc.sh for App Store builds. ' +
      'It handles lint, build number increment, ExportOptions.plist, and rollback on failure.'
    );
    process.exit(2);
  }

  // Block raw IPA upload
  if (/xcrun\s+altool\s+--upload-app/.test(cmd)) {
    process.stderr.write(
      'Blocked: Use scripts/deploy-asc.sh for App Store uploads.'
    );
    process.exit(2);
  }

  // Block raw xcodebuild export
  if (/xcodebuild\s+.*-exportArchive/.test(cmd) && !/deploy-asc\.sh/.test(cmd)) {
    process.stderr.write(
      'Blocked: Use scripts/deploy-asc.sh for archive exports.'
    );
    process.exit(2);
  }

  // Block raw sim build+install (should go through deploy-sim.sh)
  if (/xcodebuild\s+.*-destination.*Simulator/.test(cmd) && !/deploy-sim\.sh/.test(cmd)) {
    process.stderr.write(
      'Blocked: Use scripts/deploy-sim.sh for simulator builds. ' +
      'It handles Metro lifecycle, cache clearing, and app installation.'
    );
    process.exit(2);
  }
"
