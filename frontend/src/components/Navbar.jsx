import { useNavigate } from 'react-router-dom'
import { LogOut, Shield, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
      {/* Breadcrumb area — kept intentionally blank; pages render their own titles */}
      <div />

      {/* User info + logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            {user?.role === 'admin' ? (
              <Shield className="w-4 h-4 text-purple-600" />
            ) : (
              <User className="w-4 h-4 text-blue-600" />
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.full_name}</p>
            <p className="text-xs text-gray-400 leading-tight">{user?.email}</p>
          </div>
          <span
            className={`badge ml-1 ${
              user?.role === 'admin'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {user?.role}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
