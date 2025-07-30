import React, { useRef, useEffect, useState } from 'react';
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
  // Define navItems first
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'members', label: 'Members', icon: UserGroupIcon },
    { id: 'giving', label: 'Giving', icon: CurrencyDollarIcon },
    { id: 'events', label: 'Events', icon: CalendarIcon },
    { id: 'reports', label: 'Reports', icon: ChartBarIcon },
  ];

  // Refs for measurement
  const containerRef = useRef(null);
  const logoAreaRef = useRef(null);
  const navItemsContainerRef = useRef(null);
  const userAreaRef = useRef(null);
  const navItemRefs = useRef({});

  // State for tracking measurements
  const [measurements, setMeasurements] = useState({
    containerWidth: 0,
    logoAreaWidth: 0,
    userAreaWidth: 0,
    availableNavSpace: 0,
    navItemWidths: {},
    totalNavItemsWidth: 0,
    overflowItems: []
  });

  // State for More dropdown
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [visibleItems, setVisibleItems] = useState(navItems.map(item => item.id));
  const [hiddenItems, setHiddenItems] = useState([]);
  const moreButtonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Measurement function
  const measureNavigation = () => {
    if (!containerRef.current || !logoAreaRef.current || !userAreaRef.current || !navItemsContainerRef.current) {
      return;
    }

    const containerWidth = containerRef.current.offsetWidth;
    const logoAreaWidth = logoAreaRef.current.offsetWidth;
    const userAreaWidth = userAreaRef.current.offsetWidth;
    
    // Account for padding/margins - the container has px-4 sm:px-6 lg:px-8
    const containerPadding = window.innerWidth >= 1024 ? 64 : (window.innerWidth >= 640 ? 48 : 32); // lg:px-8, sm:px-6, px-4
    
    const availableNavSpace = containerWidth - logoAreaWidth - userAreaWidth - containerPadding;

    // Measure individual navigation items
    const navItemWidths = {};
    let totalNavItemsWidth = 0;

    navItems.forEach(item => {
      const element = navItemRefs.current[item.id];
      if (element) {
        const width = element.offsetWidth;
        navItemWidths[item.id] = width;
        totalNavItemsWidth += width;
      }
    });

    // Measure More button width (estimate if not rendered yet)
    const moreButtonWidth = moreButtonRef.current ? moreButtonRef.current.offsetWidth : 120; // Estimate 120px for "More" button

    // Account for space-x-2 between nav items (8px * (items - 1))
    const spacingBetweenItems = (navItems.length - 1) * 8;
    totalNavItemsWidth += spacingBetweenItems;

    // Determine which items would overflow - now accounting for More button
    const overflowItems = [];
    const visibleItemsList = [];
    let runningWidth = 0;
    let needsMore = false;
    
    // First pass: check if everything fits
    navItems.forEach(item => {
      const itemWidth = navItemWidths[item.id] || 0;
      const itemSpacing = runningWidth > 0 ? 8 : 0; // space-x-2
      
      if (runningWidth + itemWidth + itemSpacing > availableNavSpace) {
        needsMore = true;
      }
      runningWidth += itemWidth + itemSpacing;
    });

    // Second pass: if we need More button, recalculate with its width
    runningWidth = 0;
    if (needsMore) {
      const availableSpaceWithMore = availableNavSpace - moreButtonWidth - 8; // -8 for spacing before More
      
      navItems.forEach(item => {
        const itemWidth = navItemWidths[item.id] || 0;
        const itemSpacing = runningWidth > 0 ? 8 : 0; // space-x-2
        
        if (runningWidth + itemWidth + itemSpacing <= availableSpaceWithMore) {
          visibleItemsList.push(item.id);
          runningWidth += itemWidth + itemSpacing;
        } else {
          overflowItems.push(item.id);
        }
      });
    } else {
      // Everything fits, all items are visible
      visibleItemsList.push(...navItems.map(item => item.id));
    }

    // Update state with visible/hidden items
    setVisibleItems(visibleItemsList);
    setHiddenItems(overflowItems);

    const newMeasurements = {
      containerWidth,
      logoAreaWidth,
      userAreaWidth,
      availableNavSpace,
      navItemWidths,
      totalNavItemsWidth,
      overflowItems
    };

    setMeasurements(newMeasurements);

    // Console logging with clear structure
    console.group('[Navigation Measurement] Layout Analysis');
    console.log('📐 Container width:', containerWidth + 'px');
    console.log('🏷️  Logo area width:', logoAreaWidth + 'px');
    console.log('👤 User area width:', userAreaWidth + 'px');
    console.log('📏 Available navigation space:', availableNavSpace + 'px');
    console.log('📊 Individual navigation item widths:', navItemWidths);
    console.log('📈 Total navigation items width:', totalNavItemsWidth + 'px');
    console.log('⚠️  Items that would overflow:', overflowItems.length > 0 ? overflowItems : 'None');
    
    if (overflowItems.length > 0) {
      console.warn('🔄 Overflow detected! Items needing "More" dropdown:', overflowItems);
      console.log('👁️  Visible items:', visibleItemsList);
      console.log('📦 Hidden items (in More):', overflowItems);
      console.log('🔽 More button width:', moreButtonWidth + 'px');
      console.log('📐 Available space with More button:', availableNavSpace - moreButtonWidth - 8 + 'px');
    } else {
      console.log('✅ All navigation items fit comfortably');
    }
    
    console.log('🖥️  Screen size category:', 
      window.innerWidth >= 1024 ? 'Desktop (lg+)' : 
      window.innerWidth >= 768 ? 'Tablet (md+)' : 
      'Mobile'
    );
    console.groupEnd();
  };

  // Effect for initial measurement and resize handling
  useEffect(() => {
    // Initial measurement after component mounts
    const measureWithDelay = () => {
      setTimeout(() => {
        measureNavigation();
      }, 100); // Small delay to ensure DOM is fully rendered
    };

    measureWithDelay();

    // ResizeObserver for responsive measurements
    const resizeObserver = new ResizeObserver((entries) => {
      // Debounce measurements to avoid excessive calls
      clearTimeout(window.navigationMeasurementTimeout);
      window.navigationMeasurementTimeout = setTimeout(() => {
        console.log('[Navigation Measurement] Window resized, re-measuring...');
        measureNavigation();
      }, 150);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also listen to window resize as backup
    const handleResize = () => {
      clearTimeout(window.navigationMeasurementTimeout);
      window.navigationMeasurementTimeout = setTimeout(() => {
        console.log('[Navigation Measurement] Window resize event, re-measuring...');
        measureNavigation();
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      clearTimeout(window.navigationMeasurementTimeout);
    };
  }, [currentView]); // Re-measure when current view changes (affects active state styling)

  // Effect to re-measure when user prop changes (affects rendered content)
  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        console.log('[Navigation Measurement] User data changed, re-measuring...');
        measureNavigation();
      }, 100);
    }
  }, [user?.name, user?.church, user?.role]);

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
    <nav className="bg-white border-b-2 border-gray-200 sticky top-0 z-40 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={containerRef}>
        <div className="flex justify-between items-center h-20">
          {/* Logo and Church Name */}
          <div className="flex items-center space-x-4" ref={logoAreaRef}>
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
          <div className="hidden md:flex items-center space-x-2" ref={navItemsContainerRef}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isVisible = visibleItems.includes(item.id);
              
              return (
                <button
                  key={item.id}
                  ref={(el) => navItemRefs.current[item.id] = el}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    flex items-center px-6 py-3 min-h-[48px] rounded-lg font-medium text-base
                    transition-all duration-200 transform hover:scale-[1.02]
                    ${isActive 
                      ? 'bg-primary-100 text-primary-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${!isVisible ? 'hidden' : ''}
                  `}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {item.label}
                </button>
              );
            })}

            {/* More Dropdown */}
            {hiddenItems.length > 0 && (
              <div className="relative">
                <button
                  ref={moreButtonRef}
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  className={`
                    flex items-center px-6 py-3 min-h-[48px] rounded-lg font-medium text-base
                    transition-all duration-200 transform hover:scale-[1.02]
                    ${hiddenItems.includes(currentView)
                      ? 'bg-primary-100 text-primary-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <span className="mr-2">More</span>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${showMoreDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showMoreDropdown && (
                  <div 
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                  >
                    {navItems
                      .filter(item => hiddenItems.includes(item.id))
                      .map((item) => {
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
                              w-full flex items-center px-4 py-3 min-h-[48px] text-left
                              transition-all duration-200
                              ${isActive 
                                ? 'bg-primary-100 text-primary-700' 
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }
                            `}
                          >
                            <Icon className="w-5 h-5 mr-3" />
                            <span className="font-medium text-base">{item.label}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - User Menu */}
          <div className="flex items-center space-x-4" ref={userAreaRef}>
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