import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Shield, ArrowRight, Zap, CheckCircle, BarChart3, Users, Layout, Lock, Sun, Moon } from 'lucide-react';

interface LandingPageProps {
    onNavigate: (page: 'auth_employee' | 'auth_manager' | 'home') => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-white selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
            {/* Navigation Bar */}
            <nav className="fixed w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
                            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                                AI Workflow Automation
                            </span>
                        </div>

                        <div className="hidden md:flex items-center gap-8">
                            <button onClick={() => onNavigate('home')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Home</button>
                            <button onClick={() => onNavigate('auth_employee')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Employee Portal</button>
                            <button onClick={() => onNavigate('auth_manager')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Manager Portal</button>
                            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">How It Works</a>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                aria-label="Toggle theme"
                            >
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => onNavigate('auth_manager')}
                                className="hidden md:flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all duration-300"
                            >
                                Manager Login
                            </button>
                            <button
                                onClick={() => onNavigate('auth_employee')}
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-300 transform hover:-translate-y-0.5"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-white pointer-events-none" />
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-100/30 to-transparent pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="animate-fade-in-up">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-semibold mb-6 border border-indigo-200 dark:border-indigo-800 shadow-sm">
                            ✨ New: API-Powered Analysis
                        </span>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 leading-tight">
                            Automate Workplace <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Requests with AI</span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                            Smartly categorize, prioritize, and manage employee requests using advanced AI.
                            Eliminate bottlenecks and focus on what matters.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => onNavigate('auth_employee')}
                                className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2"
                            >
                                Submit a Request <ArrowRight className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => onNavigate('auth_manager')}
                                className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl shadow-sm transition-all duration-300 flex items-center justify-center gap-2 group"
                            >
                                Manager Login <Lock className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div id="features" className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Why choose our platform?</h2>
                        <p className="text-lg text-slate-600">Built for modern teams who want to move faster and smarter.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-amber-500" />}
                            title="AI Categorization"
                            description="Automatically tags requests with accurate categories and risk levels using Gemini AI."
                            color="amber"
                        />
                        <FeatureCard
                            icon={<BarChart3 className="w-6 h-6 text-indigo-500" />}
                            title="Priority Detection"
                            description="Smartly assigns High, Medium, or Low priority based on context and urgency."
                            color="indigo"
                        />
                        <FeatureCard
                            icon={<CheckCircle className="w-6 h-6 text-emerald-500" />}
                            title="Real-time Updates"
                            description="Instant notifications and live status tracking for all employee requests."
                            color="emerald"
                        />
                        <FeatureCard
                            icon={<Layout className="w-6 h-6 text-purple-500" />}
                            title="Manager Dashboard"
                            description="A centralized command center to review, approve, and analyze team performance."
                            color="purple"
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Shield className="w-6 h-6 text-indigo-500" />
                            <span className="text-lg font-bold text-white">AI Workflow Automation</span>
                        </div>
                        <div className="text-sm">
                            Built for <span className="text-indigo-400 font-medium">Hackathon 2026</span> demonstration purposes.
                        </div>
                        <div className="flex gap-6">
                            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
                            <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
                            <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) {
    const bgColors: Record<string, string> = {
        amber: 'bg-amber-50 dark:bg-amber-900/20 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30',
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30',
        purple: 'bg-purple-50 dark:bg-purple-900/20 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30',
    };

    return (
        <div className="group p-6 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300 bg-white dark:bg-slate-800/50">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${bgColors[color]}`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
        </div>
    );
}
