import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import axios from 'axios';

import MainLayout from './layouts/MainLayout';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import EventsPage from './pages/public/EventsPage';
import EventDetailPage from './pages/public/EventDetailPage';
import NotFoundPage from './pages/public/NotFoundPage';

import UserDashboardPage from './pages/user/UserDashboardPage';
import BookingHistoryPage from './pages/user/BookingHistoryPage';
import BookingDetailPage from './pages/user/BookingDetailPage';
import BookingFormPage from './pages/user/BookingFormPage';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminEventsPage from './pages/admin/AdminEventsPage';
import AdminEventFormPage from './pages/admin/AdminEventFormPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminRefundsPage from './pages/admin/AdminRefundsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

const RequireAuth = ({ isAuthenticated, children }) =>
    isAuthenticated ? children : <Navigate to="/login" replace />;

const RequireAdmin = ({ isAuthenticated, isAdmin, children }) =>
    isAuthenticated && isAdmin
        ? children
        : <Navigate to={isAuthenticated ? '/user/dashboard' : '/login'} replace />;

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const bootstrapAuth = async () => {
            const stored = localStorage.getItem('user');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setUser(parsed);
                    setIsAuthenticated(true);
                } catch {
                    localStorage.removeItem('user');
                }
            }

            try {
                const response = await axios.get('/api/user');
                if (response?.data) {
                    setUser(response.data);
                    setIsAuthenticated(true);
                    localStorage.setItem('user', JSON.stringify(response.data));
                }
            } catch {
                localStorage.removeItem('user');
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setCheckingAuth(false);
            }
        };

        bootstrapAuth();
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post('/api/logout');
        } catch {
            // Ignore transport errors on logout.
        }

        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = '/login';
    };

    const isAdmin = !!user && (user.is_admin === true || user.isAdmin === true);

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-grid-lines text-white px-4">
                <div className="relative page-card p-8 max-w-md w-full text-center overflow-hidden">
                    <div className="ambient-orb w-32 h-32 -top-12 -left-10" />
                    <div className="ambient-orb w-32 h-32 -bottom-12 -right-10" />
                    <p className="eyebrow mb-2">Please Wait</p>
                    <p className="text-sm font-semibold tracking-[0.12em] uppercase text-zinc-200 mb-3">
                        Loading Experience
                    </p>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full w-2/3 bg-zinc-300 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    const withLayout = (content) => (
        <MainLayout user={user} isAdmin={isAdmin} onLogout={handleLogout}>
            {content}
        </MainLayout>
    );

    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={
                        isAuthenticated
                            ? <Navigate to={isAdmin ? '/admin/dashboard' : '/user/dashboard'} replace />
                            : <LoginPage />
                    }
                />
                <Route
                    path="/register"
                    element={
                        isAuthenticated
                            ? <Navigate to={isAdmin ? '/admin/dashboard' : '/user/dashboard'} replace />
                            : <RegisterPage />
                    }
                />

                <Route path="/" element={withLayout(<EventsPage isAuthenticated={isAuthenticated} />)} />
                <Route path="/events" element={withLayout(<EventsPage isAuthenticated={isAuthenticated} />)} />
                <Route path="/events/:id" element={withLayout(<EventDetailPage isAuthenticated={isAuthenticated} />)} />

                <Route
                    path="/events/:id/book"
                    element={
                        <RequireAuth isAuthenticated={isAuthenticated}>
                            {withLayout(<BookingFormPage user={user} />)}
                        </RequireAuth>
                    }
                />

                <Route
                    path="/user/dashboard"
                    element={
                        <RequireAuth isAuthenticated={isAuthenticated}>
                            {withLayout(<UserDashboardPage isAdmin={false} />)}
                        </RequireAuth>
                    }
                />
                <Route
                    path="/user/bookings"
                    element={
                        <RequireAuth isAuthenticated={isAuthenticated}>
                            {withLayout(<BookingHistoryPage />)}
                        </RequireAuth>
                    }
                />
                <Route
                    path="/user/bookings/:id"
                    element={
                        <RequireAuth isAuthenticated={isAuthenticated}>
                            {withLayout(<BookingDetailPage />)}
                        </RequireAuth>
                    }
                />

                <Route
                    path="/admin/dashboard"
                    element={
                        <RequireAdmin isAuthenticated={isAuthenticated} isAdmin={isAdmin}>
                            {withLayout(<AdminDashboardPage isAdmin={true} />)}
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/admin/events"
                    element={
                        <RequireAdmin isAuthenticated={isAuthenticated} isAdmin={isAdmin}>
                            {withLayout(<AdminEventsPage />)}
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/admin/events/create"
                    element={
                        <RequireAdmin isAuthenticated={isAuthenticated} isAdmin={isAdmin}>
                            {withLayout(<AdminEventFormPage />)}
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/admin/events/:id/edit"
                    element={
                        <RequireAdmin isAuthenticated={isAuthenticated} isAdmin={isAdmin}>
                            {withLayout(<AdminEventFormPage />)}
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/admin/bookings"
                    element={
                        <RequireAdmin isAuthenticated={isAuthenticated} isAdmin={isAdmin}>
                            {withLayout(<AdminBookingsPage />)}
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/admin/refund-requests"
                    element={
                        <RequireAdmin isAuthenticated={isAuthenticated} isAdmin={isAdmin}>
                            {withLayout(<AdminRefundsPage />)}
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/admin/users"
                    element={
                        <RequireAdmin isAuthenticated={isAuthenticated} isAdmin={isAdmin}>
                            {withLayout(<AdminUsersPage />)}
                        </RequireAdmin>
                    }
                />

                <Route path="*" element={withLayout(<NotFoundPage />)} />
            </Routes>
        </Router>
    );
}

export default App;
