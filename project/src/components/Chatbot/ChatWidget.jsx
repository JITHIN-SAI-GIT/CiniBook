import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Film,
  Clock,
  User,
  Calendar,
} from 'lucide-react';
import { useChatSocket } from '../../hooks/useChatSocket';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const { messages, sendMessage, isConnected } = useChatSocket();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.sender === 'user') {
      return <p className="text-white">{msg.message}</p>;
    }

    // Bot message
    return (
      <div className="space-y-2">
        <p className="text-gray-200">{msg.message}</p>

        {/* Optional type indicators */}
        {msg.type && msg.type !== 'GENERAL' && msg.type !== 'ERROR' && (
          <div className="flex items-center gap-1 mt-2 text-xs text-[#ffd60a] bg-[#ffd60a]/10 px-2 py-1 rounded-full w-fit">
            {msg.type === 'MOVIE_INFO' && <Film className="w-3 h-3" />}
            {msg.type === 'SHOWTIME_QUERY' && <Clock className="w-3 h-3" />}
            {msg.type === 'BOOKING_STATUS' && <Calendar className="w-3 h-3" />}
            <span>{msg.type.replace('_', ' ')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-r from-[#e63946] to-[#c1121f] text-white shadow-lg shadow-red-900/50 hover:scale-110 transition-all z-50 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[550px] max-h-[85vh] bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'scale-100 opacity-100'
            : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-[#e63946]/20 to-transparent rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center shadow-lg">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white font-outfit tracking-wide">
                Cini<span className="text-[#ffd60a]">Bot</span>
              </h3>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                {isConnected ? 'Online' : 'Reconnecting...'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Welcome Message */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center flex-shrink-0 shadow-lg mt-1">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[#1a1a24] border border-white/5 p-3 rounded-2xl rounded-tl-sm text-sm text-gray-200">
              Hi there! I'm CiniBot. I can help you with movie information (like
              cast, ratings, and release dates) or check showtimes and your
              booking status. How can I help you today?
            </div>
          </div>

          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg mt-1 ${isUser ? 'bg-gray-800' : 'bg-gradient-to-br from-[#e63946] to-[#c1121f]'}`}
                >
                  {isUser ? (
                    <User className="w-4 h-4 text-gray-300" />
                  ) : (
                    <Film className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-2xl text-sm max-w-[80%] ${
                    isUser
                      ? 'bg-blue-600/20 border border-blue-500/30 rounded-tr-sm text-white'
                      : 'bg-[#1a1a24] border border-white/5 rounded-tl-sm text-gray-200'
                  }`}
                >
                  {renderMessageContent(msg)}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-[#0a0a0f] rounded-b-2xl">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="w-full bg-[#1a1a24] border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#e63946] focus:ring-1 focus:ring-[#e63946] transition-all"
              disabled={!isConnected}
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || !isConnected}
              className="absolute right-2 p-2 rounded-full bg-gradient-to-r from-[#e63946] to-[#c1121f] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-center text-gray-500 mt-2">
            CiniBot can make mistakes. Check important booking info in your
            dashboard.
          </p>
        </div>
      </div>
    </>
  );
}
