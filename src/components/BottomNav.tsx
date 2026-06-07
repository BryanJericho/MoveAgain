import { NavLink } from 'react-router-dom'
import { Home, Activity, BarChart2, MessageCircle, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Beranda' },
  { to: '/session', icon: Activity, label: 'Latihan' },
  { to: '/history', icon: BarChart2, label: 'Progres' },
  { to: '/chat', icon: MessageCircle, label: 'Konsultasi' },
  { to: '/settings', icon: Settings, label: 'Pengaturan' }
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-100 z-50 safe-bottom">
      <div className="flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors ${
                isActive
                  ? 'text-primary-700'
                  : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
