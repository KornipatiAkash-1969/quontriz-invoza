import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Mail,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  ShieldCheck,
  Headphones,
  ExternalLink,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supportApi } from '../../services/api';
import { Spinner } from '../ui';

export default function AiChatSupport() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'ticket'

  const initialWelcomeMessage = {
    id: 'welcome',
    role: 'assistant',
    content: `👋 Hello${user?.name ? ' ' + user.name : ''}! I'm your **Quontriz Invoza AI Assistant**.\n\nI can help you with:\n• **Invoice OCR & Uploads**: PDF & receipt photo processing\n• **Owner Bill Approvals**: Settle payments via UPI, Bank, or Cash\n• **Stock Replenishment**: Submit shelf restocking requests\n• **GST Tax Audits**: Verify CGST, SGST, IGST calculations\n\n*If your issue is not resolved, you can escalate anytime to **support@supermarket.com**.*`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    showResolutionCheck: false
  };

  const [messages, setMessages] = useState([initialWelcomeMessage]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Ticket Escalation State
  const [ticketIssue, setTicketIssue] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationSuccess, setEscalationSuccess] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading, activeTab]);

  const quickPrompts = [
    { label: 'Upload & OCR guide', text: 'How do I upload and review supplier invoices with AI OCR?' },
    { label: 'Owner bill payments', text: 'How do store owners review, approve, and record payments for invoices?' },
    { label: 'Stock restock demands', text: 'How do staff members submit store shelf restocking requests?' },
    { label: 'GST tax verification', text: 'How does GST tax arithmetic and calculation verification work?' },
    { label: 'Contact operations desk', text: 'I need human assistance from support@supermarket.com' }
  ];

  const handleResetChat = () => {
    setMessages([initialWelcomeMessage]);
    setInputMessage('');
    setEscalationSuccess(null);
    toastSuccess('Chat history cleared.');
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    // If user explicitly asks for support email or escalation
    if (/support@supermarket\.com|escalat|human support|talk to human|contact support|operations desk/i.test(text)) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: `I would be happy to escalate this directly to our operations team at **support@supermarket.com**.\n\nYou can submit an official ticket below with your chat history attached.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showResolutionCheck: true,
            suggestEscalation: true
          }
        ]);
        setIsLoading(false);
      }, 400);
      return;
    }

    try {
      const res = await supportApi.chat(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        { route: window.location.pathname }
      );

      if (res.success && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: res.data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showResolutionCheck: true,
            suggestEscalation: Boolean(res.data.suggestEscalation)
          }
        ]);
      } else {
        throw new Error(res.error || 'Unable to receive response.');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: `I ran into an issue connecting to the AI engine. If your question was not resolved, you can escalate directly to **support@supermarket.com**.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          showResolutionCheck: true,
          suggestEscalation: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEscalateSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsEscalating(true);

    try {
      const lastUserQuestion = [...messages].reverse().find((m) => m.role === 'user')?.content || 'Support inquiry';
      const payload = {
        userEmail: user?.email || 'user@supermarket.com',
        userName: user?.name || 'Store User',
        userRole: user?.role || 'staff',
        issue: ticketIssue.trim() || `User inquiry: "${lastUserQuestion}". Marked unresolved and escalated to operations.`,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        subject: `[Support Ticket] Inquiry from ${user?.name || 'User'} (${user?.role || 'staff'})`
      };

      const res = await supportApi.escalate(payload);
      if (res.success && res.data) {
        setEscalationSuccess(res.data);
        toastSuccess(`Support ticket #${res.data.ticketId} dispatched to support@supermarket.com`);
        setMessages((prev) => [
          ...prev,
          {
            id: `esc-${Date.now()}`,
            role: 'assistant',
            content: `✅ **Ticket #${res.data.ticketId} Created!**\n\nYour issue has been forwarded directly to **support@supermarket.com** along with your chat history. Our team will follow up at **${payload.userEmail}**.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showResolutionCheck: false
          }
        ]);
      } else {
        throw new Error(res.error || 'Failed to dispatch ticket.');
      }
    } catch (err) {
      toastError(err.message || 'Failed to send ticket.');
    } finally {
      setIsEscalating(false);
    }
  };

  // Helper to format assistant markdown text cleanly
  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Bold text replacement
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className={`${line.startsWith('• ') ? 'pl-2 text-slate-700' : ''} ${line === '' ? 'h-2' : ''}`}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={j} className="font-bold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              return (
                <em key={j} className="text-slate-500 text-[11px]">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* 1. Sleek Floating Trigger Button (Bottom-Right) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          data-tour="ai-support-btn"
          className="fixed bottom-5 right-5 z-[9980] flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 border border-indigo-400/30 group"
          title="Open Invoza AI Support"
          aria-label="Open Invoza AI Support"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <Bot className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-indigo-800 rounded-full animate-pulse" />
          </div>

          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold leading-tight tracking-tight">AI Support</p>
            <p className="text-[10px] text-indigo-200 font-medium">24/7 Supermarket Help</p>
          </div>
        </button>
      )}

      {/* 2. Chat Widget Window (Industrial Luxury SaaS Design) */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 left-3 sm:left-auto sm:bottom-5 sm:right-5 z-[9990] w-auto sm:w-[410px] h-[calc(100vh-28px)] max-h-[620px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 pb-3 flex items-center justify-between flex-shrink-0 shadow-md border-b border-indigo-900/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 border border-indigo-400/30">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm tracking-tight text-white truncate">
                    Invoza AI Assistant
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate flex items-center gap-1 mt-0.5">
                  <span className="text-slate-400">Escalates to:</span>
                  <span className="text-indigo-300 font-medium">support@supermarket.com</span>
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Restart conversation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Close Support"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="bg-slate-100/90 p-1 flex items-center gap-1 border-b border-slate-200/80 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'chat'
                  ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>AI Chat Assistant</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ticket')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'ticket'
                  ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Support Ticket</span>
            </button>
          </div>

          {/* TAB 1: AI CHAT VIEW */}
          {activeTab === 'chat' && (
            <>
              {/* Message Feed */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-50/70 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-[85%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`p-3.5 rounded-2xl shadow-2xs leading-relaxed text-xs ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-xs font-medium'
                            : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs space-y-1.5'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          renderFormattedContent(msg.content)
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      <div
                        className={`text-[10px] text-slate-400 px-1 flex items-center gap-1 ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Resolution Check Card */}
                      {msg.role === 'assistant' && msg.showResolutionCheck && (
                        <div className="p-3 bg-white border border-indigo-200 rounded-2xl space-y-2 shadow-2xs animate-in fade-in duration-200">
                          <p className="font-bold text-slate-900 text-[11px] flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Did this answer resolve your inquiry?</span>
                          </p>

                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                toastSuccess('Glad we could help!');
                                setMessages((prev) =>
                                  prev.map((m) =>
                                    m.id === msg.id ? { ...m, showResolutionCheck: false } : m
                                  )
                                );
                              }}
                              className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl transition text-[11px] flex items-center justify-center gap-1.5"
                            >
                              <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Yes, Resolved</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('ticket');
                                setMessages((prev) =>
                                  prev.map((m) =>
                                    m.id === msg.id ? { ...m, showResolutionCheck: false } : m
                                  )
                                );
                              }}
                              className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold rounded-xl transition text-[11px] flex items-center justify-center gap-1.5"
                            >
                              <Mail className="w-3.5 h-3.5 text-indigo-600" />
                              <span>No, Email Support</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs font-bold text-[10px]">
                        {user?.name ? user.name.slice(0, 2).toUpperCase() : 'ME'}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2.5 text-slate-500 text-xs py-1">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-2xl rounded-tl-xs flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                      <span className="text-[11px] text-slate-500 font-semibold ml-1.5">Thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Prompts */}
              {messages.length <= 3 && (
                <div className="p-2.5 bg-slate-50 border-t border-slate-200/80 space-y-1.5 flex-shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                    Suggested Questions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(p.text)}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-700 text-[11px] font-medium rounded-xl transition shadow-2xs text-left"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0 space-y-1.5">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 focus-within:border-indigo-600 focus-within:bg-white rounded-2xl p-1.5 transition shadow-2xs">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about OCR, payments, items..."
                    disabled={isLoading}
                    className="flex-1 px-3 py-1.5 text-xs bg-transparent outline-none font-medium text-slate-800 placeholder-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !inputMessage.trim()}
                    className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95 shadow-2xs flex-shrink-0"
                    title="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                  <span>Press Enter to send</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ticket')}
                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 transition"
                  >
                    <span>Escalate to support@supermarket.com</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: DIRECT EMAIL TICKET TO support@supermarket.com */}
          {activeTab === 'ticket' && (
            <div className="flex-1 p-5 overflow-y-auto bg-slate-50/60 space-y-4 text-xs">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">
                  Escalate to Operations Support
                </h4>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Submit an official support ticket directly to our management team at{' '}
                  <strong className="text-indigo-700 font-semibold">support@supermarket.com</strong>.
                </p>
              </div>

              {/* Pre-filled Details Card */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 shadow-2xs text-[11px]">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">To (Recipient):</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    support@supermarket.com
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Your Work Email:</span>
                  <span className="font-semibold text-slate-800">{user?.email || 'user@supermarket.com'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Your Role:</span>
                  <span className="font-bold text-slate-700 uppercase text-[10px]">
                    {user?.name || 'User'} ({user?.role || 'staff'})
                  </span>
                </div>
              </div>

              {/* Issue Description Field */}
              <form onSubmit={handleEscalateSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Describe your unresolved issue or question:
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={ticketIssue}
                    onChange={(e) => setTicketIssue(e.target.value)}
                    placeholder="Provide details about what you need human assistance with..."
                    className="w-full p-3 text-xs bg-white border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-medium leading-relaxed"
                  />
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1 text-[11px] text-indigo-950">
                  <span className="font-bold flex items-center gap-1 text-indigo-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Includes Conversation Context</span>
                  </span>
                  <p className="text-indigo-900/80 leading-snug">
                    Your recent chat messages will be automatically packaged into the email ticket for quick resolution.
                  </p>
                </div>

                {escalationSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Ticket #{escalationSuccess.ticketId} successfully dispatched to support@supermarket.com!
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl transition text-xs"
                  >
                    Back to Chat
                  </button>

                  <button
                    type="submit"
                    disabled={isEscalating}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                  >
                    {isEscalating ? <Spinner size="sm" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>{isEscalating ? 'Dispatching...' : 'Send to support@supermarket.com'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}
