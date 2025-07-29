import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';  
import MemberDirectory from './components/MemberDirectory';
import GivingTransactions from './components/GivingTransactions';
import Navigation from './components/Navigation';
import SparrowCommandBar from './components/SparrowCommandBar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');

  const handleDemoLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  const handleSparrowAction = (action) => {
    // Handle different action types from Sparrow
    console.log('Sparrow action:', action);
    
    if (action.type === 'navigate' || action.type === 'filter') {
      handleNavigate(action.view);
    }
  };

  const renderCurrentView = () => {
    switch(currentView) {
      case 'people':
      case 'members': // Support legacy routing
        return <MemberDirectory user={user} onNavigate={handleNavigate} />;
      case 'giving':
        return <GivingTransactions user={user} onNavigate={handleNavigate} />;
      case 'groups':
        return (
          <div className="min-h-screen bg-gray-50">
            <Navigation 
              currentView={currentView} 
              onNavigate={handleNavigate}
              user={user}
            />
            <SparrowCommandBar 
              currentView={currentView}
              onNavigate={handleNavigate}
              onAction={handleSparrowAction}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <div className="text-center py-20">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">Groups & Ministries</h1>
                <p className="text-lg text-gray-600">Manage your church groups, small groups, and ministry teams.</p>
                <p className="text-base text-gray-500 mt-2">This section is coming soon!</p>
              </div>
            </div>
          </div>
        );
      case 'church-app':
        return (
          <div className="min-h-screen bg-gray-50">
            <Navigation 
              currentView={currentView} 
              onNavigate={handleNavigate}
              user={user}
            />
            <SparrowCommandBar 
              currentView={currentView}
              onNavigate={handleNavigate}
              onAction={handleSparrowAction}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <div className="text-center py-20">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">Church Mobile App</h1>
                <p className="text-lg text-gray-600">Configure and manage your church's mobile application.</p>
                <p className="text-base text-gray-500 mt-2">This section is coming soon!</p>
              </div>
            </div>
          </div>
        );
      case 'calendar':
      case 'events': // Support legacy routing
        return (
          <div className="min-h-screen bg-gray-50">
            <Navigation 
              currentView={currentView} 
              onNavigate={handleNavigate}
              user={user}
            />
            <SparrowCommandBar 
              currentView={currentView}
              onNavigate={handleNavigate}
              onAction={handleSparrowAction}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <div className="text-center py-20">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">Calendar & Events</h1>
                <p className="text-lg text-gray-600">Manage church events, services, and scheduling.</p>
                <p className="text-base text-gray-500 mt-2">This section is coming soon!</p>
              </div>
            </div>
          </div>
        );
      case 'forms':
        return (
          <div className="min-h-screen bg-gray-50">
            <Navigation 
              currentView={currentView} 
              onNavigate={handleNavigate}
              user={user}
            />
            <SparrowCommandBar 
              currentView={currentView}
              onNavigate={handleNavigate}
              onAction={handleSparrowAction}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <div className="text-center py-20">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">Forms & Surveys</h1>
                <p className="text-lg text-gray-600">Create registration forms, surveys, and collect member information.</p>
                <p className="text-base text-gray-500 mt-2">This section is coming soon!</p>
              </div>
            </div>
          </div>
        );
      case 'workflows':
        return (
          <div className="min-h-screen bg-gray-50">
            <Navigation 
              currentView={currentView} 
              onNavigate={handleNavigate}
              user={user}
            />
            <SparrowCommandBar 
              currentView={currentView}
              onNavigate={handleNavigate}
              onAction={handleSparrowAction}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <div className="text-center py-20">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">Automated Workflows</h1>
                <p className="text-lg text-gray-600">Set up automated processes for member follow-up and church operations.</p>
                <p className="text-base text-gray-500 mt-2">This section is coming soon!</p>
              </div>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="min-h-screen bg-gray-50">
            <Navigation 
              currentView={currentView} 
              onNavigate={handleNavigate}
              user={user}
            />
            <SparrowCommandBar 
              currentView={currentView}
              onNavigate={handleNavigate}
              onAction={handleSparrowAction}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <div className="text-center py-20">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">Reports & Analytics</h1>
                <p className="text-lg text-gray-600">View insights about attendance, giving, and church growth.</p>
                <p className="text-base text-gray-500 mt-2">This section is coming soon!</p>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="min-h-screen bg-gray-50">
            <Navigation 
              currentView={currentView} 
              onNavigate={handleNavigate}
              user={user}
            />
            <SparrowCommandBar 
              currentView={currentView}
              onNavigate={handleNavigate}
              onAction={handleSparrowAction}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <div className="text-center py-20">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">Church Settings</h1>
                <p className="text-lg text-gray-600">Configure your church information, permissions, and preferences.</p>
                <p className="text-base text-gray-500 mt-2">This section is coming soon!</p>
              </div>
            </div>
          </div>
        );
      default:
        return <Dashboard user={user} onNavigate={handleNavigate} />;
    }
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onDemoLogin={handleDemoLogin} />;
  }

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  );
}

export default App;