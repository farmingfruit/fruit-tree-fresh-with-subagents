import React, { useState } from 'react';
import Navigation from './Navigation';
import SparrowAI from './SparrowAI';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  UserPlusIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const MemberDirectory = ({ user, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  // Sample member data
  const members = [
    {
      id: 1,
      firstName: 'John',  
      lastName: 'Smith',
      family: 'Smith Family',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      role: 'Elder',
      memberSince: '2020-03-15',
      lastAttended: '2025-07-27',  
      status: 'active',
      profilePhoto: null
    },
    {
      id: 2,
      firstName: 'Mary',
      lastName: 'Johnson', 
      family: 'Johnson Family',
      email: 'mary.johnson@email.com',
      phone: '(555) 234-5678',
      role: 'Member',
      memberSince: '2021-06-20',
      lastAttended: '2025-07-20',
      status: 'active',
      profilePhoto: null
    },
    {
      id: 3,
      firstName: 'Robert',
      lastName: 'Wilson',
      family: 'Wilson Family', 
      email: 'robert.wilson@email.com',
      phone: '(555) 345-6789',
      role: 'Deacon',
      memberSince: '2019-01-10',
      lastAttended: '2025-07-27',
      status: 'active',
      profilePhoto: null
    },
    {
      id: 4,
      firstName: 'Sarah',
      lastName: 'Davis',
      family: 'Davis Family',
      email: 'sarah.davis@email.com', 
      phone: '(555) 456-7890',
      role: 'Member',
      memberSince: '2022-09-05',
      lastAttended: '2025-07-13',
      status: 'active',
      profilePhoto: null
    },
    {
      id: 5,
      firstName: 'Michael',
      lastName: 'Brown',
      family: 'Brown Family',
      email: 'michael.brown@email.com',
      phone: '(555) 567-8901',
      role: 'Member',
      memberSince: '2023-02-18',
      lastAttended: '2025-06-15',
      status: 'inactive',
      profilePhoto: null
    },
    {
      id: 6,
      firstName: 'Lisa',
      lastName: 'Anderson',
      family: 'Anderson Family',
      email: 'lisa.anderson@email.com',
      phone: '(555) 678-9012',
      role: 'Member',
      memberSince: '2023-07-22',
      lastAttended: '2025-07-27',
      status: 'active',
      profilePhoto: null
    }
  ];

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.family.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || member.status === filter;
    
    return matchesSearch && matchesFilter;
  });

  const getInitials = (firstName, lastName) => {
    return `${firstName[0]}${lastName[0]}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getAttendanceStatus = (lastAttended) => {
    const daysSince = Math.floor((new Date() - new Date(lastAttended)) / (1000 * 60 * 60 * 24));
    if (daysSince <= 7) return { text: 'Recent', color: 'success' };
    if (daysSince <= 21) return { text: 'Regular', color: 'warning' };  
    return { text: 'Needs follow-up', color: 'error' };
  };

  const handleSparrowAction = (action) => {
    // Handle different action types from Sparrow
    console.log('Sparrow action:', action);
    
    if (action.type === 'filter' && action.filter) {
      // Handle specific filters
      if (action.filter === 'joinedThisYear') {
        setFilter('all');
        // You could add year-based filtering here
      } else if (action.filter === 'familiesYoungKids') {
        setSearchTerm('family');
        // You could add age-based filtering here
      } else if (action.filter === 'inactive') {
        setFilter('inactive');
      } else if (action.filter === 'recentVisitors') {
        setFilter('all');
        // You could add visitor filtering here
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation 
        currentView="people" 
        onNavigate={onNavigate}
        user={user}
      />

      {/* Sparrow AI Assistant */}
      <SparrowAI />

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Member Directory</h1>
              <p className="text-lg text-gray-600 mt-1">
                {filteredMembers.length} of {members.length} members
              </p>
            </div>
            <button className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-[1.02] shadow-primary flex items-center min-h-touch">
              <UserPlusIcon className="w-5 h-5 mr-2" />
              Add New Member
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-soft p-6 mb-6 animate-slide-up">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all"
                placeholder="Search members by name, family, or email..."
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-4 pr-12 text-lg focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all min-w-[160px]"
              >
                <option value="all">All Members</option>
                <option value="active">Active</option>
                <option value="inactive">Needs Follow-up</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMembers.map((member) => {
            const attendanceStatus = getAttendanceStatus(member.lastAttended);
            
            return (
              <div
                key={member.id}
                className="bg-white rounded-xl shadow-soft hover:shadow-medium transition-all p-6 border-2 border-gray-100 hover:border-primary-200"
              >
                {/* Member Header */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {getInitials(member.firstName, member.lastName)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {member.firstName} {member.lastName}
                    </h3>
                    <p className="text-gray-600">{member.family}</p>
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1
                      ${member.role === 'Elder' ? 'bg-primary-100 text-primary-800' :
                        member.role === 'Deacon' ? 'bg-secondary-100 text-secondary-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {member.role}
                    </span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-3 text-gray-600">
                    <EnvelopeIcon className="w-5 h-5" />
                    <span className="text-sm">{member.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-600">
                    <PhoneIcon className="w-5 h-5" />
                    <span className="text-sm">{member.phone}</span>
                  </div>
                </div>

                {/* Member Stats */}
                <div className="border-t-2 border-gray-100 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Member since:</span>
                    <span className="text-sm font-medium">{formatDate(member.memberSince)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-600">Last attended:</span>
                    <span className={`
                      text-sm font-medium px-2 py-1 rounded-full
                      ${attendanceStatus.color === 'success' ? 'bg-success-100 text-success-800' :
                        attendanceStatus.color === 'warning' ? 'bg-warning-100 text-warning-800' :
                        'bg-error-100 text-error-800'}
                    `}>
                      {attendanceStatus.text}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button className="flex-1 bg-primary-50 hover:bg-primary-100 text-primary-700 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center">
                    <EyeIcon className="w-4 h-4 mr-2" />
                    View Profile
                  </button>
                  <button className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-lg transition-colors">
                    <PhoneIcon className="w-4 h-4" />
                  </button>
                  <button className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-lg transition-colors">
                    <EnvelopeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <UserPlusIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No members found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first member'}
            </p>
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-[1.02]">
              Add New Member
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MemberDirectory;