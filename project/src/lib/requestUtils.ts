import type { Request } from './firebase';

/** Normalize profile from Supabase join (object or array). */
export function getRequester(request: Request): { full_name: string; email: string } {
  const p = request.profiles;
  if (Array.isArray(p) && p.length > 0) {
    return {
      full_name: p[0].full_name ?? 'Unknown',
      email: p[0].email ?? '',
    };
  }
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    return {
      full_name: (p as { full_name?: string }).full_name ?? 'Unknown',
      email: (p as { email?: string }).email ?? '',
    };
  }
  return { full_name: 'Unknown', email: '' };
}

/** Escalation: high-priority pending requests older than threshold (hours). No background jobs; computed on read. */
const ESCALATION_HOURS = 24;

export function isEscalated(request: Request): boolean {
  if (request.status !== 'Pending' || request.priority !== 'High') return false;
  const created = new Date(request.created_at).getTime();
  const now = Date.now();
  return (now - created) / (1000 * 60 * 60) >= ESCALATION_HOURS;
}
