import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, Zap, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ExecutionTrackerProps {
  executionId: string;
  agentName: string;
  onComplete?: (result: any) => void;
}

type ExecutionStatus = 'pending' | 'payment_required' | 'processing' | 'completed' | 'failed' | 'rejected';

interface ExecutionData {
  status: ExecutionStatus;
  cost_usdc: number;
  transaction_signature?: string;
  output_data?: any;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export default function AgentExecutionTracker({ executionId, agentName, onComplete }: ExecutionTrackerProps) {
  const [execution, setExecution] = useState<ExecutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    fetchExecution();
    const subscription = supabase
      .channel(`execution_${executionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_executions',
        filter: `id=eq.${executionId}`
      }, (payload) => {
        setExecution(payload.new as ExecutionData);
        if (payload.new.status === 'completed' && onComplete) {
          onComplete(payload.new.output_data);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [executionId]);

  useEffect(() => {
    if (!execution || execution.status === 'completed' || execution.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(execution.started_at).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [execution]);

  const fetchExecution = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (error) throw error;
      setExecution(data);
    } catch (err) {
      console.error('Failed to fetch execution:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = (status: ExecutionStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-gray-400',
          bgColor: 'bg-gray-900',
          label: 'Pending',
          description: 'Waiting to start...'
        };
      case 'payment_required':
        return {
          icon: Clock,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/20',
          label: 'Payment Required',
          description: 'Awaiting payment confirmation'
        };
      case 'processing':
        return {
          icon: Zap,
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/20',
          label: 'Processing',
          description: 'AI agent is working on your request'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-900/20',
          label: 'Completed',
          description: 'Execution finished successfully'
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-900/20',
          label: 'Failed',
          description: execution?.error_message || 'Execution failed'
        };
      case 'rejected':
        return {
          icon: AlertCircle,
          color: 'text-orange-400',
          bgColor: 'bg-orange-900/20',
          label: 'Rejected',
          description: 'Payment verification failed'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-400',
          bgColor: 'bg-gray-900',
          label: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="text-center p-8">
        <AlertCircle size={32} className="mx-auto mb-2 text-red-400" />
        <p className="text-gray-400">Execution not found</p>
      </div>
    );
  }

  const statusConfig = getStatusConfig(execution.status);
  const Icon = statusConfig.icon;

  return (
    <div className="bg-gray-950/95 backdrop-blur-xl border border-gray-800/60 rounded-lg p-6 shadow-xl shadow-black/50">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold mb-1">{agentName}</h3>
          <p className="text-sm text-gray-400">Execution ID: {executionId.slice(0, 8)}...</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bgColor}`}>
          <Icon size={16} className={statusConfig.color} />
          <span className={`text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Status</p>
          <p className="text-sm">{statusConfig.description}</p>
        </div>

        {(execution.status === 'processing' || execution.status === 'payment_required') && (
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Elapsed Time</p>
              <p className="text-sm font-mono font-bold">{formatTime(elapsedTime)}</p>
            </div>
            {execution.status === 'processing' && (
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
              </div>
            )}
          </div>
        )}

        {execution.cost_usdc > 0 && (
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Cost</p>
              <p className="text-sm font-mono">
                ${execution.cost_usdc.toFixed(4)} USDC
              </p>
            </div>
          </div>
        )}

        {execution.transaction_signature && (
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">Transaction</p>
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-gray-500">
                {execution.transaction_signature.slice(0, 16)}...
              </p>
              <a
                href={`https://solscan.io/tx/${execution.transaction_signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {execution.status === 'processing' && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Loader2 size={20} className="text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-400 mb-1">Agent Working</p>
                <p className="text-xs text-gray-400">
                  Your AI agent is processing your request. This may take a few moments.
                </p>
              </div>
            </div>
          </div>
        )}

        {execution.status === 'completed' && execution.output_data && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-400 mb-2">Result Ready</p>
                <div className="bg-gray-950 rounded p-3 text-xs font-mono text-gray-300 overflow-auto max-h-40">
                  {JSON.stringify(execution.output_data, null, 2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {execution.status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400 mb-1">Execution Failed</p>
                <p className="text-xs text-gray-400">
                  {execution.error_message || 'An error occurred during execution'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {execution.completed_at && (
        <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500">
          Completed at {new Date(execution.completed_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
