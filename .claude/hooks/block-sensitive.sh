#!/bin/bash
# Block edits to .env files and package-lock.json
# Receives JSON input on stdin from Claude Code

node -e "
  const fs = require('fs');
  const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
  const file = (input.tool_input && input.tool_input.file_path) || '';
  if (/(\\.env|\\.env\\..+|package-lock\\.json)$/.test(file)) {
    process.stderr.write('Blocked: editing ' + file + ' is not allowed. Use the package manager for lock files, and edit .env files manually.');
    process.exit(2);
  }
"
