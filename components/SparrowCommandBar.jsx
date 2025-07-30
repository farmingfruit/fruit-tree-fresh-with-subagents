import React, { useState, useRef, useEffect } from 'react';
import { 
  SparklesIcon, 
  MagnifyingGlassIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

const SparrowCommandBar = ({ currentView, onNavigate, onAction }) => {
  const [query, setQuery] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const inputRef = useRef(null);

  // Rotating placeholder examples - teaching by demonstration
  const placeholderExamples = [
    "Try: Find everyone who joined this year",
    "Try: Show me families with kids under 10",
    "Try: Who should I follow up with this week?",
    "Try: Add the Williams family to our directory",
    "Try: Show me who hasn't attended lately",
    "Try: What's our giving trend this month?",
    "Try: Create a newcomer welcome email",
    "Try: Find small group leaders"
  ];

  // Rotate placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Natural language processing for church queries
  const processQuery = (queryText) => {
    const lowerQuery = queryText.toLowerCase();
    
    // Pattern matching for different query types
    const patterns = {
      // People queries
      findPeople: /find|show|list|who|search/i,
      newMembers: /new|joined|recent|this year|this month/i,
      families: /famil|kids|children|parents/i,
      attendance: /attend|haven't|missing|absent|inactive/i,
      followUp: /follow up|contact|reach out|call|visit/i,
      
      // Giving queries
      giving: /giving|donation|tithe|contribution|donor/i,
      givingTrends: /trend|pattern|increase|decrease|analysis/i,
      
      // Action queries
      add: /add|create|new|register/i,
      email: /email|message|communicate|send/i,
      report: /report|analytics|statistics|numbers/i,
      
      // Contextual queries
      thisWeek: /this week|upcoming|soon/i,
      today: /today|now/i
    };

    // Build context-aware response
    let response = {
      type: 'general',
      suggestions: [],
      actions: [],
      insights: []
    };

    // Detect query intent
    if (patterns.findPeople.test(lowerQuery) && patterns.newMembers.test(lowerQuery)) {
      response.type = 'newMembers';
      response.suggestions = [
        { 
          icon: UserGroupIcon, 
          title: "New Members This Year",
          description: "Found 47 people who joined in 2024",
          action: { type: 'filter', view: 'people', filter: 'joinedThisYear' }
        },
        {
          icon: ChartBarIcon,
          title: "Growth Analysis",
          description: "Your church grew by 12% this year",
          action: { type: 'navigate', view: 'reports', section: 'growth' }
        }
      ];
      response.insights.push({
        type: 'tip',
        message: "I noticed 8 new families haven't been assigned to a small group yet. Would you like me to help with that?"
      });
    } else if (patterns.families.test(lowerQuery) && /under 10|young/i.test(lowerQuery)) {
      response.type = 'familiesWithKids';
      response.suggestions = [
        {
          icon: UserGroupIcon,
          title: "Families with Young Children",
          description: "Found 34 families with children under 10",
          action: { type: 'filter', view: 'people', filter: 'familiesYoungKids' }
        },
        {
          icon: CalendarDaysIcon,
          title: "Children's Ministry Events",
          description: "3 upcoming events for families",
          action: { type: 'navigate', view: 'calendar', filter: 'children' }
        }
      ];
      response.actions.push({
        label: "Create Family Event",
        action: { type: 'create', item: 'event', category: 'family' }
      });
    } else if (patterns.followUp.test(lowerQuery) && patterns.thisWeek.test(lowerQuery)) {
      response.type = 'followUps';
      response.suggestions = [
        {
          icon: UserGroupIcon,
          title: "This Week's Follow-ups",
          description: "12 people need pastoral contact",
          action: { type: 'task', view: 'people', filter: 'needsFollowUp' }
        },
        {
          icon: CalendarDaysIcon,
          title: "Recent Visitors",
          description: "5 first-time visitors from last Sunday",
          action: { type: 'filter', view: 'people', filter: 'recentVisitors' }
        }
      ];
      response.insights.push({
        type: 'reminder',
        message: "The Johnson family visited 3 times but hasn't returned in 2 weeks. They mentioned interest in the youth program."
      });
    } else if (patterns.attendance.test(lowerQuery) && /haven't|lately|missing/i.test(lowerQuery)) {
      response.type = 'inactiveMembers';
      response.suggestions = [
        {
          icon: UserGroupIcon,
          title: "Haven't Attended Recently",
          description: "28 regular attenders missing 3+ weeks",
          action: { type: 'filter', view: 'people', filter: 'inactive' }
        },
        {
          icon: LightBulbIcon,
          title: "Re-engagement Campaign",
          description: "Start automated follow-up sequence",
          action: { type: 'workflow', template: 'reengagement' }
        }
      ];
      response.insights.push({
        type: 'concern',
        message: "Attendance is down 15% over the last month. The Thompson and Rodriguez families were regular attenders who haven't been seen."
      });
    } else if (patterns.add.test(lowerQuery) && /williams|family/i.test(lowerQuery)) {
      response.type = 'addPerson';
      response.suggestions = [
        {
          icon: CheckCircleIcon,
          title: "Add Williams Family",
          description: "Quick add new family to directory",
          action: { type: 'create', item: 'family', prefill: 'Williams' }
        }
      ];
      response.actions.push({
        label: "Add Individual Instead",
        action: { type: 'create', item: 'person' }
      });
    } else if (patterns.giving.test(lowerQuery) && patterns.givingTrends.test(lowerQuery)) {
      response.type = 'givingAnalysis';
      response.suggestions = [
        {
          icon: CurrencyDollarIcon,
          title: "This Month's Giving",
          description: "$42,350 received (up 8% from last month)",
          action: { type: 'navigate', view: 'giving', section: 'trends' }
        },
        {
          icon: ChartBarIcon,
          title: "Giving Patterns",
          description: "67% give monthly, 23% give weekly",
          action: { type: 'report', report: 'givingPatterns' }
        }
      ];
      response.insights.push({
        type: 'positive',
        message: "Online giving increased by 25% after we simplified the process last month!"
      });
    }

    return response;
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    
    const processed = processQuery(query);
    setResults(processed);
    setShowResults(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAction = (action) => {
    if (onAction) {
      onAction(action);
    }
    
    // Handle navigation
    if (action.type === 'navigate' || action.type === 'filter' || action.type === 'task') {
      onNavigate(action.view);
    }
    
    setShowResults(false);
    setQuery('');
  };

  // Contextual insights based on current view
  const getContextualInsights = () => {
    const insights = {
      dashboard: [
        { icon: UserGroupIcon, text: "5 first-time visitors last Sunday", action: "View visitors" },
        { icon: CurrencyDollarIcon, text: "Giving up 12% this month", action: "See details" },
        { icon: CalendarDaysIcon, text: "3 events need volunteers", action: "Manage events" }
      ],
      people: [
        { icon: LightBulbIcon, text: "12 people celebrating birthdays this week", action: "Send greetings" },
        { icon: UserGroupIcon, text: "8 new families need group placement", action: "Assign groups" },
        { icon: CheckCircleIcon, text: "Follow-up needed: 15 people", action: "View list" }
      ],
      giving: [
        { icon: ChartBarIcon, text: "67% of members give regularly", action: "View analysis" },
        { icon: CurrencyDollarIcon, text: "Online giving increased 25%", action: "Learn why" },
        { icon: LightBulbIcon, text: "Tax letters ready to send", action: "Send letters" }
      ]
    };

    return insights[currentView] || insights.dashboard;
  };

  return (
    <div className="sparrow-command-bar bg-white shadow-lg border-b-2 border-gray-200 sticky top-[80px] z-40">
      {/* Main Command Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className={`relative transition-all duration-300 ${isActive ? 'scale-105' : ''}`}>
          <div className="flex items-center">
            {/* Sparrow Icon */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <SparklesIcon className={`w-6 h-6 transition-colors duration-300 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
            </div>
            
            {/* Search Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsActive(true)}
              onBlur={() => setTimeout(() => setIsActive(false), 200)}
              placeholder={placeholderExamples[placeholderIndex]}
              className="w-full pl-14 pr-20 py-4 text-base font-medium bg-gray-50 border-2 border-gray-300 rounded-xl 
                       focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 
                       transition-all duration-200 placeholder-gray-500"
              aria-label="Ask Sparrow anything about your church"
            />
            
            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 
                       px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white 
                       font-medium rounded-lg flex items-center space-x-1
                       transition-all duration-200 hover:shadow-md"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>

        {/* Results Panel */}
        {showResults && results && (
          <div className="mt-4 bg-white rounded-xl border-2 border-gray-200 shadow-xl p-6 animate-slideDown">
            {/* Main Suggestions */}
            {results.suggestions.length > 0 && (
              <div className="space-y-3 mb-4">
                {results.suggestions.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleAction(suggestion.action)}
                      className="w-full flex items-start p-4 bg-gray-50 hover:bg-primary-50 
                               rounded-lg transition-all duration-200 group border-2 border-transparent
                               hover:border-primary-200"
                    >
                      <div className="p-3 bg-white rounded-lg mr-4 group-hover:bg-primary-100 transition-colors">
                        <Icon className="w-6 h-6 text-gray-600 group-hover:text-primary-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-lg font-semibold text-gray-900 group-hover:text-primary-700">
                          {suggestion.title}
                        </h4>
                        <p className="text-gray-600 mt-1">{suggestion.description}</p>
                      </div>
                      <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-600 mt-5" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Insights */}
            {results.insights.length > 0 && (
              <div className="border-t-2 border-gray-100 pt-4 space-y-3">
                {results.insights.map((insight, index) => (
                  <div key={index} className={`p-4 rounded-lg flex items-start space-x-3 
                    ${insight.type === 'tip' ? 'bg-blue-50 border-2 border-blue-200' : ''}
                    ${insight.type === 'reminder' ? 'bg-amber-50 border-2 border-amber-200' : ''}
                    ${insight.type === 'concern' ? 'bg-red-50 border-2 border-red-200' : ''}
                    ${insight.type === 'positive' ? 'bg-green-50 border-2 border-green-200' : ''}
                  `}>
                    <LightBulbIcon className={`w-5 h-5 mt-0.5 flex-shrink-0
                      ${insight.type === 'tip' ? 'text-blue-600' : ''}
                      ${insight.type === 'reminder' ? 'text-amber-600' : ''}
                      ${insight.type === 'concern' ? 'text-red-600' : ''}
                      ${insight.type === 'positive' ? 'text-green-600' : ''}
                    `} />
                    <p className="text-gray-700">{insight.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            {results.actions && results.actions.length > 0 && (
              <div className="mt-4 flex space-x-3">
                {results.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action.action)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white 
                             font-medium rounded-lg transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contextual Intelligence Bar */}
      <div className="bg-primary-50 border-t border-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">Sparrow noticed:</span>
            </div>
            <div className="flex items-center space-x-6">
              {getContextualInsights().map((insight, index) => (
                <button
                  key={index}
                  className="flex items-center space-x-2 text-sm text-gray-700 hover:text-primary-600 
                           transition-colors group"
                  onClick={() => console.log('Insight action:', insight.action)}
                >
                  <insight.icon className="w-4 h-4 text-gray-500 group-hover:text-primary-600" />
                  <span>{insight.text}</span>
                  <span className="text-primary-600 font-medium hidden group-hover:inline">
                    → {insight.action}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SparrowCommandBar;