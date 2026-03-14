#!/bin/bash
# PostToolUse: launch background code review after git commit
# Receives JSON input on stdin from Claude Code

node -e "
  const fs = require('fs');
  const { execSync } = require('child_process');
  const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
  const cmd = (input.tool_input && input.tool_input.command) || '';
  const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';

  // Only fire on git commit commands
  if (!/git\s+commit/.test(cmd)) process.exit(0);

  try {
    const files = execSync('git diff --name-only HEAD~1..HEAD', {
      cwd: projectDir, encoding: 'utf8', stdio: ['pipe','pipe','pipe']
    }).trim().split('\n').filter(Boolean);

    // Skip small commits (< 5 files)
    if (files.length < 5) {
      process.stdout.write('[review] Skipping — only ' + files.length + ' file(s) changed.');
      process.exit(0);
    }

    // Detect affected packages
    const packages = new Set();
    for (const f of files) {
      if (f.startsWith('apps/mobile/')) packages.add('mobile');
      else if (f.startsWith('apps/web/')) packages.add('web');
      else if (f.startsWith('packages/shared/')) packages.add('shared');
    }

    if (packages.size === 0) { process.exit(0); }

    for (const pkg of packages) {
      execSync(
        'nohup bash \"' + projectDir + '/scripts/code-review.sh\" ' + pkg + ' > /dev/null 2>&1 &',
        { cwd: projectDir, stdio: 'ignore' }
      );
      process.stdout.write('[review] Code review launched for ' + pkg + '. Output → scripts/reviews/\n');
    }
  } catch { process.exit(0); }
"
