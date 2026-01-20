import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';

// Pages
import Home from './pages/Home';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import RequestHelp from './pages/RequestHelp';
import ActiveTask from './pages/ActiveTask';
import LocationGate from './pages/LocationGate';
import LandingPage from './pages/LandingPage';

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/location-gate" element={<LocationGate />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/request/:helperId" element={<RequestHelp />} />
          <Route path="/task" element={<ActiveTask />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}
