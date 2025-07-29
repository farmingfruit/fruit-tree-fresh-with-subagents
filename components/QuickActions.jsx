import React from 'react';
import { UserPlusIcon, CurrencyDollarIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const QuickActions = () => {
  const actions = [
    {
      id: 'add-member',
      label: 'Add New Member',
      icon: UserPlusIcon,
      color: 'primary',
      description: 'Register a new church member'
    },
    {
      id: 'record-giving',
      label: 'Record Giving',
      icon: CurrencyDollarIcon,
      color: 'success',
      description: 'Enter tithes and offerings'
    },
    {
      id: 'create-event',
      label: 'Create Event',
      icon: CalendarDaysIcon,
      color: 'secondary',
      description: 'Schedule a church event'
    }
  ];

  return (
    <div className="mb-8 animate-slide-up">
      <div className="bg-white rounded-xl shadow-medium border-2 border-primary-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            
            return (
              <button
                key={action.id}
                className={`
                  relative group bg-${action.color}-50 hover:bg-${action.color}-100 
                  border-2 border-${action.color}-200 rounded-xl p-6 
                  transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg
                  min-h-[120px] flex flex-col items-center justify-center
                `}
              >
                <div className={`
                  w-16 h-16 bg-${action.color}-600 rounded-full 
                  flex items-center justify-center mb-3
                  group-hover:scale-110 transition-transform
                `}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className={`text-lg font-medium text-${action.color}-900`}>
                  {action.label}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;