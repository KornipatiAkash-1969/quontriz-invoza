import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { TopProgressBar } from '../ui';
import AiChatSupport from '../support/AiChatSupport';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    const handleSetSidebar = (e) => {
      if (typeof e.detail === 'boolean') {
        setSidebarOpen(e.detail);
      }
    };
    window.addEventListener('set-mobile-sidebar-open', handleSetSidebar);
    return () => window.removeEventListener('set-mobile-sidebar-open', handleSetSidebar);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <TopProgressBar />
      {/* Sidebar */}
      <div className="no-print">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <div className="no-print">
          <TopNav onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        </div>
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global AI Chat Support Assistant & Helpdesk */}
      <div className="no-print">
        <AiChatSupport />
      </div>
    </div>
  );
}
