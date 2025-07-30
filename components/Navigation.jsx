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
  // Full text should display at 100% zoom, abbreviations only when space genuinely requires it
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dash', icon: HomeIcon },
    { id: 'members', label: 'People', shortLabel: 'People', icon: UserGroupIcon },
    { id: 'giving', label: 'Giving', shortLabel: 'Give', icon: CurrencyDollarIcon },
    { id: 'groups', label: 'Groups', shortLabel: 'Groups', icon: UsersIcon },
    { id: 'events', label: 'Events', shortLabel: 'Events', icon: CalendarIcon },
    { id: 'church-app', label: 'Church App', shortLabel: 'App', icon: DevicePhoneMobileIcon },
    { id: 'forms', label: 'Forms', shortLabel: 'Forms', icon: DocumentTextIcon },
    { id: 'calendar', label: 'Calendar', shortLabel: 'Cal', icon: CalendarIcon },
    { id: 'workflows', label: 'Workflows', shortLabel: 'Work', icon: Cog8ToothIcon },
    { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: ChartBarIcon },
    { id: 'settings', label: 'Settings', shortLabel: 'Set', icon: Cog6ToothIcon },
  ];

  // State management for responsive navigation
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [navigationMode, setNavigationMode] = useState('full'); // 'full', 'compact', 'icon', 'mobile'
  const [visibleItemsCount, setVisibleItemsCount] = useState(4);
  
  const moreButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  const navContainerRef = useRef(null);
  
  // Enhanced text measurement function for accurate space calculation
  const measureNavigationText = useCallback((items, mode) => {
    if (typeof window === 'undefined') return 0;
    
    // Create temporary measurement element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set font to match navigation styling
    const fontSize = mode === 'compact' ? '15px' : '16px';
    const fontWeight = '600';
    context.font = `${fontWeight} ${fontSize} Inter, system-ui, sans-serif`;
    
    let totalWidth = 0;
    
    items.forEach(item => {
      const text = mode === 'compact' ? (item.shortLabel || item.label) : item.label;
      const textWidth = context.measureText(text).width;
      // Add icon width (20px) + icon margin (12px) + padding (32px) + border/margin (8px)
      const itemWidth = textWidth + 72;
      totalWidth += itemWidth;
    });
    
    // Add spacing between items (8px per gap)
    totalWidth += (items.length - 1) * 8;
    
    return totalWidth;
  }, []);
  
  // Proper space calculation based on actual container dimensions
  const calculateNavigationMode = useCallback(() => {
    if (typeof window === 'undefined') {
      return { mode: 'full', visibleCount: 4 };
    }
    
    const windowWidth = window.innerWidth;
    
    // Mobile detection - always use mobile layout on small screens
    if (windowWidth < 768) {
      return { mode: 'mobile', visibleCount: 3 };
    }
    
    // Get actual container element for precise measurements
    const navContainer = navContainerRef.current;
    let availableWidth;
    
    if (navContainer) {
      // Use actual container width when available
      const containerRect = navContainer.getBoundingClientRect();
      availableWidth = containerRect.width;
    } else {
      // Fallback calculation: window width minus logo area (320px) and user area (280px)
      availableWidth = windowWidth - 600;
    }
    
    // Ensure minimum available width
    availableWidth = Math.max(availableWidth, 200);
    
    // Calculate space needed for different navigation modes
    const visibleItems = navItems.slice(0, 4); // Always try to show first 4 items
    const hiddenItemsCount = Math.max(0, navItems.length - 4);
    
    // Add space for "More" button if there are hidden items (80px)
    const moreButtonWidth = hiddenItemsCount > 0 ? 80 : 0;
    const bufferSpace = 40; // Comfortable buffer to prevent cramping
    
    // Measure actual text width for full mode
    const fullModeWidth = measureNavigationText(visibleItems, 'full') + moreButtonWidth + bufferSpace;
    
    // At 100% zoom, prefer full text when space allows with generous buffer
    if (availableWidth >= fullModeWidth) {
      return { mode: 'full', visibleCount: 4 };
    }
    
    // Measure actual text width for compact mode
    const compactModeWidth = measureNavigationText(visibleItems, 'compact') + moreButtonWidth + bufferSpace;
    
    if (availableWidth >= compactModeWidth) {
      return { mode: 'compact', visibleCount: 4 };
    }
    
    // If neither full nor compact fits, try fewer items in compact mode
    for (let itemCount = 3; itemCount >= 2; itemCount--) {
      const reducedItems = navItems.slice(0, itemCount);
      const reducedCompactWidth = measureNavigationText(reducedItems, 'compact') + 80 + bufferSpace; // Always need More button
      
      if (availableWidth >= reducedCompactWidth) {
        return { mode: 'compact', visibleCount: itemCount };
      }
    }
    
    // Icon mode with tooltips as last resort
    const iconModeWidth = (60 * 4) + moreButtonWidth + bufferSpace; // 60px per icon item
    
    if (availableWidth >= iconModeWidth) {
      return { mode: 'icon', visibleCount: 4 };
    }
    
    // Final fallback - minimal icon mode
    return { mode: 'icon', visibleCount: 3 };
  }, [navItems, measureNavigationText]);
  
  // Update navigation mode on resize and zoom
  const updateNavigationMode = useCallback(() => {
    const { mode, visibleCount } = calculateNavigationMode();
    setNavigationMode(mode);
    setVisibleItemsCount(visibleCount);
  }, [calculateNavigationMode]);
  
  // Enhanced resize and zoom detection for proper text display
  useEffect(() => {
    // Initial calculation
    updateNavigationMode();
    
    const handleResize = () => {
      // Debounce resize events for better performance
      clearTimeout(window.navigationResizeTimeout);
      window.navigationResizeTimeout = setTimeout(() => {
        updateNavigationMode();
      }, 100);
    };
    
    const handleZoom = () => {
      // Handle zoom changes immediately for responsive feel
      updateNavigationMode();
    };
    
    // Listen for window resize events
    window.addEventListener('resize', handleResize);
    
    // Listen for visual viewport changes (better zoom detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleZoom);
    }
    
    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleResize);
    
    // Set up ResizeObserver for the navigation container if available
    let resizeObserver;
    if (navContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateNavigationMode();
      });
      resizeObserver.observe(navContainerRef.current);
    }
    
    return () => {
      clearTimeout(window.navigationResizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleZoom);
      }
      
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateNavigationMode]);
  
  // Calculate visible and hidden nav items based on current mode
  const visibleNavItems = navItems.slice(0, visibleItemsCount);
  const hiddenNavItems = navItems.slice(visibleItemsCount);

  // Screen size check for mobile
  const isMobile = () => window.innerWidth < 768 || navigationMode === 'mobile';
  
  // Enhanced debug function for proper text display verification
  const logNavigationState = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      const navContainer = navContainerRef.current;
      const containerWidth = navContainer ? navContainer.getBoundingClientRect().width : 'not available';
      
      // Calculate space requirements for current items
      const visibleItems = navItems.slice(0, visibleItemsCount);
      const fullModeSpace = measureNavigationText(visibleItems, 'full');
      const compactModeSpace = measureNavigationText(visibleItems, 'compact');
      
      console.log('Navigation Text Display State:', {
        windowWidth: window.innerWidth,
        containerWidth: containerWidth,
        navigationMode,
        visibleItemsCount,
        displayingFullText: navigationMode === 'full',
        spaceRequired: {
          fullMode: fullModeSpace,
          compactMode: compactModeSpace
        },
        firstItemLabel: visibleItems[0] ? {
          full: visibleItems[0].label,
          compact: visibleItems[0].shortLabel || visibleItems[0].label,
          displaying: navigationMode === 'full' ? visibleItems[0].label : (visibleItems[0].shortLabel || visibleItems[0].label)
        } : null,
        zoomLevel: `${Math.round((window.outerWidth / window.innerWidth) * 100)}%`
      });
    }
  }, [navigationMode, visibleItemsCount, navItems, measureNavigationText]);
  
  // Log state changes in development
  useEffect(() => {
    logNavigationState();
  }, [logNavigationState]);
  
  // Expose navigation state testing function for browser console (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.testNavigationTextDisplay = () => {
        const results = {
          currentMode: navigationMode,
          windowWidth: window.innerWidth,
          dashboardLabel: navigationMode === 'full' ? 'Dashboard' : 'Dash',
          allLabels: visibleNavItems.map(item => ({
            id: item.id,
            full: item.label,
            compact: item.shortLabel || item.label,
            displaying: navigationMode === 'full' ? item.label : (item.shortLabel || item.label)
          })),
          expectation: {
            at100PercentZoom: 'Should show "Dashboard" in full mode',
            atHigherZoom: 'Should show "Dash" in compact mode when space constrained'
          }
        };
        
        console.log('🚀 Navigation Text Display Test Results:', results);
        
        // Verify Dashboard text specifically
        const dashboardItem = results.allLabels.find(item => item.id === 'dashboard');
        if (dashboardItem) {
          const isShowingFullDashboard = dashboardItem.displaying === 'Dashboard';
          console.log(`✅ Dashboard Display Test: ${isShowingFullDashboard ? 'PASSED' : 'FAILED'}`);
          console.log(`   Expected: "Dashboard" at standard zoom, "Dash" only when constrained`);
          console.log(`   Actual: "${dashboardItem.displaying}"`);
        }
        
        return results;
      };
      
      // Auto-run test on initial load
      setTimeout(() => {
        console.log('🔧 Navigation Test Function Available: window.testNavigationTextDisplay()');
        window.testNavigationTextDisplay();
      }, 2000);
    }
  }, [navigationMode, visibleNavItems]);

  // Debug effect to track dropdown rendering and DOM state
  useEffect(() => {
    if (showMoreDropdown) {
      console.log('🚀 DROPDOWN SHOULD BE VISIBLE NOW');
      console.log('🔍 Dropdown ref:', dropdownRef.current);
      
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        console.log('📐 Dropdown position:', {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0
        });
        
        const styles = getComputedStyle(dropdownRef.current);
        console.log('🎨 Dropdown computed styles:', {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          position: styles.position,
          top: styles.top,
          right: styles.right,
          backgroundColor: styles.backgroundColor,
          transform: styles.transform
        });
        
        console.log('📋 Dropdown innerHTML length:', dropdownRef.current.innerHTML.length);
        console.log('👆 Dropdown children count:', dropdownRef.current.children.length);
      } else {
        console.log('❌ Dropdown ref is null - element not in DOM!');
      }
    } else {
      console.log('📴 Dropdown should be hidden');
    }
  }, [showMoreDropdown]);

  // Effect to handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreDropdown && 
          moreButtonRef.current && 
          !moreButtonRef.current.contains(event.target) &&
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target)) {
        console.log('👆 Clicking outside dropdown, closing');
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
      <nav className={`nav-professional sticky top-0 max-w-full overflow-visible zoom-aware-nav nav-mode-${navigationMode} animate-zoom-transition zoom-smooth zoom-maintain-quality`} role="navigation" aria-label="Main navigation" style={{ zIndex: '1000', position: 'sticky', isolation: 'isolate' }}>
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
                // 'full' mode: Show complete labels like "Dashboard" (preferred at 100% zoom)
                // 'compact' mode: Show abbreviated labels like "Dash" (only when space constrained)
                // 'icon' mode: No labels, just icons with tooltips
                const getLabel = () => {
                  switch (navigationMode) {
                    case 'full':
                      return item.label; // Full professional labels (e.g., "Dashboard")
                    case 'compact':
                      return item.shortLabel || item.label; // Abbreviated when space requires it (e.g., "Dash")
                    case 'icon':
                      return null; // Icon only mode with tooltips
                    default:
                      return item.label; // Default to full labels
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
              
              {/* More Dropdown - AGGRESSIVE Z-INDEX FIX - Adaptive to Navigation Mode */}
              {hiddenNavItems.length > 0 && (
                <div className="relative nav-more-button" style={{ zIndex: '999998 !important', position: 'relative !important', isolation: 'isolate !important' }}>
                  <button
                    ref={moreButtonRef}
                    onClick={() => {
                      console.log('✅ More button clicked:', { 
                        hiddenItems: hiddenNavItems.map(item => item.label),
                        opening: !showMoreDropdown
                      });
                      setShowMoreDropdown(!showMoreDropdown);
                    }}
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
                      className="absolute right-0 mt-3 w-64 rounded-xl shadow-2xl border py-3 animate-slide-up more-dropdown-premium"
                      style={{
                        position: 'absolute',
                        zIndex: '999999',
                        background: 'white',
                        backgroundColor: 'white',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        boxShadow: `
                          0 25px 50px -12px rgba(0, 0, 0, 0.25),
                          0 20px 25px -5px rgba(0, 0, 0, 0.1),
                          0 10px 10px -5px rgba(0, 0, 0, 0.04),
                          0 0 0 1px rgba(0, 0, 0, 0.05),
                          inset 0 1px 0 rgba(255, 255, 255, 0.9)
                        `,
                        backdropFilter: 'blur(8px)',
                        transform: 'translateZ(0)',
                        isolation: 'isolate',
                        willChange: 'transform'
                      }}
                      onMouseEnter={() => {
                        console.log('✅ Dropdown is visible and accessible!');
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
                  onClick={() => {
                    console.log('📱 Mobile More button clicked:', { 
                      showMoreDropdown, 
                      hiddenItems: navItems.slice(3).map(item => item.label)
                    });
                    setShowMoreDropdown(!showMoreDropdown);
                  }}
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
                
                {/* Mobile Dropdown - AGGRESSIVE Z-INDEX FIX */}
                {showMoreDropdown && (
                  <div 
                    className="absolute right-0 bottom-full mb-3 w-56 rounded-xl shadow-large border py-3 animate-slide-up more-dropdown-premium"
                    style={{
                      position: 'absolute !important',
                      zIndex: '999999 !important',
                      background: 'white !important',
                      backgroundColor: 'white !important',
                      border: '1px solid rgba(0, 0, 0, 0.1) !important',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25) !important',
                      backdropFilter: 'blur(8px) !important',
                      transform: 'translateZ(0) !important',
                      isolation: 'isolate !important'
                    }}
                  >
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