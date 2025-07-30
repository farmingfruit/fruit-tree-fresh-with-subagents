import React, { useRef, useEffect, useState } from 'react';
import { 
  HomeIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  CalendarIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  UsersIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  Cog8ToothIcon
} from '@heroicons/react/24/outline';

const Navigation = ({ currentView, onNavigate, user }) => {
  // Define navItems first - proper priority order for church software
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'members', label: 'People', icon: UserGroupIcon },
    { id: 'giving', label: 'Giving', icon: CurrencyDollarIcon },
    { id: 'groups', label: 'Groups', icon: UsersIcon },
    { id: 'events', label: 'Events', icon: CalendarIcon },
    { id: 'church-app', label: 'Church App', icon: DevicePhoneMobileIcon },
    { id: 'forms', label: 'Forms', icon: DocumentTextIcon },
    { id: 'workflows', label: 'Workflows', icon: Cog8ToothIcon },
    { id: 'reports', label: 'Reports', icon: ChartBarIcon },
  ];

  // Simple state for More dropdown
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const moreButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Simple desktop layout - show first 4 nav items, rest in More
  const visibleNavItems = navItems.slice(0, 4);
  const hiddenNavItems = navItems.slice(4);

  // Simple screen size check for mobile
  const isMobile = () => window.innerWidth < 768;

  // Effect to handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreDropdown && 
          moreButtonRef.current && 
          !moreButtonRef.current.contains(event.target) &&
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target)) {
        setShowMoreDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreDropdown]);

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <nav className="nav-professional sticky top-0 z-50" role="navigation" aria-label="Main navigation">
        <div className="w-full mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo and Church Name - Left Section */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="w-12 h-12 logo-premium rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/20">
                <span className="text-white font-bold text-xl tracking-tight">FT</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">Fruit Tree</h2>
                <p className="text-sm text-gray-600 font-medium leading-tight">
                  {user?.church || ''}
                </p>
              </div>
            </div>

            {/* Main Navigation - Center Section */}
            <div className="hidden md:flex items-center space-x-2 flex-1 justify-center max-w-2xl">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`
                      flex items-center px-6 py-3 min-h-[52px] rounded-xl font-semibold text-base
                      whitespace-nowrap transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-800 shadow-primary border border-primary-200/60 ring-1 ring-primary-100' 
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white hover:text-gray-900 hover:shadow-medium border border-gray-100/60 hover:border-gray-200'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                );
              })}
              
              {/* More Dropdown */}
              {hiddenNavItems.length > 0 && (
                <div className="relative">
                  <button
                    ref={moreButtonRef}
                    onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    className={`
                      flex items-center px-6 py-3 min-h-[52px] rounded-xl font-semibold text-base
                      transition-all duration-200
                      ${hiddenNavItems.some(item => item.id === currentView)
                        ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-800 shadow-primary border border-primary-200/60 ring-1 ring-primary-100' 
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white hover:text-gray-900 hover:shadow-medium border border-gray-100/60 hover:border-gray-200'
                      }
                    `}
                  >
                    <span className="mr-2">More</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-all duration-300 ${showMoreDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu - Fixed z-index to appear above everything */}
                  {showMoreDropdown && (
                    <div 
                      ref={dropdownRef}
                      className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-large border border-gray-100/60 py-3 z-[9999] animate-slide-up backdrop-blur-sm ring-1 ring-black/5"
                    >
                      {hiddenNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id);
                              setShowMoreDropdown(false);
                            }}
                            className={`
                              w-full flex items-center px-4 py-3 min-h-[52px] text-left
                              rounded-lg mx-2 transition-all duration-200
                              ${isActive 
                                ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-800 border border-primary-200/60 ring-1 ring-primary-100' 
                                : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white hover:text-gray-900 border border-transparent hover:border-gray-200/60'
                              }
                            `}
                          >
                            <Icon className="w-5 h-5 mr-3" />
                            <span className="font-semibold text-base">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Side - User Menu */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              {/* Settings Button */}
              <button className="p-3 text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white hover:text-gray-900 rounded-xl transition-all duration-200 min-h-[52px] min-w-[52px] flex items-center justify-center border border-gray-100/60 hover:border-gray-200 hover:shadow-medium">
                <Cog6ToothIcon className="w-6 h-6" />
              </button>

              {/* User Profile */}
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200/60">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'Betty Thompson'}</p>
                  <p className="text-xs text-gray-500">{user?.role || 'Administrator'}</p>
                </div>
                <div className="w-11 h-11 logo-premium rounded-full flex items-center justify-center shadow-md ring-2 ring-white/20 hover:ring-primary-200 hover:shadow-lg">
                  <span className="text-white font-bold text-sm tracking-wide">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'BT'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Navigation - Premium Mobile Experience */}
          <div className="md:hidden border-t border-gray-200/60 py-2.5 bg-gradient-to-b from-gray-50/40 to-white/95 overflow-x-hidden backdrop-blur-sm">
            <div className="flex justify-around px-2 gap-1">
              {navItems.slice(0, 3).map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`
                      flex flex-col items-center py-2.5 px-1.5 min-h-[56px] min-w-[72px] max-w-[88px] rounded-xl nav-item-responsive group flex-shrink-0 transition-all duration-200 relative overflow-hidden
                      ${isActive 
                        ? 'text-primary-700 bg-gradient-to-b from-primary-50/90 to-primary-100/90 border border-primary-200/70 shadow-primary ring-1 ring-primary-100/50 backdrop-blur-sm' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-b hover:from-gray-50/80 hover:to-white/90 border border-gray-100/60 hover:border-gray-200/80 hover:shadow-soft backdrop-blur-sm'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 transition-all duration-200 group-hover:scale-110 mb-0.5" />
                    <span className="text-xs font-semibold text-center truncate w-full leading-tight">{item.label}</span>
                  </button>
                );
              })}
              
              {/* Mobile More Button */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  className={`
                    flex flex-col items-center py-2.5 px-1.5 min-h-[56px] min-w-[72px] max-w-[88px] rounded-xl nav-item-responsive group flex-shrink-0 transition-all duration-200 relative overflow-hidden
                    ${navItems.slice(3).some(item => item.id === currentView) || showMoreDropdown
                      ? 'text-primary-700 bg-gradient-to-b from-primary-50/90 to-primary-100/90 border border-primary-200/70 shadow-primary ring-1 ring-primary-100/50 backdrop-blur-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-b hover:from-gray-50/80 hover:to-white/90 border border-gray-100/60 hover:border-gray-200/80 hover:shadow-soft backdrop-blur-sm'
                    }
                  `}
                >
                  <ChevronDownIcon className={`w-5 h-5 transition-all duration-300 ${showMoreDropdown ? 'rotate-180 scale-110' : ''} group-hover:scale-110 mb-0.5`} />
                  <span className="text-xs font-semibold text-center truncate w-full leading-tight">More</span>
                </button>
                
                {/* Mobile Dropdown - Higher z-index */}
                {showMoreDropdown && (
                  <div className="absolute right-0 bottom-full mb-3 w-56 bg-white/96 rounded-xl shadow-large border border-gray-100/60 py-3 z-[9999] animate-slide-up backdrop-blur-md ring-1 ring-black/5 more-dropdown-premium">
                    {navItems.slice(3).map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onNavigate(item.id);
                            setShowMoreDropdown(false);
                          }}
                          className={`
                            w-full flex items-center px-4 py-3.5 min-h-[56px] text-left
                            nav-item-responsive rounded-lg mx-2 group relative overflow-hidden transition-all duration-200
                            ${isActive 
                              ? 'bg-gradient-to-r from-primary-50/90 to-primary-100/90 text-primary-800 border border-primary-200/70 ring-1 ring-primary-100/50 shadow-primary/50' 
                              : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-white/90 hover:text-gray-900 border border-transparent hover:border-gray-200/60 hover:shadow-soft'
                            }
                          `}
                        >
                          <Icon className="w-5 h-5 mr-3 transition-all duration-200 group-hover:scale-110 flex-shrink-0" />
                          <span className="font-semibold text-base leading-tight">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;