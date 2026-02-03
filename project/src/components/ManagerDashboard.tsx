import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, Request, Notification } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { isEscalated, getRequester } from '../lib/requestUtils';
import { AIExplanationPanel } from './AIExplanationPanel';
import { DecisionSupportPanel } from './DecisionSupportPanel';
import { RequestTimeline } from './RequestTimeline';
import { ManagerAnalytics } from './ManagerAnalytics';
import { AIGovernanceNote } from './AIGovernanceNote';
import {
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Inbox,
  Calendar,
  MessageSquare,
  Users,
  Bell,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Zap,
  FolderClock,
  Send,
  Mail,
  Moon,
  Sun,
  AlertTriangle,
  User,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

type Tab = 'emergency' | 'pending' | 'not-necessary' | 'all' | 'accepted' | 'rejected';

interface EmployeeStats {
  id: string;
  full_name: string;
  email: string;
  total_requests: number;
  accepted: number;
  rejected: number;
  pending: number;
}

interface EmployeeSuggestion {
  id: string;
  suggestion: 'salary_review' | 'notice' | null;
  reason: string;
}

export function ManagerDashboard() {
  const { profile, signOut } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('emergency');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [managerComment, setManagerComment] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeStats[]>([]);
  const [suggestions, setSuggestions] = useState<EmployeeSuggestion[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [noticeModal, setNoticeModal] = useState<{ employee: EmployeeStats; type: 'notice' | 'salary_review' } | null>(null);
  const [noticeMessage, setNoticeMessage] = useState('');
  const [sendingNotice, setSendingNotice] = useState(false);
  const prevStatusRef = useRef<Record<string, string>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // Cache profiles for "joining"
  const [profileCache, setProfileCache] = useState<Record<string, { full_name: string; email: string; department?: string }>>({});

  useEffect(() => {
    // Manager sees all requests
    const q = query(collection(db, 'requests'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const nextReqs: Request[] = [];
      const missingProfiles = new Set<string>();

      snapshot.forEach(doc => {
        const data = doc.data() as Request;
        nextReqs.push({ ...data, id: doc.id });
        if (data.employee_id && !profileCache[data.employee_id]) {
          missingProfiles.add(data.employee_id);
        }
      });

      // Manual Join: Fetch missing profiles
      if (missingProfiles.size > 0) {
        // Simplified: Fetch individually or in batches. For now, fetch ALL profiles to be safe (small scale)
        const profilesSnap = await getDocs(collection(db, 'profiles'));
        const newCache = { ...profileCache };
        profilesSnap.forEach(p => {
          const pData = p.data();
          newCache[p.id] = { full_name: pData.full_name, email: pData.email, department: pData.department };
        });
        setProfileCache(newCache);
      }

      // Attach profile data
      const joinedReqs = nextReqs.map(r => ({
        ...r,
        profiles: profileCache[r.employee_id] ? {
          full_name: profileCache[r.employee_id].full_name,
          email: profileCache[r.employee_id].email,
          department: profileCache[r.employee_id].department
        } : undefined,
        // Compat for older code accessing array or single object
        // We'll normalize in getRequester if needed, or just set it here properly
      }));

      // Filter by Department (Strict Mode)
      // Only show requests where the requester's department matches the manager's department
      const filteredReqs = joinedReqs.filter(r => {
        // If manager has no department (legacy), strictly maybe show nothing or all?
        // User asked "only get request of HR dept...".
        // If manager has a department, filter.
        if (profile?.department) {
          return r.profiles?.department === profile.department;
        }
        return true; // Fallback if manager has no department set yet
      });

      // Sort manually
      filteredReqs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRequests(filteredReqs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profileCache]); // Re-run if cache updates (might cause loops if not careful, but profileCache update is guarded)

  // Actually, to avoid loops, let's decouple profile fetching
  useEffect(() => {
    const fetchProfiles = async () => {
      const profilesSnap = await getDocs(collection(db, 'profiles'));
      const cache: Record<string, any> = {};
      profilesSnap.forEach(p => {
        const pData = p.data();
        cache[p.id] = { full_name: pData.full_name, email: pData.email, department: pData.department };
      });
      setProfileCache(cache);
    };
    fetchProfiles();
  }, []);

  const loadEmployeePerformance = useCallback(async () => {
    setLoadingPerformance(true);
    try {
      const profilesQuery = query(collection(db, 'profiles'), where('role', '==', 'employee'));
      const profilesSnapshot = await getDocs(profilesQuery);
      const allEmployees = profilesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as { id: string; full_name: string; email: string }[];

      const requestsSnapshot = await getDocs(collection(db, 'requests'));
      const requestsData = requestsSnapshot.docs.map(doc => doc.data()) as Request[];

      const byEmployee: Record<string, { total: number; accepted: number; rejected: number; pending: number }> = {};
      allEmployees.forEach((p) => {
        byEmployee[p.id] = { total: 0, accepted: 0, rejected: 0, pending: 0 };
      });
      (requestsData || []).forEach((r) => {
        if (!byEmployee[r.employee_id]) byEmployee[r.employee_id] = { total: 0, accepted: 0, rejected: 0, pending: 0 };
        byEmployee[r.employee_id].total++;
        if (r.status === 'Accepted') byEmployee[r.employee_id].accepted++;
        else if (r.status === 'Rejected') byEmployee[r.employee_id].rejected++;
        else byEmployee[r.employee_id].pending++;
      });

      const stats: EmployeeStats[] = allEmployees.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        total_requests: byEmployee[p.id]?.total ?? 0,
        accepted: byEmployee[p.id]?.accepted ?? 0,
        rejected: byEmployee[p.id]?.rejected ?? 0,
        pending: byEmployee[p.id]?.pending ?? 0,
      }));

      setEmployees(stats);

      /* 
      // Supabase Edge Function - Disabled for Firebase migration
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-employees`;
      const res = await fetch(apiUrl, { ... });
      */
      setSuggestions([]); // No AI suggestions for now
    } catch (e) {
      console.error(e);
      setSuggestions([]);
    } finally {
      setLoadingPerformance(false);
    }
  }, []);

  useEffect(() => {
    loadEmployeePerformance();
  }, [loadEmployeePerformance]);

  const handleUpdateStatus = async (
    requestId: string,
    status: 'Accepted' | 'Rejected',
    comment?: string
  ) => {
    setUpdatingId(requestId);
    try {
      const requestRef = doc(db, 'requests', requestId);
      const updateData = {
        status,
        reviewed_by: profile?.id || null,
        reviewed_at: new Date().toISOString(),
        manager_comment: comment || null
      };

      await updateDoc(requestRef, updateData);

      // Create notification
      const request = requests.find(r => r.id === requestId);
      if (request) {
        await addDoc(collection(db, 'notifications'), {
          employee_id: request.employee_id,
          type: status === 'Accepted' ? 'recognition' : 'notice',
          title: `Request ${status}`,
          message: `Your request for ${request.request_type} has been ${status.toLowerCase()}. ${comment ? `Comment: ${comment}` : ''}`,
          created_by: profile?.id,
          created_at: new Date().toISOString(),
          read_at: null
        });
      }

      // Optimistic update
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
              ...r,
              ...updateData,
            }
            : r
        )
      );

      addToast(
        'success',
        status === 'Accepted' ? 'Request accepted' : 'Request rejected',
        'Emloyee has been notified.',
        5000
      );
    } catch (error: any) {
      console.error('Error updating request:', error);
      alert(`Update failed: ${error.message || 'Unknown error'}`);
      addToast('error', 'Update failed', 'Could not save decision. Try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const sendNotification = async () => {
    if (!noticeModal || !noticeMessage.trim()) return;
    setSendingNotice(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        employee_id: noticeModal.employee.id,
        type: noticeModal.type === 'salary_review' ? 'salary_review' : 'notice',
        title:
          noticeModal.type === 'salary_review'
            ? 'Performance recognition – salary review'
            : 'Performance notice',
        message: noticeMessage.trim(),
        created_by: profile?.id,
        created_at: new Date().toISOString(),
        read_at: null
      });

      setNoticeModal(null);
      setNoticeMessage('');
      addToast('success', 'Notification sent', 'Employee has been notified.');
    } catch (e) {
      console.error(e);
      alert('Failed to send notification');
    } finally {
      setSendingNotice(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'Low':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-amber-100 text-amber-700 border-amber-300';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'Rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'Pending');
  const emergency = pendingRequests.filter((r) => r.priority === 'High');
  const pendingMedium = pendingRequests.filter((r) => r.priority === 'Medium');
  const notNecessary = pendingRequests.filter((r) => r.priority === 'Low');

  const getListByTab = (): Request[] => {
    switch (activeTab) {
      case 'emergency':
        return emergency;
      case 'pending':
        return pendingMedium;
      case 'not-necessary':
        return notNecessary;
      case 'accepted':
        return requests.filter((r) => r.status === 'Accepted');
      case 'rejected':
        return requests.filter((r) => r.status === 'Rejected');
      default:
        return pendingRequests;
    }
  };

  const tabLabels: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'emergency', label: 'Emergency', icon: <Zap className="w-4 h-4" />, count: emergency.length },
    { key: 'pending', label: 'Pending review', icon: <Inbox className="w-4 h-4" />, count: pendingMedium.length },
    { key: 'not-necessary', label: 'Not necessary now', icon: <FolderClock className="w-4 h-4" />, count: notNecessary.length },
    { key: 'all', label: 'All pending', icon: <Inbox className="w-4 h-4" />, count: pendingRequests.length },
  ];

  const stats = {
    total: requests.length,
    pending: pendingRequests.length,
    accepted: requests.filter((r) => r.status === 'Accepted').length,
    rejected: requests.filter((r) => r.status === 'Rejected').length,
  };

  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200/80 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Manager Portal</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
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
        {/* Manager Analytics: requests by category, priority, avg approval time, bottlenecks */}
        <div className="mb-8">
          <ManagerAnalytics requests={requests} dark={isDark} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-600 p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total requests</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <button
            onClick={() => setActiveTab('pending')}
            className={`text-left bg-amber-50 dark:bg-amber-900/20 rounded-2xl border ${activeTab === 'pending' ? 'border-amber-400 ring-2 ring-amber-200' : 'border-amber-200/80'} dark:border-amber-700/50 p-6 transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer`}
          >
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Pending</p>
            <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{stats.pending}</p>
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`text-left bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border ${activeTab === 'accepted' ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-emerald-200/80'} dark:border-emerald-700/50 p-6 transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer`}
          >
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">Accepted</p>
            <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{stats.accepted}</p>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`text-left bg-red-50 dark:bg-red-900/20 rounded-2xl border ${activeTab === 'rejected' ? 'border-red-400 ring-2 ring-red-200' : 'border-red-200/80'} dark:border-red-700/50 p-6 transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer`}
          >
            <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Rejected</p>
            <p className="text-3xl font-bold text-red-900 dark:text-red-100">{stats.rejected}</p>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-bold text-slate-900">Requests from employees</h2>
                <div className="flex flex-wrap gap-2">
                  {tabLabels.map(({ key, label, icon, count }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === key
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {icon}
                      {label}
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 min-h-[320px]">
                {loading ? (
                  <p className="text-slate-500 text-center py-12">Loading...</p>
                ) : getListByTab().length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No {activeTab === 'all' ? 'pending' : activeTab.replace('-', ' ')} requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getListByTab().map((request) => {
                      const requester = getRequester(request);
                      const escalated = isEscalated(request);
                      const highlighted = highlightedId === request.id;
                      return (
                        <div
                          key={request.id}
                          className={`border rounded-xl overflow-hidden hover:shadow-md transition ${highlighted ? 'border-indigo-500 animate-highlight ring-2 ring-indigo-300 dark:ring-indigo-600' : 'border-slate-200 dark:border-slate-600'
                            } bg-white dark:bg-slate-800/50`}
                        >
                          <div className="p-5">
                            {/* Requested by: name + email (always visible for manager) */}
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                              <div className="rounded-lg bg-slate-100 dark:bg-slate-700/50 px-4 py-2.5 border border-slate-200 dark:border-slate-600">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Requested by</p>
                                <p className="font-semibold text-slate-900 dark:text-white">{requester.full_name}</p>
                                {requester.email ? (
                                  <a
                                    href={`mailto:${requester.email}`}
                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    {requester.email}
                                  </a>
                                ) : (
                                  <p className="text-sm text-slate-500 dark:text-slate-400">No email on file</p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 items-center">
                                {escalated && (
                                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Escalated
                                  </span>
                                )}
                                <span
                                  className={`px-3 py-1 rounded-lg text-xs font-medium ${getRequestTypeColor(
                                    request.request_type
                                  )}`}
                                >
                                  {request.request_type}
                                </span>
                                <span
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(
                                    request.priority
                                  )}`}
                                >
                                  {request.priority} priority
                                </span>
                                {getStatusIcon(request.status)}
                              </div>
                            </div>
                            {(request.from_date || request.to_date) && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                <Calendar className="w-4 h-4" />
                                {request.from_date && request.to_date
                                  ? `${new Date(request.from_date).toLocaleDateString()} – ${new Date(
                                    request.to_date
                                  ).toLocaleDateString()}`
                                  : request.from_date
                                    ? `From ${new Date(request.from_date).toLocaleDateString()}`
                                    : request.to_date
                                      ? `Until ${new Date(request.to_date).toLocaleDateString()}`
                                      : null}
                              </div>
                            )}
                            <p className="text-slate-700 dark:text-slate-200 text-sm bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg mb-4">
                              {request.reason}
                            </p>

                            {/* AI explanation + Decision support + Timeline */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                              <AIExplanationPanel
                                insights={request.ai_insights}
                                category={request.category}
                                priority={request.priority}
                                dark={isDark}
                              />
                              <DecisionSupportPanel insights={request.ai_insights} dark={isDark} />
                              <div className="rounded-xl border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 p-4">
                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Request timeline</p>
                                <RequestTimeline
                                  createdAt={request.created_at}
                                  reviewedAt={request.reviewed_at}
                                  status={request.status}
                                  dark={isDark}
                                />
                              </div>
                            </div>

                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                              Submitted {new Date(request.created_at).toLocaleString()}
                            </p>

                            {request.status === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedId(expandedId === request.id ? null : request.id)
                                  }
                                  className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                  {expandedId === request.id ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                  Add comment (optional)
                                </button>
                                {expandedId === request.id && (
                                  <div className="mt-3">
                                    <textarea
                                      value={managerComment[request.id] ?? ''}
                                      onChange={(e) =>
                                        setManagerComment((prev) => ({
                                          ...prev,
                                          [request.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Add a note for the employee..."
                                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                                      rows={2}
                                    />
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-3 mt-4">
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        request.id,
                                        'Rejected',
                                        managerComment[request.id]
                                      )
                                    }
                                    disabled={updatingId === request.id}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-medium disabled:opacity-50"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        request.id,
                                        'Accepted',
                                        managerComment[request.id]
                                      )
                                    }
                                    disabled={updatingId === request.id}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition font-medium disabled:opacity-50"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Accept
                                  </button>
                                </div>
                              </>
                            )}
                            {request.status !== 'Pending' && request.manager_comment && (
                              <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{request.manager_comment}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200/80 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">Team & AI insights</h2>
              </div>
              <div className="p-6">
                {loadingPerformance ? (
                  <p className="text-slate-500 text-sm">Analyzing performance...</p>
                ) : (
                  <div className="space-y-4">
                    {suggestions
                      .filter((s) => s.suggestion)
                      .map((s) => {
                        const emp = employees.find((e) => e.id === s.id);
                        if (!emp) return null;
                        return (
                          <div
                            key={s.id}
                            className={`rounded-xl border p-4 ${s.suggestion === 'salary_review'
                              ? 'bg-emerald-50/80 border-emerald-200'
                              : 'bg-amber-50/80 border-amber-200'
                              }`}
                          >
                            <p className="font-semibold text-slate-900">{emp.full_name}</p>
                            <p className="text-xs text-slate-500 mb-2">{emp.email}</p>
                            <p className="text-sm text-slate-700 mb-2">{s.reason}</p>
                            <p className="text-xs text-slate-500 mb-3">
                              Requests: {emp.total_requests} · Accepted: {emp.accepted} ·
                              Pending: {emp.pending}
                            </p>
                            <div className="flex gap-2">
                              {s.suggestion === 'salary_review' && (
                                <button
                                  onClick={() => {
                                    setNoticeModal({ employee: emp, type: 'salary_review' });
                                    setNoticeMessage(
                                      'Your performance has been recognized. We are considering you for a salary review.'
                                    );
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                                >
                                  <TrendingUp className="w-4 h-4" />
                                  Send recognition
                                </button>
                              )}
                              {s.suggestion === 'notice' && (
                                <button
                                  onClick={() => {
                                    setNoticeModal({ employee: emp, type: 'notice' });
                                    setNoticeMessage('');
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
                                >
                                  <Bell className="w-4 h-4" />
                                  Send notice
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {suggestions.filter((s) => s.suggestion).length === 0 && !loadingPerformance && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm">No AI suggestions yet. Submit more requests to get insights.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* AI Governance: transparency, human override, fairness */}
            <div className="mt-6">
              <AIGovernanceNote compact dark={isDark} />
            </div>
          </div>
        </div>
      </div>

      {noticeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {noticeModal.type === 'salary_review' ? 'Send recognition' : 'Send notice'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">To: {noticeModal.employee.full_name}</p>
            <textarea
              value={noticeMessage}
              onChange={(e) => setNoticeMessage(e.target.value)}
              placeholder={
                noticeModal.type === 'salary_review'
                  ? 'Message about salary review / recognition...'
                  : 'Write the notice message...'
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setNoticeModal(null);
                  setNoticeMessage('');
                }}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={sendNotification}
                disabled={sendingNotice || !noticeMessage.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sendingNotice ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
