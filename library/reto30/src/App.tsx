import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth } from './lib/firebase';
import { syncUserProgress } from './utils/progress';
import { scheduleDailyReminder } from './utils/notifications';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Thoughts from './pages/Thoughts';
import Activities from './pages/Activities';
import Relationships from './pages/Relationships';
import DayDetail from './pages/DayDetail';
import ResourceView from './pages/ResourceView';
import Landing from './pages/Landing';
import AdminPanel from './pages/AdminPanel';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import PartnerDemo from './pages/PartnerDemo';


// Component to handle redirect for Native or PWA standalone
const AppRedirect: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isNative = Capacitor.isNativePlatform();

    if ((isNative || isStandalone) && location.pathname === '/') {
      window.location.href = '/app';
    }
  }, [location]);

  return null;
};

const App: React.FC = () => {
  useEffect(() => {
    // Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User signed in:", user.uid);
        syncUserProgress(user);
      } else {
        console.log("No user, signing in anonymously...");
        signInAnonymously(auth).catch((error) => {
          console.error("Error signing in anonymously:", error);
        });
      }
    });

    // Schedule Notifications (e.g. 9:00 AM)
    scheduleDailyReminder(9, 0);

    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <AppRedirect />
      <Routes>
        {/* Landing Page as Root */}
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/demo" element={<PartnerDemo />} />


        {/* App Section with MainLayout */}
        <Route path="/app" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="day/:dayNumber" element={<DayDetail />} />
          <Route path="resource/:resourceId" element={<ResourceView />} />
          <Route path="thoughts" element={<Thoughts />} />
          <Route path="activities" element={<Activities />} />
          <Route path="relationships" element={<Relationships />} />
          <Route path="admin" element={<AdminPanel />} />
        </Route>

        {/* Catch-all - redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
