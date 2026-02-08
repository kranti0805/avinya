# Avinya: AI-Powered Workflow Automation System

Avinya is a state-of-the-art workflow automation platform designed to streamline employee requests and manager approvals through the power of Generative AI. Built with React, TypeScript, Firebase, and Google's Gemini AI, it transforms traditional HR processes into intelligent, data-driven workflows.

## 🚀 Key Features

### 👨‍💻 Employee Dashboard
- **Intelligent Submission**: Submit leave, sponsorship, or promotion requests with an AI-driven interface.
- **Real-time Status Tracking**: Monitor the progress of your requests with a detailed timeline.
- **AI-Enhanced Feedback**: Receive immediate AI analysis of your request priority and business impact.
- **Notifications**: Instant updates when a manager reviews or comments on your request.

### 👩‍💼 Manager Dashboard
- **AI Decision Support**: AI-generated suggestions for approvals, risk assessments, and business impact analysis.
- **Explainable AI**: Transparent reasoning behind AI-assigned priorities and categories.
- **Team Statistics**: Overview of employee performance and request trends.
- **Interactive Action Center**: Quickly accept, reject, or comment on requests with a streamlined UI.
- **Emergency Priority Handling**: Automated detection and prioritization of urgent medical or systemic issues.

### 🧠 Advanced AI Integration
- **Google Gemini API**: Native integration with Gemini models for sophisticated natural language reasoning.
- **Intelligent Fallback System**: Robust rule-based analysis that maintains intelligent functionality even if the API is unavailable.
- **Multi-Model Discovery**: Automatically discovers and utilizes the best available Gemini model (Flash, Pro, Experimental).

## 🛠 Tech Stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS
- **Backend & Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **AI Engine**: Google Gemini AI (@google/generative-ai)
- **Icons**: Lucide React
- **Themes**: Full Light/Dark mode support

## ⚙️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Firebase account
- Google AI Studio API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kranti0805/avinya.git
   cd avinya/project
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `project` directory and add your credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GEMINI_API_KEY=your_gemini_key
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

## 🔐 Security

- **Client-Side Security**: All API keys are managed via environment variables and excluded from Git.
- **Firestore Rules**: Granular security rules protect employee and manager data separation.
- **AI Governance**: Non-identifiable data handling ensures employee privacy during AI analysis.

---
