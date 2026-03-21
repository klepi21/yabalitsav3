'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { label: 'Πώς φτιάχνω τμήμα;', prompt: 'Πώς μπορώ να δημιουργήσω ένα νέο τμήμα στην ακαδημία;' },
  { label: 'Πληρωμές αθλητών', prompt: 'Πώς λειτουργούν οι μηνιαίες πληρωμές των αθλητών;' },
  { label: 'Πρόσκληση coach', prompt: 'Πώς προσκαλώ έναν προπονητή να χρησιμοποιήσει την πλατφόρμα;' },
  { label: 'Τουρνουά', prompt: 'Πώς δημιουργώ ένα τουρνουά;' },
];

const PAGE_CONTEXT: Record<string, string> = {
  '/management/dashboard': 'Πίνακας Ελέγχου',
  '/management/bookings': 'Κρατήσεις',
  '/management/pitches': 'Γήπεδα',
  '/management/customers': 'Πελάτες',
  '/management/academy/users': 'Χρήστες Ακαδημίας',
  '/management/academy/squads': 'Τμήματα',
  '/management/academy/training': 'Προπονήσεις',
  '/management/academy/payments': 'Πληρωμές Ακαδημίας',
  '/management/academy/medical': 'Ιατρικά Πιστοποιητικά',
  '/management/academy/evaluations': 'Αξιολογήσεις',
  '/management/tournaments': 'Τουρνουά',
  '/management/reports': 'Αναφορές',
  '/management/settings': 'Ρυθμίσεις',
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getCurrentPageLabel = () => {
    for (const [path, label] of Object.entries(PAGE_CONTEXT)) {
      if (pathname.startsWith(path)) return label;
    }
    return pathname;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          currentPage: getCurrentPageLabel(),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Συγγνώμη, υπήρξε σφάλμα. Δοκιμάστε ξανά.',
          timestamp: new Date(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Δεν μπόρεσα να συνδεθώ. Ελέγξτε τη σύνδεσή σας.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110",
          isOpen
            ? "bg-zinc-800 hover:bg-zinc-700"
            : "bg-emerald-600 hover:bg-emerald-700"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-160px)] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-sm">Yabalitsa Assistant</h3>
              <p className="text-emerald-100 text-xs">Ρωτήστε ό,τι θέλετε για την πλατφόρμα</p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-emerald-200 hover:text-white text-xs font-medium transition-colors"
              >
                Καθαρισμός
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-emerald-500" />
                </div>
                <h4 className="text-sm font-bold text-zinc-900 mb-1">Πώς μπορώ να βοηθήσω;</h4>
                <p className="text-xs text-zinc-400 mb-6">Ρωτήστε με οτιδήποτε σχετικό με την πλατφόρμα</p>

                <div className="grid grid-cols-2 gap-2 w-full">
                  {QUICK_PROMPTS.map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(qp.prompt)}
                      className="text-left p-3 rounded-xl border border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all text-xs text-zinc-600 font-medium"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-zinc-100 text-zinc-800 rounded-bl-md'
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    <span className="text-xs text-zinc-400">Σκέφτομαι...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-100">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Γράψτε ένα μήνυμα..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-zinc-400 max-h-20"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
