#!/bin/bash
# PostToolUse: launch background plan review after writing a plan file
# Receives JSON input on stdin from Claude Code

node -e "
  const fs = require('fs');
  const { execSync } = require('child_process');
  const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
  const file = (input.tool_input && input.tool_input.file_path) || '';
  const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';

  // Only fire on plan files
  if (!/\.claude\/plans\/.*\.md$/.test(file)) process.exit(0);

  // Skip stubs (< 500 bytes)
  try {
    if (fs.statSync(file).size < 500) process.exit(0);
  } catch { process.exit(0); }

  try {
    execSync(
      'nohup bash \"' + projectDir + '/scripts/plan-review.sh\" \"' + file + '\" > /dev/null 2>&1 &',
      { cwd: projectDir, stdio: 'ignore' }
    );
    process.stdout.write('[review] Plan review launched (8 agents). Output → ' + file.replace('.md', '-review.md'));
  } catch { process.exit(0); }
"
