import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Loader2, MessageSquare, Lightbulb } from 'lucide-react';
import { usePayday } from '../context/PaydayContext';
import { extractRavenContext, askRavenAdvisor } from '../services/ravenAdvisor';

interface RavenChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const RavenChatModal: React.FC<RavenChatProps> = ({ isOpen, onClose }) => {
  const { bills, paydays, summaries, extraExpenses } = usePayday();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey there! I'm Raven, your personal bill & budget advisor inside MidnightLedger. I have live access to your bills, paydays, and debt accounts. Ask me anything like \"What's due on my next check?\", \"How can I save money?\", or \"Which debt should I pay first?\"!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const promptText = customPrompt || input;
    if (!promptText.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: promptText }];
    setMessages(newMessages);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const ravenContext = extractRavenContext(bills, paydays, summaries, extraExpenses);
      const reply = await askRavenAdvisor(promptText, ravenContext);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('Raven Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having a quick moment reading your context, but remember: prioritize fixed obligations like rent/utilities on payday and direct remaining funds toward your smallest debt balance first!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-[90vh] sm:h-[620px] bg-[#121212] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#2A2A2A] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] bg-[#121212] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6D28D9] via-[#7C3AED] to-[#C084FC] border border-[#3B236E] text-white flex items-center justify-center font-bold shadow-lg shadow-violet-900/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2 text-white">
                Raven - Financial Advisor
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1E1B2E] text-[#A78BFA] border border-[#3B236E]">
                  AI Active
                </span>
              </h3>
              <p className="text-xs text-white/60">
                Ask me about your bills, budget & debt
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-[#1E1E1E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Quick Prompt Chips */}
        <div className="p-3 bg-[#181818] border-b border-[#2A2A2A] flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          <button
            onClick={() => handleSend("How can I save money?")}
            className="px-3 py-1.5 rounded-full bg-[#1E1B2E] border border-[#3B236E] hover:bg-[#7C3AED] text-[#A78BFA] hover:text-white font-semibold whitespace-nowrap transition-all shadow-xs text-xs"
          >
            💡 How can I save money?
          </button>
          <button
            onClick={() => handleSend("Which bill should I pay first?")}
            className="px-3 py-1.5 rounded-full bg-[#1E1B2E] border border-[#3B236E] hover:bg-[#7C3AED] text-[#A78BFA] hover:text-white font-semibold whitespace-nowrap transition-all shadow-xs text-xs"
          >
            ⚡ Which bill should I pay first?
          </button>
          <button
            onClick={() => handleSend("Analyze my spending")}
            className="px-3 py-1.5 rounded-full bg-[#1E1B2E] border border-[#3B236E] hover:bg-[#7C3AED] text-[#A78BFA] hover:text-white font-semibold whitespace-nowrap transition-all shadow-xs text-xs"
          >
            📊 Analyze my spending
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0A0A0A]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6D28D9] to-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#7C3AED] text-white rounded-br-none shadow-md'
                    : 'bg-[#1E1E1E] text-white/90 border border-[#2A2A2A] rounded-bl-none shadow-xs'
                }`}
              >
                {m.content}
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[#2A2A2A] text-white/80 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-white/60 text-xs p-3 rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-[#A78BFA]" />
              <span>Raven is analyzing your live bills & calculating advice...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[#2A2A2A] bg-[#121212]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask Raven about bills, budget or debt strategies..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] text-white text-sm focus:outline-none focus:border-[#7C3AED] placeholder:text-white/40"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white transition-all shadow-md shadow-violet-900/30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Export AIAdvisorModal as alias for backward compatibility
export const AIAdvisorModal = RavenChatModal;

// Floating Chat FAB Button Component
export const RavenFAB: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 md:bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#C084FC] text-white font-bold text-sm shadow-xl shadow-violet-950/60 hover:scale-105 active:scale-95 transition-all group border border-violet-400/30 cursor-pointer"
      title="Raven - Your Financial Advisor"
    >
      <div className="relative">
        <Bot className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#121212] animate-pulse"></span>
      </div>
      <span className="hidden sm:inline tracking-tight font-extrabold">Ask Raven AI</span>
    </button>
  );
};
