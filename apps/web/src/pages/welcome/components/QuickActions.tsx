/**
 * QuickActions - Navigation tile grid linking to app sections
 */
import { motion } from 'motion/react';
import { Map, Boxes, BarChart3, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Hover3D } from '@/components/ui/Hover3D';
import { GLASS_CARD, ENTRANCE_EASE } from '../styles';

interface QuickActionsProps {
  isDark: boolean;
  delay: number;
  onNavigate: (path: string) => void;
}

interface ActionTile {
  icon: LucideIcon;
  title: string;
  description: string;
  path: string;
  accent: string;
}

const TILES: ActionTile[] = [
  {
    icon: Map,
    title: 'Fleet Map',
    description: 'View live asset locations and depot clusters',
    path: '/dashboard',
    accent: '#3b82f6',
  },
  {
    icon: Boxes,
    title: 'Assets',
    description: 'Browse, search, and manage your fleet inventory',
    path: '/assets',
    accent: '#2dd4bf',
  },
  {
    icon: BarChart3,
    title: 'Reports',
    description: 'Analytics on utilization, hazards, and scan frequency',
    path: '/reports',
    accent: '#a78bfa',
  },
  {
    icon: Wrench,
    title: 'Maintenance',
    description: 'Track service tasks and outstanding work orders',
    path: '/maintenance',
    accent: '#f59e0b',
  },
];

export function QuickActions({ isDark, delay, onNavigate }: QuickActionsProps) {
  const cardStyle = isDark ? GLASS_CARD.dark : GLASS_CARD.light;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: ENTRANCE_EASE }}
      className="px-6 pb-6 max-w-4xl mx-auto w-full"
    >
      <h2
        className="text-sm uppercase tracking-widest mb-4 px-1"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: isDark ? '#64748b' : 'rgba(255, 255, 255, 0.5)',
          letterSpacing: '0.15em',
        }}
      >
        Quick Actions
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TILES.map((tile, i) => {
          const Icon = tile.icon;

          return (
            <motion.div
              key={tile.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: delay / 1000 + 0.1 * (i + 1),
                ease: ENTRANCE_EASE,
              }}
            >
              <Hover3D maxRotation={8} scale={1.02}>
                <button
                  onClick={() => onNavigate(tile.path)}
                  className="w-full text-left p-5 flex items-start gap-4 transition-all duration-300 group"
                  style={{
                    ...cardStyle,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-shadow duration-300"
                    style={{
                      background: `${tile.accent}20`,
                      boxShadow: `0 0 0 0 ${tile.accent}00`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 20px ${tile.accent}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 0 0 ${tile.accent}00`;
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: tile.accent }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className="font-semibold mb-1"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        color: isDark ? '#f1f5f9' : '#ffffff',
                        fontSize: '0.95rem',
                      }}
                    >
                      {tile.title}
                    </div>
                    <div
                      className="text-sm leading-relaxed"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        color: isDark ? '#64748b' : 'rgba(255, 255, 255, 0.55)',
                      }}
                    >
                      {tile.description}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div
                    className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ color: tile.accent }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M6 3l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </button>
              </Hover3D>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
