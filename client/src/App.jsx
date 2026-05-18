import { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { LeadsView } from './components/LeadsView';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { LayoutDashboard, Users, Target, Plus } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [openAddModal, setOpenAddModal] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const handleKeydown = useCallback((e) => {
    if (
      e.key === 'n' &&
      !e.metaKey && !e.ctrlKey && !e.altKey &&
      e.target.tagName !== 'INPUT' &&
      e.target.tagName !== 'TEXTAREA' &&
      e.target.tagName !== 'SELECT'
    ) {
      setPage('leads');
      setOpenAddModal(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Target size={14} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100 leading-none">Local Lead</div>
              <div className="text-xs text-indigo-400 font-semibold leading-none mt-0.5">Sniper</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                page === id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* Quick add shortcut hint */}
        <div className="px-3 py-4 border-t border-zinc-800">
          <button
            onClick={() => { setPage('leads'); setOpenAddModal(true); }}
            className="flex items-center gap-2 w-full px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Plus size={14} />
            <span>New Lead</span>
            <kbd className="ml-auto text-xs bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-600">N</kbd>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {page === 'dashboard' && (
            <Dashboard onLeadClick={() => setPage('leads')} />
          )}
          {page === 'leads' && (
            <LeadsView
              toast={toast}
              openAddModal={openAddModal}
              setOpenAddModal={setOpenAddModal}
            />
          )}
        </div>
      </main>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
