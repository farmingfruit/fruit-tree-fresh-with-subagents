import React, { useState } from 'react';
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';

const SparrowAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const suggestions = [
    "Add a new member to the Johnson family",
    "Show me this week's giving totals",
    "Create a reminder to follow up with visitors",
    "Find members who haven't attended in 3 weeks"
  ];

  const handleSend = () => {
    if (!message.trim()) return;
    
    setIsThinking(true);
    // Simulate AI response
    setTimeout(() => {
      setIsThinking(false);
      alert(`Sparrow AI received: "${message}"`);
      setMessage('');
    }, 1500);
  };

  return (
    <>
      {/* Floating Sparrow Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-6 right-6 w-16 h-16 bg-primary-600 hover:bg-primary-700 
          text-white rounded-full shadow-large hover:shadow-xl
          flex items-center justify-center transition-all duration-300
          transform hover:scale-110 ${isOpen ? 'scale-0' : 'scale-100'}
        `}
        aria-label="Open Sparrow AI Assistant"
      >
        <SparklesIcon className="w-8 h-8" />
      </button>

      {/* Sparrow AI Panel */}
      <div
        className={`
          fixed bottom-6 right-6 w-full max-w-md bg-white rounded-2xl shadow-2xl
          border-2 border-primary-200 transition-all duration-300 transform
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
        `}
        style={{ maxHeight: '600px' }}
      >
        {/* Header */}
        <div className="bg-primary-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Sparrow AI Assistant</h3>
              <p className="text-sm text-primary-100">How can I help you today?</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Suggestions */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">Try asking me:</p>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setMessage(suggestion)}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 pr-12 text-base border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-600 resize-none"
              rows="3"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || isThinking}
              className={`
                absolute bottom-3 right-3 p-2 rounded-lg transition-all
                ${message.trim() && !isThinking
                  ? 'bg-primary-600 hover:bg-primary-700 text-white' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isThinking ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-500 mt-3 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
};

export default SparrowAI;