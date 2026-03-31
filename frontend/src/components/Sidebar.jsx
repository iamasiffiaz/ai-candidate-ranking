import { NavLink } from 'react-router-dom'
import { Brain, Briefcase, LayoutDashboard } from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 bg-gray-900 text-white flex flex-col shadow-2xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700/60">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">AI Candidate</p>
          <p className="text-[11px] text-gray-400 leading-tight">Ranking System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-700/60 text-[11px] text-gray-600 text-center">
        v1.0.0 &bull; Powered by AI
      </div>
    </aside>
  )
}
