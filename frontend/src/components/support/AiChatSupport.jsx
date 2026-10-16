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
  Minimize2,
  Maximize2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  Paperclip
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supportApi } from '../../services/api';
import { Spinner } from '../ui';

export default function AiChatSupport() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hello${user?.name ? ' ' + user.name : ''}! I am your **Quontriz Invoza AI Support Assistant**.\n\nI can help you with:\n- **Uploading & reviewing invoices** (PDF/Image OCR)\n- **Owner bill approvals & payments** (UPI, Bank, Card, Cash)\n- **Stock requisitions & Required Items**\n- **GST tax breakdowns & team permissions**\n\n*If your issue is not resolved, you can escalate anytime to **support@supermarket.com**.*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      showResolutionCheck: false
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalationNotes, setEscalationNotes] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationSuccess, setEscalationSuccess] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  const quickPrompts = [
    'How do I upload & review invoices?',
    'How do Owners approve & pay bills?',
    'How do staff request store items?',
    'How does GST tax arithmetic work?',
    'I need help from support@supermarket.com'
  ];

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
    if (/support@supermarket\.com|escalat|human support|talk to human|contact support/i.test(text)) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: `I'd be glad to escalate this directly to our operations team at **support@supermarket.com**. Click the button below to send your ticket!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showResolutionCheck: true,
            suggestEscalation: true
          }
        ]);
        setIsLoading(false);
      }, 500);
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
    e?.preventDefault();
    setIsEscalating(true);
    setEscalationSuccess(null);

    try {
      const lastUserQuestion = [...messages].reverse().find((m) => m.role === 'user')?.content || 'Support inquiry';
      const payload = {
        userEmail: user?.email || 'user@supermarket.com',
        userName: user?.name || 'Store User',
        userRole: user?.role || 'staff',
        issue: escalationNotes.trim() || `User reported: "${lastUserQuestion}" and requested support escalation.`,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        subject: `[Support Request] Unresolved query from ${user?.name || 'User'} (${user?.role || 'staff'})`
      };

      const res = await supportApi.escalate(payload);
      if (res.success && res.data) {
        setEscalationSuccess(res.data);
        toastSuccess(`Support ticket #${res.data.ticketId} sent to support@supermarket.com`);
        setMessages((prev) => [
          ...prev,
          {
            id: `esc-${Date.now()}`,
            role: 'assistant',
            content: `✅ **Ticket #${res.data.ticketId} Sent!**\n\nYour inquiry has been escalated directly to **support@supermarket.com**. Our operations desk will review your conversation history and contact you at **${payload.userEmail}**.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showResolutionCheck: false
          }
        ]);
        setTimeout(() => setShowEscalateModal(false), 2000);
      } else {
        throw new Error(res.error || 'Failed to dispatch ticket.');
      }
    } catch (err) {
      toastError(err.message || 'Failed to send ticket.');
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <>
      {/* 1. Floating Trigger Button (Bottom-Right) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-[9980] flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 group border border-indigo-400/30"
          title="Open AI Chat Support"
          aria-label="Open AI Chat Support"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-indigo-700 rounded-full" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">AI Support</span>
          <span className="hidden sm:inline-block text-[10px] uppercase font-black bg-white/20 px-2 py-0.5 rounded-full">
            Helpdesk
          </span>
        </button>
      )}

      {/* 2. Chat Widget Window */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-[9990] w-[390px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-40px)] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight leading-tight">Invoza AI Support</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 animate-pulse" />
                </div>
                <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                  <span>Target: support@supermarket.com</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowEscalateModal(true)}
                className="px-2.5 py-1 text-[11px] font-bold bg-white/15 hover:bg-white/25 rounded-xl transition flex items-center gap-1 text-white border border-white/20"
                title="Send ticket to support@supermarket.com"
              >
                <Mail className="w-3 h-3 text-indigo-200" />
                <span className="hidden sm:inline">Escalate</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition"
                title="Close Support"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body / Message List */}
          <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto bg-slate-50/60 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-3 rounded-2xl shadow-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-normal">
                      {msg.content}
                    </div>
                  </div>

                  <div className={`text-[10px] text-slate-400 px-1 flex items-center gap-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Resolution Feedback Card */}
                  {msg.role === 'assistant' && msg.showResolutionCheck && (
                    <div className="p-2.5 bg-indigo-50/80 border border-indigo-100 rounded-xl space-y-2 text-[11px] animate-in fade-in duration-200">
                      <p className="font-semibold text-indigo-950 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-indigo-600" />
                        <span>Did this answer resolve your issue?</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            toastSuccess('Glad we could help!');
                            setMessages((prev) =>
                              prev.map((m) => (m.id === msg.id ? { ...m, showResolutionCheck: false } : m))
                            );
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-lg transition text-[10px] flex items-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Yes, Resolved</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowEscalateModal(true);
                            setMessages((prev) =>
                              prev.map((m) => (m.id === msg.id ? { ...m, showResolutionCheck: false } : m))
                            );
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition text-[10px] flex items-center gap-1 shadow-2xs"
                        >
                          <Mail className="w-3 h-3" />
                          <span>No, Send to Support</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs font-bold text-[11px]">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                )}
              </div>
            ))}

            {/* Typing / Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                  <span className="text-[11px] text-slate-400 font-medium ml-1">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel (when few messages) */}
          {messages.length <= 3 && (
            <div className="px-3 py-2 bg-slate-100/70 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
                Quick:
              </span>
              {quickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-700 text-[11px] font-medium rounded-full whitespace-nowrap transition shadow-2xs"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input */}
          <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question or issue..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                className="w-9 h-9 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95 shadow-sm"
                title="Send Message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Unresolved questions escalate to:</span>
              <button
                type="button"
                onClick={() => setShowEscalateModal(true)}
                className="text-indigo-600 hover:underline font-bold flex items-center gap-0.5"
              >
                <span>support@supermarket.com</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* 3. ESCALATION TICKET MODAL OVERLAY */}
          {showEscalateModal && (
            <div className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl w-full p-4 border border-slate-200 shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">Escalate to Support</h4>
                      <p className="text-[10px] text-slate-500">Destination: support@supermarket.com</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Recipient:</span>
                      <span className="font-bold text-slate-800">support@supermarket.com</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Your Email:</span>
                      <span className="font-semibold text-slate-700">{user?.email || 'user@supermarket.com'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Account:</span>
                      <span className="font-semibold text-slate-700">{user?.name || 'Store User'} ({user?.role || 'staff'})</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Describe your unresolved issue:
                    </label>
                    <textarea
                      rows={3}
                      value={escalationNotes}
                      onChange={(e) => setEscalationNotes(e.target.value)}
                      placeholder="Explain what didn't resolve or what you need human assistance with..."
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Your recent chat history will be automatically bundled into the email ticket.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEscalateSubmit}
                    disabled={isEscalating}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    {isEscalating ? <Spinner size="sm" /> : <Send className="w-3 h-3" />}
                    <span>{isEscalating ? 'Sending...' : 'Send to support@supermarket.com'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
