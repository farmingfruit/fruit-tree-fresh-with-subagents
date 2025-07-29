import React from 'react';
import { 
  HomeIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  CalendarIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const Navigation = ({ currentView, onNavigate, user }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'members', label: 'Members', icon: UserGroupIcon },
    { id: 'giving', label: 'Giving', icon: CurrencyDollarIcon },
    { id: 'events', label: 'Events', icon: CalendarIcon },
    { id: 'reports', label: 'Reports', icon: ChartBarIcon },
  ];

  return (
    <nav className="bg-white border-b-2 border-gray-200 sticky top-0 z-40 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo and Church Name */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">FT</span>
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-semibold text-gray-900">Fruit Tree</h2>
                <p className="text-sm text-gray-500">{user.church}</p>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    flex items-center px-6 py-3 min-h-[48px] rounded-lg font-medium text-base
                    transition-all duration-200 transform hover:scale-[1.02]
                    ${isActive 
                      ? 'bg-primary-100 text-primary-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Side - User Menu */}
          <div className="flex items-center space-x-4">
            {/* Church Switcher (for multi-church users) */}
            <button className="hidden lg:flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="text-sm font-medium">{user.church}</span>
              <ChevronDownIcon className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Cog6ToothIcon className="w-6 h-6" />
            </button>

            {/* User Profile */}
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 py-2">
          <div className="flex justify-around">
            {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    flex flex-col items-center py-2 px-3 rounded-lg
                    ${isActive 
                      ? 'text-primary-600' 
                      : 'text-gray-600'
                    }
                  `}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs mt-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;