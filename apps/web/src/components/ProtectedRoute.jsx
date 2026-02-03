import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to login page with the return url
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role if roles are specified
    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        // Redirect to home or unauthorized page if user doesn't have permission
        // Managers can access employee routes if not strictly restricted, 
        // but here we strictly check if role is in allowedRoles
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
