import React from 'react';
import { useConsoleStore } from '../../store/consoleStore';
import { ConsoleButton } from './ConsoleButton';
import { ConsolePanel } from './ConsolePanel';

export function DevConsole() {
  const enabled = useConsoleStore((s) => s.enabled);

  if (!enabled) return null;

  return (
    <>
      <ConsoleButton />
      <ConsolePanel />
    </>
  );
}
