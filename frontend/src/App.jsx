import React from "react";
import { BrowserRouter as Router, Routes, Route, BrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import Unaothorized from "./pages/Unaothorized";
import DispatcherDashboard from "./DispatcherDashboard";
import { DynamicRedirect, ProtectedRoute } from "./ProtectedRoutes";
import TeamView from "./TeamView";
import SubteamView from "./SubteamView";
import NotFound from "./NotFound";
import { AuthProvider } from "./context/auth";
import { SocketProvider } from "./context/SocketContext";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>

            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unaothorized />} />

            <Route path="/" element={<DynamicRedirect />} />

            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']} />
            }>
              <Route index element={<DispatcherDashboard />} />
            </Route>

            <Route path="/:teamId" element={<ProtectedRoute />}>
              <Route index element={<TeamView />} />
            </Route>

            <Route path="/:teamId/:subteamId" element={<ProtectedRoute />}>
              <Route index element={<SubteamView />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </SocketProvider>

      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;