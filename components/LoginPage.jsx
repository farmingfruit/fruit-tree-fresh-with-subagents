import React, { useState } from 'react';
import { HomeIcon, EnvelopeIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const LoginPage = ({ onDemoLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate sending magic link
    setTimeout(() => {
      setIsLoading(false);
      alert('Check your email for a sign-in link!');
    }, 1000);
  };

  const handleDemoLogin = () => {
    onDemoLogin({
      name: 'Betty Thompson',
      role: 'Church Administrator',
      church: 'First Baptist Church of Greater Metropolitan Area'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col items-center justify-center p-4">
      {/* Church Logo Area */}
      <div className="w-full max-w-md mb-8 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-4">
          <HomeIcon className="w-10 h-10 text-primary-600" />
        </div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Welcome to Fruit Tree
        </h1>
        <p className="text-lg text-gray-600">
          Church management made simple
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-large p-8 animate-slide-up">
        {/* Main Login Form */}
        <form onSubmit={handleMagicLink} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-lg font-medium text-gray-700 mb-2">
              Your Church Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all"
                placeholder="admin@gracechurch.org"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center px-6 py-4 min-h-touch text-lg font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-primary"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending link...
              </>
            ) : (
              'Send me a sign-in link'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Social Login Placeholders */}
        <div className="space-y-3">
          <button className="w-full flex items-center justify-center px-6 py-4 min-h-touch text-lg font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all">
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 mr-3" />
            Sign in with Google
          </button>
          
          <button className="w-full flex items-center justify-center px-6 py-4 min-h-touch text-lg font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all">
            <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M14.94 5.19A4.38 4.38 0 0 0 16 2a4.44 4.44 0 0 0-3 1.52a4.17 4.17 0 0 0-1 3.09a3.69 3.69 0 0 0 2.94-1.42zm2.52 3.57a4.51 4.51 0 0 1 2.16 3.81a4.66 4.66 0 0 1-2.72 1.57A7.06 7.06 0 0 0 19.9 20a11.25 11.25 0 0 0 2.1.18a11 11 0 0 1-2.54 2.95a1.42 1.42 0 0 1-.9.31a1.36 1.36 0 0 1-.88-.29a12.87 12.87 0 0 1-1.9-2.75a28.64 28.64 0 0 1-2-4.64c-.57-1.75-1.03-3.51-1.03-4.95a5.26 5.26 0 0 1 1.3-3.6a3.85 3.85 0 0 1 3.02-1.52a2.14 2.14 0 0 1 1.5.56a3.4 3.4 0 0 1 .58.82l.39.72a2.37 2.37 0 0 0 .73.9a1.18 1.18 0 0 0 .76.27c.36 0 .89-.23 1.31-.52z"/>
            </svg>
            Sign in with Apple
          </button>
        </div>

        {/* Demo Mode Button */}
        <div className="mt-8 pt-8 border-t-2 border-gray-200">
          <button
            onClick={handleDemoLogin}
            className="w-full flex items-center justify-center px-6 py-4 min-h-touch text-lg font-medium text-white bg-secondary-600 hover:bg-secondary-700 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-medium"
          >
            <UserGroupIcon className="w-6 h-6 mr-3" />
            Skip Login - Demo Mode
          </button>
          <p className="text-center text-sm text-gray-500 mt-3">
            Try out Fruit Tree without signing in
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Need help? Call us at (555) 123-4567</p>
        <p className="mt-1">Monday-Friday, 9am-5pm EST</p>
      </div>
    </div>
  );
};

export default LoginPage;