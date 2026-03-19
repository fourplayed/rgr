#!/bin/bash
# Auto-format files after Edit/Write using Prettier
# Receives JSON input on stdin from Claude Code

node -e "
  const fs = require('fs');
  const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
  const file = (input.tool_input && input.tool_input.file_path) || '';
  if (file && /\.(ts|tsx|js|jsx|json|css|md|sql)$/.test(file) && fs.existsSync(file)) {
    const { execSync } = require('child_process');
    try { execSync('npx prettier --write ' + JSON.stringify(file), { stdio: 'pipe' }); }
    catch {}
  }
"
