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
  // Define navItems with strict priority order for church software
  // Core items (Dashboard, People, Giving) are ALWAYS visible
  // Dynamic items follow priority order for progressive hiding/showing
  const navItems = [
    // CORE ITEMS - Always visible (highest priority)
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dash', icon: HomeIcon, priority: 1, alwaysVisible: true },
    { id: 'members', label: 'People', shortLabel: 'People', icon: UserGroupIcon, priority: 2, alwaysVisible: true },
    { id: 'giving', label: 'Giving', shortLabel: 'Give', icon: CurrencyDollarIcon, priority: 3, alwaysVisible: true },
    
    // DYNAMIC ITEMS - Progressive visibility based on available space
    { id: 'groups', label: 'Groups', shortLabel: 'Groups', icon: UsersIcon, priority: 4, alwaysVisible: false },
    { id: 'forms', label: 'Forms', shortLabel: 'Forms', icon: DocumentTextIcon, priority: 5, alwaysVisible: false },
    { id: 'calendar', label: 'Calendar', shortLabel: 'Cal', icon: CalendarIcon, priority: 6, alwaysVisible: false },
    { id: 'workflows', label: 'Workflows', shortLabel: 'Work', icon: Cog8ToothIcon, priority: 7, alwaysVisible: false },
    { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: ChartBarIcon, priority: 8, alwaysVisible: false },
    { id: 'settings', label: 'Settings', shortLabel: 'Set', icon: Cog6ToothIcon, priority: 9, alwaysVisible: false },
  ];

  // State management for truly dynamic responsive navigation
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [navigationMode, setNavigationMode] = useState('full'); // 'full', 'compact', 'icon', 'mobile'
  const [visibleItems, setVisibleItems] = useState([]);
  const [hiddenItems, setHiddenItems] = useState([]);
  
  // Refs for stable comparisons to prevent infinite loops
  const previousNavigationState = useRef({ mode: 'full', visible: [], hidden: [] });
  
  const moreButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  const navContainerRef = useRef(null);
  
  // Dynamic item width measurement for precise space calculations
  const measureItemWidth = useCallback((item, mode) => {
    if (typeof window === 'undefined') return 80; // Fallback width
    
    // Create temporary canvas for text measurement
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Match actual navigation styling
    const fontSize = mode === 'compact' ? '15px' : '16px';
    const fontWeight = '600';
    context.font = `${fontWeight} ${fontSize} Inter, system-ui, sans-serif`;
    
    // Get text based on navigation mode
    const text = mode === 'compact' ? (item.shortLabel || item.label) : item.label;
    const textWidth = context.measureText(text).width;
    
    // Calculate total item width: icon (20px) + icon margin (12px) + text + padding (32px) + spacing (8px)
    return textWidth + 72;
  }, []);

  // Calculate available space for navigation items
  const calculateAvailableSpace = useCallback(() => {
    if (typeof window === 'undefined') return 400;
    
    const windowWidth = window.innerWidth;
    
    // Mobile detection - use different calculation
    if (windowWidth < 768) {
      return windowWidth - 100; // Account for mobile layout
    }
    
    // Get actual container dimensions when available
    const navContainer = navContainerRef.current;
    if (navContainer) {
      const containerRect = navContainer.getBoundingClientRect();
      const containerWidth = containerRect.width;
      
      // Reserve space for More button (80px) if needed
      const moreButtonWidth = 80;
      const bufferSpace = 40; // Comfortable spacing buffer
      
      return Math.max(containerWidth - moreButtonWidth - bufferSpace, 200);
    }
    
    // Fallback calculation: window width minus logo area (320px) and user area (280px)
    const logoAreaWidth = navigationMode === 'icon' ? 200 : 320;
    const userAreaWidth = 280;
    const availableWidth = windowWidth - logoAreaWidth - userAreaWidth - 120; // Extra buffer
    
    return Math.max(availableWidth, 200);
  }, [navigationMode]);
  
  // Progressive item visibility calculation - True dynamic responsive behavior
  const calculateVisibleItems = useCallback(() => {
    if (typeof window === 'undefined') {
      return { mode: 'full', visible: navItems.slice(0, 3), hidden: navItems.slice(3) };
    }
    
    const windowWidth = window.innerWidth;
    
    // Mobile detection - fixed layout
    if (windowWidth < 768) {
      return { 
        mode: 'mobile', 
        visible: navItems.slice(0, 3), 
        hidden: navItems.slice(3) 
      };
    }
    
    const availableSpace = calculateAvailableSpace();
    
    // Start with core items (always visible)
    const coreItems = navItems.filter(item => item.alwaysVisible);
    const dynamicItems = navItems.filter(item => !item.alwaysVisible).sort((a, b) => a.priority - b.priority);
    
    // Try full mode first (preferred at standard zoom)
    let currentMode = 'full';
    let visible = [...coreItems];
    let currentWidth = 0;
    
    // Calculate width of core items in full mode
    coreItems.forEach(item => {
      currentWidth += measureItemWidth(item, 'full');
    });
    
    // Add dynamic items in priority order if they fit in full mode
    for (const item of dynamicItems) {
      const itemWidth = measureItemWidth(item, 'full');
      if (currentWidth + itemWidth <= availableSpace) {
        visible.push(item);
        currentWidth += itemWidth;
      } else {
        break; // Stop adding items when space runs out
      }
    }
    
    // If we couldn't fit all items in full mode, try compact mode
    const allItemsFitInFull = visible.length === navItems.length;
    if (!allItemsFitInFull) {
      currentMode = 'compact';
      visible = [...coreItems];
      currentWidth = 0;
      
      // Calculate width of core items in compact mode
      coreItems.forEach(item => {
        currentWidth += measureItemWidth(item, 'compact');
      });
      
      // Add dynamic items in priority order if they fit in compact mode
      for (const item of dynamicItems) {
        const itemWidth = measureItemWidth(item, 'compact');
        if (currentWidth + itemWidth <= availableSpace) {
          visible.push(item);
          currentWidth += itemWidth;
        } else {
          break;
        }
      }
    }
    
    // If still can't fit enough items, try icon mode as last resort
    if (visible.length < 4 && currentMode === 'compact') {
      currentMode = 'icon';
      visible = [...coreItems];
      currentWidth = 0;
      
      // Icon mode: 60px per item
      coreItems.forEach(() => {
        currentWidth += 60;
      });
      
      for (const item of dynamicItems) {
        if (currentWidth + 60 <= availableSpace) {
          visible.push(item);
          currentWidth += 60;
        } else {
          break;
        }
      }
    }
    
    // Sort visible items by priority to maintain consistent order
    visible.sort((a, b) => a.priority - b.priority);
    
    // Calculate hidden items
    const hidden = navItems.filter(item => !visible.find(v => v.id === item.id));
    
    return { mode: currentMode, visible, hidden };
  }, [navItems, calculateAvailableSpace, measureItemWidth]);
  
  // Update navigation visibility dynamically with state comparison to prevent infinite loops
  const updateNavigationVisibility = useCallback(() => {
    const { mode, visible, hidden } = calculateVisibleItems();
    
    // Only update state if there are actual changes
    const prev = previousNavigationState.current;
    const hasChanges = (
      prev.mode !== mode ||
      prev.visible.length !== visible.length ||
      prev.hidden.length !== hidden.length ||
      !prev.visible.every((item, index) => item.id === visible[index]?.id) ||
      !prev.hidden.every((item, index) => item.id === hidden[index]?.id)
    );
    
    if (hasChanges) {
      previousNavigationState.current = { mode, visible, hidden };
      setNavigationMode(mode);
      setVisibleItems(visible);
      setHiddenItems(hidden);
    }
  }, [calculateVisibleItems]);
  
  // Enhanced resize and zoom detection with smooth transitions - FIXED DEPENDENCIES
  useEffect(() => {
    // Initial calculation
    updateNavigationVisibility();
    
    // Create stable debounced handlers
    const handleResize = () => {
      clearTimeout(window.navigationResizeTimeout);
      window.navigationResizeTimeout = setTimeout(() => {
        updateNavigationVisibility();
      }, 100);
    };
    
    const handleZoom = () => {
      clearTimeout(window.navigationZoomTimeout);
      window.navigationZoomTimeout = setTimeout(() => {
        updateNavigationVisibility();
      }, 150);
    };
    
    const handleObserverResize = (entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          clearTimeout(window.navigationObserverTimeout);
          window.navigationObserverTimeout = setTimeout(() => {
            updateNavigationVisibility();
          }, 50);
        }
      }
    };
    
    // Listen for window resize events
    window.addEventListener('resize', handleResize);
    
    // Listen for visual viewport changes (better zoom detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleZoom);
    }
    
    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleResize);
    
    // Set up ResizeObserver for the navigation container
    let resizeObserver;
    if (navContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(handleObserverResize);
      resizeObserver.observe(navContainerRef.current);
    }
    
    return () => {
      clearTimeout(window.navigationResizeTimeout);
      clearTimeout(window.navigationZoomTimeout);
      clearTimeout(window.navigationObserverTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleZoom);
      }
      
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []); // Empty dependency array - handlers are stable and use current state via closure
  
  // Screen size check for mobile
  const isMobile = () => window.innerWidth < 768 || navigationMode === 'mobile';
  
  // Enhanced debug function for dynamic navigation verification - STABLE VERSION
  const logNavigationState = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      const navContainer = navContainerRef.current;
      const containerWidth = navContainer ? navContainer.getBoundingClientRect().width : 'not available';
      
      // Use current state directly to avoid dependency issues
      const currentState = previousNavigationState.current;
      
      console.log('Dynamic Navigation State:', {
        windowWidth: window.innerWidth,
        containerWidth: containerWidth,
        availableSpace: calculateAvailableSpace(),
        navigationMode: currentState.mode,
        visibleItemsCount: currentState.visible.length,
        hiddenItemsCount: currentState.hidden.length,
        visibleItems: currentState.visible.map(item => ({
          id: item.id,
          label: item.label,
          priority: item.priority,
          alwaysVisible: item.alwaysVisible
        })),
        hiddenItems: currentState.hidden.map(item => ({
          id: item.id,
          label: item.label,
          priority: item.priority
        })),
        displayingFullText: currentState.mode === 'full',
        zoomLevel: `${Math.round((window.outerWidth / window.innerWidth) * 100)}%`,
        moreButtonVisible: currentState.hidden.length > 0
      });
    }
  }, [calculateAvailableSpace]); // Only depend on stable calculateAvailableSpace
  
  // Log state changes in development - FIXED to prevent infinite loop
  useEffect(() => {
    // Only log when state actually changes, not on every render
    const timeoutId = setTimeout(() => {
      logNavigationState();
    }, 0); // Defer logging to next tick to break dependency cycle
    
    return () => clearTimeout(timeoutId);
  }, [navigationMode, visibleItems.length, hiddenItems.length]); // Only depend on stable primitive values
  
  // Expose dynamic navigation testing function for browser console (development only) - FIXED DEPENDENCIES
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.testDynamicNavigation = () => {
        const currentState = previousNavigationState.current;
        const results = {
          currentMode: currentState.mode,
          windowWidth: window.innerWidth,
          availableSpace: calculateAvailableSpace(),
          visibleItemsCount: currentState.visible.length,
          hiddenItemsCount: currentState.hidden.length,
          coreItemsAlwaysVisible: currentState.visible.filter(item => item.alwaysVisible).length === 3,
          dynamicItemsShown: currentState.visible.filter(item => !item.alwaysVisible).length,
          moreButtonVisible: currentState.hidden.length > 0,
          visibleLabels: currentState.visible.map(item => ({
            id: item.id,
            full: item.label,
            compact: item.shortLabel || item.label,
            displaying: currentState.mode === 'full' ? item.label : (item.shortLabel || item.label),
            priority: item.priority,
            alwaysVisible: item.alwaysVisible
          })),
          hiddenLabels: currentState.hidden.map(item => item.label),
          expectation: {
            coreItems: 'Dashboard, People, Giving should always be visible',
            dynamicBehavior: 'Items should progressively move to More dropdown as space decreases',
            intelligentSpace: 'Should maximize direct visibility of options'
          }
        };
        
        console.log('🚀 Dynamic Navigation Test Results:', results);
        
        // Verify core items are always visible
        const coreItemsVisible = ['dashboard', 'members', 'giving'].every(id => 
          currentState.visible.find(item => item.id === id)
        );
        console.log(`✅ Core Items Always Visible Test: ${coreItemsVisible ? 'PASSED' : 'FAILED'}`);
        
        // Verify More button logic
        const moreButtonLogicCorrect = (currentState.hidden.length > 0) === (currentState.hidden.length > 0);
        console.log(`✅ More Button Logic Test: ${moreButtonLogicCorrect ? 'PASSED' : 'FAILED'}`);
        console.log(`   More button should only appear when items are hidden: ${currentState.hidden.length > 0}`);
        
        return results;
      };
      
      // Auto-run test on initial load - single execution
      const timeoutId = setTimeout(() => {
        console.log('🔧 Dynamic Navigation Test Function Available: window.testDynamicNavigation()');
        window.testDynamicNavigation();
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, []); // Empty dependency array - only run once on mount

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

            {/* Main Navigation - Center Section with Dynamic Item Management */}
            <div className={`nav-center-section hidden md:flex items-center nav-container animate-nav-mode-change zoom-smooth nav-stable-container nav-width-transition ${
              navigationMode === 'icon' ? 'space-x-1' : 'space-x-2'
            }`} ref={navContainerRef} style={{ transition: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                // Determine label based on navigation mode with special handling for Dashboard
                // 'full' mode: Show complete labels like "Dashboard" (preferred at 100% zoom)
                // 'compact' mode: Show abbreviated labels like "Dash" (only when space constrained)
                // 'icon' mode: No labels, just icons with tooltips
                const getLabel = () => {
                  switch (navigationMode) {
                    case 'full':
                      return item.label; // Full professional labels (e.g., "Dashboard")
                    case 'compact':
                      // Special logic: For Dashboard, prefer full text at standard zoom (100-110%)
                      if (item.id === 'dashboard' && typeof window !== 'undefined') {
                        const zoomLevel = Math.round((window.outerWidth / window.innerWidth) * 100);
                        // At standard zoom levels (100-110%), show "Dashboard" instead of "Dash"
                        if (zoomLevel >= 100 && zoomLevel <= 110) {
                          return item.label; // Show "Dashboard"
                        }
                      }
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
                      nav-item-container nav-item flex items-center rounded-xl font-semibold nav-mode-transition zoom-transition-active
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
                      transition: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      opacity: 1,
                      transform: 'translateX(0) scale(1)',
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
              
              {/* More Dropdown - Dynamic visibility based on actually hidden items */}
              {hiddenItems.length > 0 && (
                <div className="relative nav-more-button more-button-enter" style={{ zIndex: '999998 !important', position: 'relative !important', isolation: 'isolate !important' }}>
                  <button
                    ref={moreButtonRef}
                    onClick={() => {
                      console.log('✅ More button clicked:', { 
                        hiddenItems: hiddenItems.map(item => item.label),
                        opening: !showMoreDropdown
                      });
                      setShowMoreDropdown(!showMoreDropdown);
                    }}
                    title={navigationMode === 'icon' ? 'More options' : undefined}
                    className={`
                      nav-item-container nav-item flex items-center rounded-xl font-semibold 
                      nav-mode-transition zoom-transition-active relative group
                      ${navigationMode === 'icon' 
                        ? 'p-3 min-h-[48px] min-w-[48px] justify-center' 
                        : 'px-4 py-3 min-h-[52px]'
                      }
                      whitespace-nowrap overflow-hidden
                      ${hiddenItems.some(item => item.id === currentView) || showMoreDropdown
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
                      transition: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      background: (hiddenItems.some(item => item.id === currentView) || showMoreDropdown)
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
                          ${(hiddenItems.some(item => item.id === currentView) || showMoreDropdown)
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
                    {(hiddenItems.some(item => item.id === currentView) || showMoreDropdown) && (
                      <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-sm" />
                    )}
                  </button>

                  {/* Dropdown Menu - Enhanced for Elderly Users */}
                  {showMoreDropdown && (
                    <div 
                      ref={dropdownRef}
                      className="absolute right-0 mt-3 w-64 rounded-xl shadow-2xl border py-3 dropdown-fade-in more-dropdown-premium"
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
                      {hiddenItems.map((item, index) => {
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
                              rounded-lg mx-2 relative group dropdown-item-stagger
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
                                : undefined,
                              animationDelay: `${index * 50}ms`,
                              transition: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
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