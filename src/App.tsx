import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import CreateAgentModal from './components/CreateAgentModal';
import LoadingScreen from './components/LoadingScreen';
import LilyFlowers from './components/LilyFlowers';
import CursorFollower from './components/CursorFollower';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import APIMarketplace from './pages/APIMarketplace';
import MyAgents from './pages/MyAgents';
import MyAPIs from './pages/MyAPIs';
import AgentDetail from './pages/AgentDetail';
import APIDetail from './pages/APIDetail';
import ContractAdmin from './pages/ContractAdmin';
import X402Payments from './pages/X402Payments';
import './lib/reown';

function AppContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>();
  const location = useLocation();
  const isHomePage = location.pathname === '/' || location.pathname === '/home';

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
  };

  const handleWalletDisconnect = () => {
    setWalletAddress(undefined);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <CursorFollower
        size={32}
        color="#ec4899"
        opacity={0.25}
        delay={0.15}
        showTrail={true}
      />
      <LilyFlowers />
      {!isHomePage && (
        <Navigation
          onCreateAgent={() => setIsModalOpen(true)}
          walletAddress={walletAddress}
          onWalletConnect={handleWalletConnect}
          onWalletDisconnect={handleWalletDisconnect}
        />
      )}
      <CreateAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/marketplace" element={<Marketplace />} />
        <Route path="/dashboard/api-marketplace" element={<APIMarketplace />} />
        <Route path="/dashboard/agents" element={<MyAgents walletAddress={walletAddress} />} />
        <Route path="/dashboard/apis" element={<MyAPIs walletAddress={walletAddress} />} />
        <Route path="/dashboard/x402" element={<X402Payments />} />
        <Route path="/agents/:agentId" element={<AgentDetail />} />
        <Route path="/apis/:apiId" element={<APIDetail />} />
        <Route path="/admin/contracts" element={<ContractAdmin />} />
      </Routes>
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedBefore, setHasLoadedBefore] = useState(false);

  useEffect(() => {
    const loaded = sessionStorage.getItem('hasLoaded');
    if (loaded === 'true') {
      setIsLoading(false);
      setHasLoadedBefore(true);
    }
  }, []);

  const handleLoadComplete = () => {
    setIsLoading(false);
    sessionStorage.setItem('hasLoaded', 'true');
  };

  return (
    <Router>
      {isLoading && !hasLoadedBefore && <LoadingScreen onLoadComplete={handleLoadComplete} />}
      <AppContent />
    </Router>
  );
}

export default App;
