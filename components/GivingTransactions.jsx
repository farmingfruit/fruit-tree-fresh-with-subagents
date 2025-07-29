import React, { useState } from 'react';
import Navigation from './Navigation';
import SparrowAI from './SparrowAI';
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const GivingTransactions = ({ user, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('this-month');
  const [fundFilter, setFundFilter] = useState('all');

  // Sample giving data
  const transactions = [
    {
      id: 1,
      donor: 'Smith Family',
      amount: 250.00,
      method: 'Online',
      fund: 'General',
      date: '2025-07-28',
      checkNumber: null,
      isRecurring: true
    },
    {
      id: 2,
      donor: 'Anonymous',
      amount: 100.00,
      method: 'Cash',
      fund: 'Building',
      date: '2025-07-27',
      checkNumber: null,
      isRecurring: false
    },
    {
      id: 3,
      donor: 'Johnson Family',
      amount: 500.00,
      method: 'Check',
      fund: 'General',
      date: '2025-07-27',
      checkNumber: '1234',
      isRecurring: false
    },
    {
      id: 4,
      donor: 'Wilson Family',
      amount: 75.00,
      method: 'Online',
      fund: 'Missions',
      date: '2025-07-26',
      checkNumber: null,
      isRecurring: true
    },
    {
      id: 5,
      donor: 'Davis Family',
      amount: 200.00,
      method: 'ACH',
      fund: 'General',
      date: '2025-07-25',
      checkNumber: null,
      isRecurring: true
    },
    {
      id: 6,
      donor: 'Brown Family',
      amount: 150.00,
      method: 'Check',
      fund: 'Youth',
      date: '2025-07-24',
      checkNumber: '5678',
      isRecurring: false
    },
    {
      id: 7,
      donor: 'Anderson Family',
      amount: 325.00,
      method: 'Online',
      fund: 'General',
      date: '2025-07-21',
      checkNumber: null,
      isRecurring: true
    },
    {
      id: 8,
      donor: 'Thompson Family',
      amount: 50.00,
      method: 'Cash',
      fund: 'Missions',
      date: '2025-07-21',
      checkNumber: null,
      isRecurring: false
    }
  ];

  const funds = ['General', 'Building', 'Missions', 'Youth'];

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.donor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.fund.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFund = fundFilter === 'all' || transaction.fund === fundFilter;
    
    // Simple date filtering (in real app, would be more sophisticated)
    const transactionDate = new Date(transaction.date);
    const now = new Date();
    let matchesDate = true;
    
    if (dateFilter === 'today') {
      matchesDate = transactionDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'this-week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = transactionDate >= weekAgo;
    } else if (dateFilter === 'this-month') {
      matchesDate = 
        transactionDate.getMonth() === now.getMonth() && 
        transactionDate.getFullYear() === now.getFullYear();
    }
    
    return matchesSearch && matchesFund && matchesDate;
  });

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMethodColor = (method) => {
    switch(method) {
      case 'Online': return 'bg-primary-100 text-primary-800';
      case 'Check': return 'bg-success-100 text-success-800';
      case 'Cash': return 'bg-warning-100 text-warning-800';
      case 'ACH': return 'bg-secondary-100 text-secondary-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSparrowAction = (action) => {
    // Handle different action types from Sparrow
    console.log('Sparrow action:', action);
    
    if (action.type === 'navigate' && action.view) {
      onNavigate(action.view);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation 
        currentView="giving" 
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
              <h1 className="text-3xl font-semibold text-gray-900">Giving & Donations</h1>
              <p className="text-lg text-gray-600 mt-1">
                {filteredTransactions.length} transactions • {formatCurrency(totalAmount)} total
              </p>
            </div>
            <div className="flex space-x-3 mt-4 sm:mt-0">
              <button className="bg-secondary-600 hover:bg-secondary-700 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-[1.02] flex items-center min-h-touch">
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                Export
              </button>
              <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-[1.02] shadow-primary flex items-center min-h-touch">
                <PlusIcon className="w-5 h-5 mr-2" />
                Record Giving
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Total</p>
                <p className="text-2xl font-semibold text-gray-900">$350</p>
              </div>
              <div className="bg-success-100 p-3 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-semibold text-gray-900">$2,450</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-semibold text-gray-900">$8,750</p>
              </div>
              <div className="bg-secondary-100 p-3 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-secondary-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Gift</p>
                <p className="text-2xl font-semibold text-gray-900">$187</p>
              </div>
              <div className="bg-warning-100 p-3 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-warning-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-soft p-6 mb-6 animate-slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all"
                placeholder="Search by donor, method, or fund..."
              />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-4 pr-12 text-lg focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all w-full"
              >
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="all">All Time</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Fund Filter */}
            <div className="relative">
              <select
                value={fundFilter}
                onChange={(e) => setFundFilter(e.target.value)}
                className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-4 pr-12 text-lg focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all w-full"
              >
                <option value="all">All Funds</option>
                {funds.map(fund => (
                  <option key={fund} value={fund}>{fund}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-900">Donor</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-900">Method</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-900">Fund</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-900">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                          {transaction.donor.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-lg font-medium text-gray-900">{transaction.donor}</div>
                          {transaction.isRecurring && (
                            <div className="text-sm text-primary-600">Recurring</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xl font-semibold text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getMethodColor(transaction.method)}`}>
                        {transaction.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg text-gray-900">{transaction.fund}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg text-gray-900">{formatDate(transaction.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {transaction.checkNumber && `Check #${transaction.checkNumber}`}
                        {!transaction.checkNumber && transaction.method === 'Online' && 'Online donation'}
                        {!transaction.checkNumber && transaction.method === 'Cash' && 'Cash offering'}
                        {!transaction.checkNumber && transaction.method === 'ACH' && 'Bank transfer'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-soft">
            <CurrencyDollarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try adjusting your search filters' : 'No giving records match your criteria'}
            </p>
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-[1.02]">
              Record New Giving
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default GivingTransactions;