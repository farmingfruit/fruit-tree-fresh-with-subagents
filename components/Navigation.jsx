import React, { useRef, useEffect, useState, useCallback } from 'react';
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
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dash', icon: HomeIcon },
    { id: 'members', label: 'People', shortLabel: 'People', icon: UserGroupIcon },
    { id: 'giving', label: 'Giving', shortLabel: 'Give', icon: CurrencyDollarIcon },
    { id: 'groups', label: 'Groups', shortLabel: 'Groups', icon: UsersIcon },
    { id: 'events', label: 'Events', shortLabel: 'Events', icon: CalendarIcon },
    { id: 'church-app', label: 'Church App', shortLabel: 'App', icon: DevicePhoneMobileIcon },
    { id: 'forms', label: 'Forms', shortLabel: 'Forms', icon: DocumentTextIcon },
    { id: 'workflows', label: 'Workflows', shortLabel: 'Flow', icon: Cog8ToothIcon },
    { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: ChartBarIcon },
  ];

  // State management for responsive navigation
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [navigationMode, setNavigationMode] = useState('full'); // 'full', 'compact', 'icon', 'mobile'
  const [visibleItemsCount, setVisibleItemsCount] = useState(4);
  
  const moreButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  const navContainerRef = useRef(null);
  
  // Zoom-aware responsive calculation
  const calculateNavigationMode = useCallback(() => {
    const effectiveWidth = window.innerWidth;
    const availableNavSpace = effectiveWidth - 320 - 280; // Logo area + right side area
    
    // Calculate space needed for navigation items
    const fullItemWidth = 140; // Approximate width per full navigation item
    const compactItemWidth = 100; // Approximate width per compact item
    const iconItemWidth = 60; // Approximate width per icon-only item
    const moreButtonWidth = 80; // More button width
    
    // Determine optimal mode based on available space
    if (effectiveWidth < 768) {
      return { mode: 'mobile', visibleCount: 3 };
    }
    
    // For zoom levels, we need to be more aggressive about switching modes
    // Zoom makes everything appear larger, so effective space is reduced
    const zoomFactor = Math.min(window.devicePixelRatio || 1, 2);
    const adjustedSpace = availableNavSpace / Math.max(zoomFactor * 0.8, 1);
    
    // Full mode - show all text labels
    if (adjustedSpace >= (4 * fullItemWidth + moreButtonWidth)) {
      return { mode: 'full', visibleCount: 4 };
    }
    
    // Compact mode - show shortened labels
    if (adjustedSpace >= (4 * compactItemWidth + moreButtonWidth)) {
      return { mode: 'compact', visibleCount: 4 };
    }
    
    // Icon mode - icons only with tooltips
    if (adjustedSpace >= (4 * iconItemWidth + moreButtonWidth)) {
      return { mode: 'icon', visibleCount: 4 };
    }
    
    // Determine how many items we can fit
    const maxVisibleInCompact = Math.floor((adjustedSpace - moreButtonWidth) / compactItemWidth);
    const maxVisibleInIcon = Math.floor((adjustedSpace - moreButtonWidth) / iconItemWidth);
    
    if (maxVisibleInCompact >= 3) {
      return { mode: 'compact', visibleCount: Math.min(maxVisibleInCompact, 4) };
    }
    
    if (maxVisibleInIcon >= 3) {
      return { mode: 'icon', visibleCount: Math.min(maxVisibleInIcon, 4) };
    }
    
    // Last resort - mobile layout
    return { mode: 'mobile', visibleCount: 3 };
  }, []);
  
  // Update navigation mode on resize and zoom
  const updateNavigationMode = useCallback(() => {
    const { mode, visibleCount } = calculateNavigationMode();
    setNavigationMode(mode);
    setVisibleItemsCount(visibleCount);
  }, [calculateNavigationMode]);
  
  // Set up resize and zoom detection
  useEffect(() => {
    updateNavigationMode();
    
    const handleResize = () => {
      updateNavigationMode();
    };
    
    // Listen for both resize and zoom events
    window.addEventListener('resize', handleResize);
    
    // Also listen for visual viewport changes (better zoom detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [updateNavigationMode]);
  
  // Calculate visible and hidden nav items based on current mode
  const visibleNavItems = navItems.slice(0, visibleItemsCount);
  const hiddenNavItems = navItems.slice(visibleItemsCount);

  // Screen size check for mobile
  const isMobile = () => window.innerWidth < 768 || navigationMode === 'mobile';
  
  // Debug function for zoom level testing (only in development)
  const logNavigationState = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Navigation State:', {
        windowWidth: window.innerWidth,
        navigationMode,
        visibleItemsCount,
        devicePixelRatio: window.devicePixelRatio || 1,
        effectiveZoom: Math.min(window.devicePixelRatio || 1, 2)
      });
    }
  }, [navigationMode, visibleItemsCount]);
  
  // Log state changes in development
  useEffect(() => {
    logNavigationState();
  }, [logNavigationState]);

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
      <nav className={`nav-professional sticky top-0 z-50 max-w-full overflow-hidden zoom-aware-nav nav-mode-${navigationMode} animate-zoom-transition zoom-smooth zoom-maintain-quality`} role="navigation" aria-label="Main navigation">
        <div className="w-full mx-auto px-4 lg:px-8 max-w-full">
          <div className="nav-main-container h-20">
            {/* Logo and Church Name - Enhanced Premium Left Section */}
            <div className="flex items-center space-x-3 flex-shrink-0 min-w-0 group" style={{ maxWidth: navigationMode === 'icon' ? '200px' : '280px' }}>
              <div className="w-12 h-12 logo-premium rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/20 flex-shrink-0 relative overflow-hidden group-hover:scale-105 transition-all duration-300">
                {/* Premium logo shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                <span className="text-white font-bold text-xl tracking-tight relative z-10">FT</span>
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-300 group-hover:text-primary-800">
                  Fruit Tree
                </h2>
                <p className="text-sm text-gray-600 font-medium leading-tight overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-300 group-hover:text-gray-700" title={user?.church || ''}>
                  {user?.church || ''}
                </p>
              </div>
            </div>

            {/* Main Navigation - Center Section with Progressive Compression */}
            <div className={`nav-center-section hidden md:flex items-center transition-all duration-300 nav-container animate-nav-mode-change zoom-smooth ${
              navigationMode === 'icon' ? 'space-x-1' : 'space-x-2'
            }`} ref={navContainerRef}>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                // Determine label based on navigation mode
                const getLabel = () => {
                  switch (navigationMode) {
                    case 'full':
                      return item.label;
                    case 'compact':
                      return item.shortLabel || item.label;
                    case 'icon':
                      return null; // Icon only
                    default:
                      return item.label;
                  }
                };
                
                const label = getLabel();
                const showLabel = label !== null;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={navigationMode === 'icon' ? item.label : undefined}
                    className={`
                      nav-item-container nav-item flex items-center rounded-xl font-semibold transition-all duration-300 ease-out
                      ${navigationMode === 'icon' 
                        ? 'p-3 min-h-[48px] min-w-[48px] justify-center relative group' 
                        : 'px-4 py-3 min-h-[52px] relative group'
                      }
                      whitespace-nowrap overflow-hidden
                      ${isActive 
                        ? `bg-gradient-to-r from-primary-50/95 to-primary-100/95 text-primary-800 
                           shadow-lg shadow-primary/20 border border-primary-200/70 
                           ring-2 ring-primary-100/60 backdrop-blur-sm 
                           animate-pulse animation-duration-[3000ms] nav-item-active` 
                        : `text-gray-700 hover:text-gray-900 
                           bg-gradient-to-r from-white/90 to-gray-50/95 
                           hover:from-white hover:to-gray-50/90 
                           border border-gray-100/70 hover:border-gray-200/80 
                           hover:shadow-lg hover:shadow-gray-500/10 
                           backdrop-filter backdrop-blur-sm 
                           transform hover:scale-[1.02] hover:-translate-y-0.5`
                      }
                    `}
                    style={{
                      background: isActive 
                        ? 'linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(219, 234, 254, 0.95) 100%)'
                        : undefined
                    }}
                  >
                    {/* Premium shine effect overlay */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                    
                    <Icon className={`
                      w-5 h-5 ${showLabel ? 'mr-3' : ''} flex-shrink-0 
                      transition-all duration-300 group-hover:scale-110
                      ${isActive ? 'text-primary-700 drop-shadow-sm' : 'text-gray-600 group-hover:text-gray-800'}
                    `} />
                    
                    {showLabel && (
                      <span className={`
                        nav-item-text transition-all duration-300
                        ${navigationMode === 'compact' 
                          ? 'text-sm font-semibold tracking-wide' 
                          : 'text-base font-semibold'
                        }
                        ${isActive 
                          ? 'text-primary-800 font-bold' 
                          : 'text-gray-700 group-hover:text-gray-900'
                        }
                      `}>
                        {label}
                      </span>
                    )}
                    
                    {/* Active indicator for current page */}
                    {isActive && (
                      <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-sm" />
                    )}
                  </button>
                );
              })}
              
              {/* More Dropdown - Adaptive to Navigation Mode */}
              {hiddenNavItems.length > 0 && (
                <div className="relative nav-more-button">
                  <button
                    ref={moreButtonRef}
                    onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    title={navigationMode === 'icon' ? 'More options' : undefined}
                    className={`
                      nav-item-container nav-item flex items-center rounded-xl font-semibold 
                      transition-all duration-300 ease-out relative group
                      ${navigationMode === 'icon' 
                        ? 'p-3 min-h-[48px] min-w-[48px] justify-center' 
                        : 'px-4 py-3 min-h-[52px]'
                      }
                      whitespace-nowrap overflow-hidden
                      ${hiddenNavItems.some(item => item.id === currentView) || showMoreDropdown
                        ? `bg-gradient-to-r from-primary-50/95 to-primary-100/95 text-primary-800 
                           shadow-lg shadow-primary/20 border border-primary-200/70 
                           ring-2 ring-primary-100/60 backdrop-blur-sm nav-item-active` 
                        : `text-gray-700 hover:text-gray-900 
                           bg-gradient-to-r from-white/90 to-gray-50/95 
                           hover:from-white hover:to-gray-50/90 
                           border border-gray-100/70 hover:border-gray-200/80 
                           hover:shadow-lg hover:shadow-gray-500/10 
                           backdrop-filter backdrop-blur-sm 
                           transform hover:scale-[1.02] hover:-translate-y-0.5`
                      }
                    `}
                    style={{
                      background: (hiddenNavItems.some(item => item.id === currentView) || showMoreDropdown)
                        ? 'linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(219, 234, 254, 0.95) 100%)'
                        : undefined
                    }}
                  >
                    {/* Premium shine effect overlay */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                    
                    {navigationMode === 'icon' ? (
                      <ChevronDownIcon className={`
                        w-5 h-5 transition-all duration-300 group-hover:scale-110
                        ${showMoreDropdown ? 'rotate-180 text-primary-700' : 'text-gray-600 group-hover:text-gray-800'}
                      `} />
                    ) : (
                      <>
                        <span className={`
                          nav-item-text mr-2 transition-all duration-300
                          ${navigationMode === 'compact' 
                            ? 'text-sm font-semibold tracking-wide' 
                            : 'text-base font-semibold'
                          }
                          ${(hiddenNavItems.some(item => item.id === currentView) || showMoreDropdown)
                            ? 'text-primary-800 font-bold' 
                            : 'text-gray-700 group-hover:text-gray-900'
                          }
                        `}>More</span>
                        <ChevronDownIcon className={`
                          w-4 h-4 transition-all duration-300 group-hover:scale-110
                          ${showMoreDropdown ? 'rotate-180 text-primary-700' : 'text-gray-600 group-hover:text-gray-800'}
                        `} />
                      </>
                    )}
                    
                    {/* Active indicator */}
                    {(hiddenNavItems.some(item => item.id === currentView) || showMoreDropdown) && (
                      <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-sm" />
                    )}
                  </button>

                  {/* Dropdown Menu - Enhanced for Elderly Users */}
                  {showMoreDropdown && (
                    <div 
                      ref={dropdownRef}
                      className="absolute right-0 mt-3 w-64 bg-white/98 rounded-xl shadow-2xl border border-gray-100/80 py-3 z-[9999] animate-slide-up backdrop-blur-lg ring-1 ring-black/10 more-dropdown-premium"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
                        boxShadow: `
                          0 20px 25px -5px rgba(0, 0, 0, 0.1),
                          0 10px 10px -5px rgba(0, 0, 0, 0.04),
                          0 0 0 1px rgba(0, 0, 0, 0.05),
                          inset 0 1px 0 rgba(255, 255, 255, 0.9)
                        `
                      }}
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
                              rounded-lg mx-2 transition-all duration-300 ease-out relative group
                              ${isActive 
                                ? `bg-gradient-to-r from-primary-50/95 to-primary-100/95 text-primary-800 
                                   border border-primary-200/70 ring-2 ring-primary-100/60 
                                   shadow-md shadow-primary/10 backdrop-blur-sm` 
                                : `text-gray-700 hover:text-gray-900 
                                   hover:bg-gradient-to-r hover:from-gray-50/90 hover:to-white/95 
                                   border border-transparent hover:border-gray-200/60 
                                   hover:shadow-md hover:shadow-gray-500/5 
                                   transform hover:scale-[1.01] hover:-translate-y-0.5`
                              }
                            `}
                            style={{
                              background: isActive 
                                ? 'linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(219, 234, 254, 0.95) 100%)'
                                : undefined
                            }}
                          >
                            {/* Premium shine effect */}
                            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                            
                            <Icon className={`
                              w-5 h-5 mr-3 flex-shrink-0 transition-all duration-300 group-hover:scale-110
                              ${isActive ? 'text-primary-700' : 'text-gray-600 group-hover:text-gray-800'}
                            `} />
                            
                            <span className={`
                              font-semibold text-base nav-item-text transition-all duration-300
                              ${isActive 
                                ? 'text-primary-800 font-bold' 
                                : 'text-gray-700 group-hover:text-gray-900'
                              }
                            `}>{item.label}</span>
                            
                            {/* Active indicator */}
                            {isActive && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-primary-500 rounded-full shadow-sm" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Side - Enhanced Premium User Menu */}
            <div className="flex items-center space-x-3 flex-shrink-0 min-w-0">
              {/* Settings Button - Premium Enhancement */}
              <button className="p-3 text-gray-600 hover:text-gray-900 rounded-xl transition-all duration-300 min-h-[52px] min-w-[52px] flex items-center justify-center border border-gray-100/70 hover:border-gray-200/80 flex-shrink-0 relative group bg-gradient-to-r from-white/90 to-gray-50/95 hover:from-white hover:to-gray-50/90 hover:shadow-lg hover:shadow-gray-500/10 backdrop-blur-sm transform hover:scale-105">
                {/* Premium shine effect */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                <Cog6ToothIcon className="w-6 h-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
              </button>

              {/* User Profile - Premium Enhancement */}
              <div className="flex items-center space-x-3 pl-3 border-l border-gray-200/60 min-w-0 group">
                <div className="text-right min-w-0 hidden lg:block">
                  <p className="text-sm font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-300 group-hover:text-primary-800">
                    {user?.name || 'Betty Thompson'}
                  </p>
                  <p className="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-300 group-hover:text-gray-600">
                    {user?.role || 'Administrator'}
                  </p>
                </div>
                <div className="w-11 h-11 logo-premium rounded-full flex items-center justify-center shadow-md ring-2 ring-white/20 hover:ring-primary-200/60 hover:shadow-lg flex-shrink-0 relative overflow-hidden transition-all duration-300 group-hover:scale-110 cursor-pointer">
                  {/* Premium avatar shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                  <span className="text-white font-bold text-sm tracking-wide relative z-10">
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