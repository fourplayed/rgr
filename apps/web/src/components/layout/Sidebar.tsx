import { NavLink } from 'react-router-dom';
import { ScanLine, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const navigation = [
  { name: 'Scan Assets', href: '/scan', icon: ScanLine },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full w-64 flex-col bg-primary-900">
      <div className="flex h-16 items-center justify-center border-b border-primary-800">
        <h1 className="text-xl font-bold text-white">RGR Fleet</h1>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-primary-800 text-white'
                  : 'text-primary-100 hover:bg-primary-800 hover:text-white'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-primary-800 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
            <p className="text-xs text-primary-300 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="ml-2 p-1 text-primary-300 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
