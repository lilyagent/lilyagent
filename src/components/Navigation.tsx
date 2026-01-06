import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Github, Sparkles, Zap } from 'lucide-react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

interface NavigationProps {
  onCreateAgent: () => void;
  walletAddress?: string;
  onWalletConnect: (address: string) => void;
  onWalletDisconnect: () => void;
}

export default function Navigation({
  onCreateAgent,
  onWalletConnect,
  onWalletDisconnect,
}: NavigationProps) {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const { address, isConnected } = useAppKitAccount();

  useEffect(() => {
    if (isConnected && address) {
      onWalletConnect(address);
    } else {
      onWalletDisconnect();
    }
  }, [isConnected, address, onWalletConnect, onWalletDisconnect]);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: null },
    { path: '/dashboard/marketplace', label: 'Agents', icon: null },
    { path: '/dashboard/api-marketplace', label: 'APIs', icon: null },
    { path: '/dashboard/agents', label: 'My Agents', icon: null },
    { path: '/dashboard/apis', label: 'My APIs', icon: null },
    { path: '/dashboard/x402', label: 'Payments', icon: Zap },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-12">
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200"
            >
              <img
                src="/lily-logo-icon.png"
                alt="Lily"
                className="h-8 w-8 rounded-lg object-cover"
              />
              <span className="text-xl font-semibold text-gray-900">Lily</span>
            </Link>
            {isDashboard && (
              <div className="flex space-x-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                      location.pathname === link.path
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {link.icon && <link.icon size={16} />}
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://x.com/lilyagent_ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-900 transition-colors duration-200"
              title="Follow on X"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a
              href="https://github.com/lilyagent/lilyagent"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-900 transition-colors duration-200"
              title="View on GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            {isDashboard && (
              <>
                <button
                  onClick={onCreateAgent}
                  className="flex items-center gap-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  Create Agent
                </button>
                <appkit-button />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
