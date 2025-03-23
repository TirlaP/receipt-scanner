import { FC } from 'react';

interface HeaderProps {
  activeTab: 'dashboard' | 'scan' | 'export';
  setActiveTab: (tab: 'dashboard' | 'scan' | 'export') => void;
}

const Header: FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="bg-primary-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold mb-4 sm:mb-0">Receipt Scanner</h1>
          
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-white text-primary-600 font-medium'
                  : 'hover:bg-primary-500'
              }`}
            >
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveTab('scan')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'scan'
                  ? 'bg-white text-primary-600 font-medium'
                  : 'hover:bg-primary-500'
              }`}
            >
              Scan Receipt
            </button>
            
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'export'
                  ? 'bg-white text-primary-600 font-medium'
                  : 'hover:bg-primary-500'
              }`}
            >
              Export
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;