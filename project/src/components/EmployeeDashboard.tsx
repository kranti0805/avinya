import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, Request, Notification } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { RequestTimeline } from './RequestTimeline';
import { AIGovernanceNote } from './AIGovernanceNote';
import { analyzeRequestWithGemini } from '../lib/gemini';
import {
  Send,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell,
  MessageSquare,
  Calendar,
  ChevronDown,
  ChevronUp,
  Zap,
  FolderClock,
  Award,
  Info,
  Moon,
  Sun,
} from 'lucide-react';

type RequestType = 'Leave Application' | 'Fund Request' | 'Promotion Request' | 'Sponsorship Request' | 'Other';

export function EmployeeDashboard() {
  const { profile, signOut } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [requestType, setRequestType] = useState<RequestType>('Leave Application');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<Request[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const prevStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!profile?.id) return;

    // Realtime listener for Requests
    const q = query(
      collection(db, 'requests'),
      where('employee_id', '==', profile.id)
      // Note: Firestore requires an index for ordering by created_at with a where filter
      // We'll trust client-side sorting or the user will clear the "requests" collection first
    );

    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      const next: Request[] = [];
      snapshot.forEach((doc) => {
        next.push({ id: doc.id, ...doc.data() } as Request);
      });
      // Sort manually since we might lack index initially
      next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Check for status changes (simple approach)
      if (prevStatusRef.current) {
        next.forEach(r => {
          const prev = prevStatusRef.current[r.id];
          if (prev === 'Pending' && r.status !== 'Pending') {
            addToast(
              r.status === 'Accepted' ? 'success' : 'info',
              r.status === 'Accepted' ? 'Request approved' : 'Request updated',
              r.status === 'Accepted' ? 'Your request was approved.' : 'Your request was rejected.',
              6000
            );
          }
          prevStatusRef.current[r.id] = r.status;
        });
      }
      setRequests(next);
      setLoading(false);
    });

    // Realtime listener for Notifications
    // Note: This might also fail without composite index (employee_id + created_at)
    // Fallback: fetch purely by employee_id then sort

    const unsubscribeNotif = onSnapshot(query(collection(db, 'notifications'), where('employee_id', '==', profile.id)), (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => notifs.push({ id: doc.id, ...doc.data() } as Notification));
      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(notifs);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeNotif();
    };
  }, [profile?.id, addToast]);

  const markNotificationRead = async (id: string) => {
    try {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, { read_at: new Date().toISOString() });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    try {
      // Client-side categorization (Firebase migration fallback)
      const mapTypeToCategory = (type: string): 'Leave' | 'Funds' | 'Promotion' => {
        if (type === 'Leave Application') return 'Leave';
        if (type === 'Promotion Request') return 'Promotion';
        return 'Funds';
      };

      const defaultCategory = mapTypeToCategory(requestType);

      let priority: 'High' | 'Medium' | 'Low' = 'Medium';
      let aiResult = null;

      try {
        aiResult = await analyzeRequestWithGemini(reason, requestType, profile?.role);
      } catch (err) {
        console.warn('AI Analysis failed, falling back to keywords');
      }

      if (aiResult) {
        priority = aiResult.priority;
      } else {
        // Fallback: Basic keyword analysis
        const rLower = reason.toLowerCase();
        if (rLower.includes('urgent') || rLower.includes('emergency') || rLower.includes(' asap')) {
          priority = 'High';
        } else if (rLower.includes('whenever') || rLower.includes('no rush')) {
          priority = 'Low';
        }
      }

      const payload = {
        category: defaultCategory,
        priority,
        category_reason: aiResult?.category_reason || null,
        priority_reason: aiResult?.priority_reason || "Keyword analysis (Client-side fallback)",
        intent_signals: aiResult?.intent_signals || [],
        confidence_score: aiResult?.confidence_score || 0.8,
        suggested_action: aiResult?.suggested_action || 'Review',
        risk_level: aiResult?.risk_level || 'Low',
        business_impact: aiResult?.business_impact || 'Unknown'
      };

      const ai_insights = {
        category_reason: payload.category_reason,
        priority_reason: payload.priority_reason,
        intent_signals: payload.intent_signals,
        confidence_score: payload.confidence_score,
        suggested_action: payload.suggested_action,
        risk_level: payload.risk_level,
        business_impact: payload.business_impact,
      };

      const baseRequest = {
        employee_id: profile?.id,
        message: reason,
        request_type: requestType,
        from_date: fromDate || null,
        to_date: toDate || null,
        reason,
        category: defaultCategory,
        priority,
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ai_insights
      };

      await addDoc(collection(db, 'requests'), baseRequest);

      setReason('');
      setFromDate('');
      setToDate('');
      setRequestType('Leave Application');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      alert(`Failed to submit request: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'Rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Low':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'Leave Application':
        return 'bg-blue-100 text-blue-700';
      case 'Fund Request':
        return 'bg-green-100 text-green-700';
      case 'Promotion Request':
        return 'bg-orange-100 text-orange-700';
      case 'Sponsorship Request':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'salary_review':
        return <Award className="w-5 h-5 text-emerald-600" />;
      case 'notice':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-indigo-600" />;
    }
  };

  const showDateFields = requestType === 'Leave Application';
  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200/80 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Employee Portal</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setNotifOpen(false)}
                      aria-hidden
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-20">
                      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-semibold text-slate-900">Notifications</h3>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-slate-500 text-sm">No notifications yet</p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                markNotificationRead(n.id);
                                setNotifOpen(false);
                              }}
                              className={`flex gap-3 p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!n.read_at ? 'bg-indigo-50/50' : ''
                                }`}
                            >
                              {getNotifIcon(n.type)}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-sm">{n.title}</p>
                                <p className="text-slate-600 text-sm line-clamp-2">{n.message}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(n.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition font-medium"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Submit new request</h2>
              <p className="text-sm text-slate-500 mb-6">
                AI will automatically prioritize your request (High / Medium / Low).
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Request type
                  </label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value as RequestType)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  >
                    <option value="Leave Application">Leave Application</option>
                    <option value="Fund Request">Fund Request</option>
                    <option value="Promotion Request">Promotion Request</option>
                    <option value="Sponsorship Request">Sponsorship Request</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {showDateFields && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        From date
                      </label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        To date
                      </label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reason / description
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                    rows={5}
                    placeholder="Describe your request. Use words like 'urgent' or 'no rush' to help AI set priority."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? 'Submitting...' : 'Submit request'}
                </button>
              </form>
            </div>
          </div>

          <div>
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-600 p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">My requests</h2>
              {loading ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">Loading...</p>
              ) : requests.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">No requests yet</p>
              ) : (
                <div className="space-y-4 max-h-[640px] overflow-y-auto">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 hover:shadow-md transition bg-white dark:bg-slate-800/30"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-medium ${getRequestTypeColor(
                              request.request_type
                            )}`}
                          >
                            {request.request_type}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-medium ${getPriorityColor(
                              request.priority
                            )}`}
                          >
                            {request.priority === 'High' && <Zap className="w-3 h-3 inline mr-0.5" />}
                            {request.priority === 'Low' && (
                              <FolderClock className="w-3 h-3 inline mr-0.5" />
                            )}
                            {request.priority}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">{request.reason}</p>
                      {request.ai_insights?.priority_reason && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 italic">
                          AI: {request.ai_insights.priority_reason}
                        </p>
                      )}
                      {(request.from_date || request.to_date) && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2">
                          <Calendar className="w-4 h-4" />
                          {request.from_date && request.to_date
                            ? `${new Date(request.from_date).toLocaleDateString()} – ${new Date(
                              request.to_date
                            ).toLocaleDateString()}`
                            : request.from_date
                              ? `From ${new Date(request.from_date).toLocaleDateString()}`
                              : `Until ${new Date(request.to_date!).toLocaleDateString()}`}
                        </div>
                      )}
                      <div className="mb-2">
                        <RequestTimeline
                          createdAt={request.created_at}
                          reviewedAt={request.reviewed_at || null}
                          status={request.status}
                          dark={isDark}
                        />
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                        Submitted {new Date(request.created_at).toLocaleString()}
                      </p>
                      {request.manager_comment && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRequestId(
                                expandedRequestId === request.id ? null : request.id
                              )
                            }
                            className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                          >
                            {expandedRequestId === request.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            Manager feedback
                          </button>
                          {expandedRequestId === request.id && (
                            <div className="mt-2 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{request.manager_comment}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6">
              <AIGovernanceNote compact dark={isDark} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
