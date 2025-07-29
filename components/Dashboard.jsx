import React, { useState } from 'react';
import Navigation from './Navigation';
import QuickActions from './QuickActions';
import SparrowCommandBar from './SparrowCommandBar';
import { 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  CalendarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';

const Dashboard = ({ user, onNavigate }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  
  const handleSparrowAction = (action) => {
    // Handle different action types from Sparrow
    console.log('Sparrow action:', action);
    
    if (action.type === 'navigate' || action.type === 'filter') {
      onNavigate(action.view);
    }
  };

  // Sample dashboard data
  const dashboardStats = {
    totalMembers: 247,
    newThisMonth: 5,
    todaysGiving: 1250,
    weeklyGiving: 8750,
    upcomingEvents: 3,
    attendanceRate: 78
  };

  const recentActivity = [
    { id: 1, type: 'member', text: 'Johnson Family joined the church', time: '2 hours ago' },
    { id: 2, type: 'giving', text: '$250 donation from Smith Family', time: '4 hours ago' },
    { id: 3, type: 'event', text: 'Bible Study scheduled for Wednesday', time: 'Yesterday' },
    { id: 4, type: 'visitor', text: '3 new visitors last Sunday', time: '2 days ago' }
  ];

  const upcomingEvents = [
    { id: 1, name: 'Sunday Service', date: 'July 30, 10:00 AM', attendees: 150 },
    { id: 2, name: 'Wednesday Bible Study', date: 'August 2, 7:00 PM', attendees: 45 },
    { id: 3, name: 'Youth Group Meeting', date: 'August 4, 6:00 PM', attendees: 25 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation 
        currentView={currentView} 
        onNavigate={setCurrentView}
        user={user}
      />

      {/* Sparrow Command Bar - Persistent at top of content */}
      <SparrowCommandBar 
        currentView={currentView}
        onNavigate={onNavigate}
        onAction={handleSparrowAction}
      />

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user.name}!
          </h1>
          <p className="text-base text-gray-600 mt-1">
            Here's what's happening at {user.church} today
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Members */}
          <div className="bg-white rounded-xl shadow-soft p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-gray-600">Total Members</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {dashboardStats.totalMembers}
                </p>
                <p className="text-sm text-success-600 mt-2 flex items-center">
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                  +{dashboardStats.newThisMonth} this month
                </p>
              </div>
              <div className="bg-primary-100 p-4 rounded-xl">
                <UserGroupIcon className="w-8 h-8 text-primary-600" />
              </div>
            </div>
          </div>

          {/* Today's Giving */}
          <div className="bg-white rounded-xl shadow-soft p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-gray-600">Today's Giving</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  ${dashboardStats.todaysGiving.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Weekly total: ${dashboardStats.weeklyGiving.toLocaleString()}
                </p>
              </div>
              <div className="bg-success-100 p-4 rounded-xl">
                <CurrencyDollarIcon className="w-8 h-8 text-success-600" />
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-soft p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-gray-600">Upcoming Events</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {dashboardStats.upcomingEvents}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This week
                </p>
              </div>
              <div className="bg-secondary-100 p-4 rounded-xl">
                <CalendarIcon className="w-8 h-8 text-secondary-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-soft p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'member' ? 'bg-primary-100' :
                      activity.type === 'giving' ? 'bg-success-100' :
                      activity.type === 'event' ? 'bg-secondary-100' :
                      'bg-warning-100'
                    }`}>
                      {activity.type === 'member' && <UserGroupIcon className="w-5 h-5 text-primary-600" />}
                      {activity.type === 'giving' && <CurrencyDollarIcon className="w-5 h-5 text-success-600" />}
                      {activity.type === 'event' && <CalendarIcon className="w-5 h-5 text-secondary-600" />}
                      {activity.type === 'visitor' && <UserPlusIcon className="w-5 h-5 text-warning-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-base text-gray-900">{activity.text}</p>
                      <p className="text-sm text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Events - Takes 1 column */}
          <div>
            <div className="bg-white rounded-xl shadow-soft p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upcoming Events
              </h2>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="border-2 border-gray-100 rounded-lg p-4 hover:border-primary-200 transition-colors">
                    <h3 className="font-medium text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{event.date}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Expected: {event.attendees} attendees
                    </p>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 px-4 py-3 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg font-medium transition-colors">
                View All Events
              </button>
            </div>
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="mt-8 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-white p-3 rounded-lg shadow-soft">
              <ChartBarIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">AI Insights</h3>
              <p className="text-gray-700 mt-2">
                Attendance is trending up 12% this month. Consider planning additional seating for next Sunday's service.
              </p>
              <p className="text-gray-700 mt-2">
                3 members haven't attended in the past 4 weeks. Sparrow suggests sending a pastoral care follow-up.
              </p>
              <button className="mt-3 text-primary-600 font-medium hover:text-primary-700">
                View All Insights →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;