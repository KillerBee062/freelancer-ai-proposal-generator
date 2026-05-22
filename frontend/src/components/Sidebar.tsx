import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Profile', icon: '👤' },
  { to: '/new', label: 'New Proposal', icon: '✨' },
  { to: '/history', label: 'History', icon: '📋' },
];

export default function Sidebar() {
  return (
    <aside className="flex w-64 flex-col justify-between bg-surface p-6">
      {/* Brand */}
      <div>
        <div className="mb-10 flex items-center gap-3">
          <span className="text-2xl text-accent-light">✦</span>
          <h1 className="bg-gradient-to-r from-accent-light to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
            ProposalAI
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-accent/20 to-purple-500/20 text-white shadow-lg shadow-accent/10'
                    : 'text-slate-400 hover:bg-surface-light hover:text-slate-200'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom branding */}
      <div className="border-t border-surface-lighter pt-4">
        <p className="text-center text-xs text-slate-500">
          ⚡ AI-Powered Proposals
        </p>
      </div>
    </aside>
  );
}
