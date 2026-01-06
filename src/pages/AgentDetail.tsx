import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Copy, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PaymentFlow from '../components/PaymentFlow';
import X402PaymentModal from '../components/X402PaymentModal';
import AgentExecutionTracker from '../components/AgentExecutionTracker';
import LilyFlowers from '../components/LilyFlowers';
import { useWallet } from '../hooks/useWallet';

import type { Agent } from '../types';

type CodeLanguage = 'python' | 'typescript' | 'javascript' | 'curl';

export default function AgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showX402Payment, setShowX402Payment] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [inputQuery, setInputQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('python');

  useEffect(() => {
    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;
      setAgent(data);
    } catch (err) {
      console.error('Failed to fetch agent:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = (useX402: boolean = false) => {
    if (!inputQuery.trim()) {
      alert('Please enter a query');
      return;
    }
    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }
    if (useX402) {
      setShowX402Payment(true);
    } else {
      setShowPayment(true);
    }
  };

  const handleX402PaymentComplete = async (sessionToken: string) => {
    setShowX402Payment(false);

    try {
      const { data, error } = await supabase
        .from('agent_executions')
        .insert({
          agent_id: agentId,
          status: 'processing',
          cost_usdc: agent?.price_usdc || agent?.price || 0,
          payment_required: true,
          x_payment_header: `session=${sessionToken}`,
          input_data: { query: inputQuery },
        })
        .select()
        .single();

      if (error) throw error;
      setExecutionId(data.id);
    } catch (err) {
      console.error('Failed to create execution:', err);
    }
  };

  const handlePaymentComplete = async (signature: string) => {
    setShowPayment(false);

    try {
      const { data, error } = await supabase
        .from('agent_executions')
        .insert({
          agent_id: agentId,
          status: 'processing',
          cost_usdc: agent?.price_usdc || agent?.price || 0,
          payment_required: true,
          transaction_signature: signature,
          input_data: { query: inputQuery },
        })
        .select()
        .single();

      if (error) throw error;
      setExecutionId(data.id);
    } catch (err) {
      console.error('Failed to create execution:', err);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const getCodeExample = (language: CodeLanguage): string => {
    const agentPrice = agent?.price_usdc || agent?.price || 0;
    const agentCreator = agent?.creator || agent?.creator_id || '';

    switch (language) {
      case 'python':
        return `import requests
import json

# Your wallet (keep secure!)
keypair = Keypair.from_bytes(bytearray(YOUR_SECRET_KEY))
recipient = Pubkey.from_string("${agentCreator}")

# Step 1: Get payment requirements
response = requests.post(
    "https://api.lilyagent.cloud/api/agents/execute",
    json={
        "agent_id": "${agent?.id}",
        "input_data": {"query": "Your query here"},
    }
)

if response.status_code == 402:
    # Step 2: Create and send USDC transaction
    # ... transaction code here

    # Step 3: Retry with payment header
    payment_header = {
        "transaction_signature": signature,
        "amount": ${agentPrice},
    }

    response = requests.post(
        "https://api.lilyagent.cloud/api/agents/execute",
        json={"agent_id": "${agent?.id}", "input_data": {"query": "Your query here"}},
        headers={"X-Payment": json.dumps(payment_header)}
    )

    result = response.json()
    print(result)`;

      case 'typescript':
        return `import { Connection, Keypair, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const keypair = Keypair.fromSecretKey(YOUR_SECRET_KEY);
const recipient = new PublicKey("${agentCreator}");

// Step 1: Get payment requirements
const response = await fetch('https://api.lilyagent.cloud/api/agents/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id: "${agent?.id}",
    input_data: { query: "Your query here" }
  })
});

if (response.status === 402) {
  // Step 2: Create and send USDC transaction
  // ... transaction code here

  // Step 3: Retry with payment header
  const retryResponse = await fetch('https://api.lilyagent.cloud/api/agents/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment': JSON.stringify({
        transaction_signature: signature,
        amount: ${agentPrice}
      })
    },
    body: JSON.stringify({
      agent_id: "${agent?.id}",
      input_data: { query: "Your query here" }
    })
  });

  const result = await retryResponse.json();
  console.log(result);
}`;

      case 'javascript':
        return `const { Connection, Keypair, PublicKey } = require('@solana/web3.js');

const connection = new Connection('https://api.mainnet-beta.solana.com');
const keypair = Keypair.fromSecretKey(YOUR_SECRET_KEY);
const recipient = new PublicKey("${agentCreator}");

// Step 1: Get payment requirements
fetch('https://api.lilyagent.cloud/api/agents/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id: "${agent?.id}",
    input_data: { query: "Your query here" }
  })
})
.then(async response => {
  if (response.status === 402) {
    // Step 2: Create and send USDC transaction
    // ... transaction code here

    // Step 3: Retry with payment header
    return fetch('https://api.lilyagent.cloud/api/agents/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment': JSON.stringify({
          transaction_signature: signature,
          amount: ${agentPrice}
        })
      },
      body: JSON.stringify({
        agent_id: "${agent?.id}",
        input_data: { query: "Your query here" }
      })
    });
  }
  return response;
})
.then(response => response.json())
.then(result => console.log(result));`;

      case 'curl':
        return `# Step 1: Get payment requirements
curl -X POST https://api.lilyagent.cloud/api/agents/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "${agent?.id}",
    "input_data": {"query": "Your query here"}
  }'

# If you get 402 Payment Required:
# Step 2: Create and send USDC transaction
# ... (use solana CLI or SDK)

# Step 3: Retry with payment header
curl -X POST https://api.lilyagent.cloud/api/agents/execute \\
  -H "Content-Type: application/json" \\
  -H 'X-Payment: {"transaction_signature":"YOUR_TX_SIGNATURE","amount":${agentPrice}}' \\
  -d '{
    "agent_id": "${agent?.id}",
    "input_data": {"query": "Your query here"}
  }'`;

      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-6 flex items-center justify-center">
        <LilyFlowers />
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <div className="text-gray-600">Loading agent...</div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-6">
        <LilyFlowers />
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Agent Not Found</h2>
            <Link to="/dashboard/marketplace" className="text-primary-600 hover:text-primary-700 font-medium">
              ← Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 px-6 pb-12">
      <LilyFlowers />
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8 font-medium"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  {agent.name}
                </h1>
                <p className="text-gray-600 text-lg mb-4">{agent.description}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-50 text-primary-600">
                    {agent.category}
                  </span>
                  {agent.deployed && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-50 text-success-600">
                      Deployed
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 text-center md:min-w-[200px]">
                <div className="text-sm text-gray-600 mb-2">Price per execution</div>
                <div className="text-4xl font-bold text-gray-900 mb-1">${agent.price_usdc || agent.price}</div>
                <div className="text-sm text-gray-500">USDC</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-sm text-gray-600 mb-2">Total Executions</div>
                <div className="text-3xl font-bold text-gray-900">{agent.executions}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-sm text-gray-600 mb-2">Total Revenue</div>
                <div className="text-3xl font-bold text-success-600">${agent.revenue.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-sm text-gray-600 mb-2">Performance Score</div>
                <div className="text-3xl font-bold text-gray-900">{agent.score || agent.rating || 0}%</div>
              </div>
            </div>
          </div>
        </div>

        {executionId ? (
          <AgentExecutionTracker
            executionId={executionId}
            agentName={agent.name}
            onComplete={() => setExecutionId(null)}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Execute Agent</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Input Query</label>
              <textarea
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Enter your query..."
                className="w-full bg-white border border-gray-300 rounded-lg p-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none h-32"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleExecute(false)}
                className="bg-primary-500 text-white hover:bg-primary-600 font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Play size={18} />
                Pay Per Use (${agent.price_usdc || agent.price} USDC)
              </button>
              <button
                onClick={() => handleExecute(true)}
                className="bg-success-500 text-white hover:bg-success-600 font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Zap size={18} />
                Use x402 Session
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              x402 allows seamless recurring payments without approval for each execution
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">API Integration</h2>
          <p className="text-gray-600 mb-6">
            Integrate this agent programmatically. The x402 payment protocol handles micropayments automatically.
          </p>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setSelectedLanguage('python')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedLanguage === 'python'
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Python
                </button>
                <button
                  onClick={() => setSelectedLanguage('typescript')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedLanguage === 'typescript'
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  TypeScript
                </button>
                <button
                  onClick={() => setSelectedLanguage('javascript')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedLanguage === 'javascript'
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  JavaScript
                </button>
                <button
                  onClick={() => setSelectedLanguage('curl')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedLanguage === 'curl'
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  cURL
                </button>
              </div>
              <button
                onClick={() => copyCode(getCodeExample(selectedLanguage))}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Copy size={16} />
                Copy
              </button>
            </div>
            <pre className="bg-gray-900 border border-gray-800 rounded-lg p-6 overflow-x-auto">
              <code className="text-sm text-gray-100 font-mono leading-relaxed">
                {getCodeExample(selectedLanguage)}
              </code>
            </pre>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentFlow
          agentName={agent.name}
          costUsdc={agent.price_usdc || agent.price}
          onPaymentComplete={handlePaymentComplete}
          onCancel={() => setShowPayment(false)}
        />
      )}

      {showX402Payment && connected && (
        <X402PaymentModal
          serviceId={agentId!}
          serviceType="agent"
          serviceName={agent.name}
          amount={agent.price_usdc || agent.price}
          onPaymentComplete={handleX402PaymentComplete}
          onCancel={() => setShowX402Payment(false)}
        />
      )}
    </div>
  );
}
