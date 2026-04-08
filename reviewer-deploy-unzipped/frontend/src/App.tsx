import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReviewList from './pages/ReviewList';
import ReviewDetail from './pages/ReviewDetail';
import KnowledgeBase from './pages/KnowledgeBase';
import Layout from './components/Layout';
import { authService } from './services/authService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return authService.isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <ConfigProvider locale={koKR}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="reviews" element={<ReviewList />} />
              <Route path="reviews/:id" element={<ReviewDetail />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
            </Route>
          </Routes>
        </Router>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
