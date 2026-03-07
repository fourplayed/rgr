import { useEffect, useRef, useCallback } from 'react';
import { UserMenuProps } from './types';

/**
 * User menu styling configuration
 * Extracted to named constants for maintainability and clarity
 */
const MENU_STYLES = {
  container: 'absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50',
  menuList: 'py-1',
  menuItem:
    'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50',
  logoutItem:
    'block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 focus:outline-none focus:bg-gray-50',
} as const;

/**
 * Dropdown menu for user account actions
 */
export function UserMenu({ isOpen, onClose, onLogout, onProfileClick }: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleProfileClick = useCallback(() => {
    onProfileClick?.();
    onClose();
  }, [onProfileClick, onClose]);

  const handleLogout = useCallback(() => {
    onLogout();
    onClose();
  }, [onLogout, onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, handleKeyDown, handleClickOutside]);

  if (!isOpen) return null;

  return (
    <div ref={menuRef} className={MENU_STYLES.container} role="menu" aria-label="User menu">
      <div className={MENU_STYLES.menuList}>
        <button
          onClick={handleProfileClick}
          className={MENU_STYLES.menuItem}
          role="menuitem"
          aria-label="Profile settings"
        >
          Profile Settings
        </button>
        <button
          onClick={handleLogout}
          className={MENU_STYLES.logoutItem}
          role="menuitem"
          aria-label="Sign out"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
