import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, DocumentData, WithFieldValue, FirestoreDataConverter } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper types for Typescript
export type Request = {
    id: string;
    employee_id: string;
    message: string;
    category: 'Leave' | 'Funds' | 'Promotion' | 'Other'; // Added 'Other' for safety
    priority: 'High' | 'Medium' | 'Low';
    status: 'Pending' | 'Accepted' | 'Rejected';
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    created_at: string;
    manager_comment?: string | null;
    // Structured fields
    request_type: string;
    from_date?: string;
    to_date?: string;
    reason: string;
    ai_insights?: AIInsights;
    // Joined fields (manually populated in NoSQL)
    profiles?: {
        full_name: string;
        email: string;
        department?: string;
    };
};

/** AI explanation and decision-support fields */
export type AIInsights = {
    category_reason?: string | null;
    priority_reason?: string | null;
    intent_signals?: string[];
    confidence_score?: number;
    suggested_action?: 'Approve' | 'Review' | 'Escalate';
    risk_level?: 'Low' | 'Medium' | 'High';
    business_impact?: string;
};

export type Notification = {
    id: string;
    employee_id: string;
    type: 'salary_review' | 'notice';
    title: string;
    message: string;
    created_by?: string;
    read_at?: string;
    created_at: string;
};
