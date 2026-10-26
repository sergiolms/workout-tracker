import {
  BarChart3,
  CalendarDays,
  CircleUserRound,
  Dumbbell,
  Timer,
  type LucideIcon,
} from 'lucide-react';

export type Tab = 'today' | 'plan' | 'timers' | 'progress' | 'profile';

export const navItems: Array<{
  id: Tab;
  label: string;
  icon: LucideIcon;
  featured?: boolean;
}> = [
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'progress', label: 'Progreso', icon: BarChart3 },
  { id: 'today', label: 'Hoy', icon: Dumbbell, featured: true },
  { id: 'timers', label: 'Timer', icon: Timer },
  { id: 'profile', label: 'Perfil', icon: CircleUserRound },
];
