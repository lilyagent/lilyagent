export interface Agent {
  id: string;
  name: string;
  description: string;
  category: 'Research' | 'Code' | 'Finance' | 'Writing' | 'Data' | 'Other';
  price: number;
  price_usdc?: number;
  rating: number;
  score?: number;
  executions: number;
  revenue: number;
  creator_id: string;
  creator?: string;
  is_active: boolean;
  deployed?: boolean;
  created_at: string;
}

export interface API {
  id: string;
  name: string;
  description: string;
  category?: string;
  provider: string;
  wallet_address?: string;
  price: number;
  rating: number;
  endpoint: string;
  base_url?: string;
  documentation_url?: string;
  version?: string;
  is_active?: boolean;
  is_verified?: boolean;
  uptime_percentage?: number;
  avg_response_time?: number;
  total_calls?: number;
  total_revenue?: number;
  total_reviews?: number;
  creator_id: string;
  created_at: string;
  updated_at?: string;
}

export interface APIPricingModel {
  id: string;
  api_id: string;
  model_type: 'free' | 'freemium' | 'pay_per_call' | 'subscription';
  price_per_call: number;
  free_tier_limit: number;
  monthly_subscription_price: number;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  rate_limit_per_month: number;
  is_active: boolean;
  created_at: string;
}

export interface APIEndpoint {
  id: string;
  api_id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  request_schema: any;
  response_schema: any;
  example_request: any;
  example_response: any;
  requires_auth: boolean;
  is_active: boolean;
  created_at: string;
}

export interface APIKey {
  id: string;
  api_id: string;
  user_wallet_address: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  permissions: any;
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface APIReview {
  id: string;
  api_id: string;
  reviewer_wallet_address: string;
  rating: number;
  review_text?: string;
  reliability_score?: number;
  documentation_score?: number;
  performance_score?: number;
  is_verified_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalRevenue: number;
  activeAgents: number;
  totalExecutions: number;
  marketplaceAgents: number;
  activeAPIs?: number;
  totalAPICalls?: number;
}

export interface X402Session {
  id: string;
  wallet_address: string;
  session_token: string;
  authorized_amount: number;
  spent_amount: number;
  remaining_amount: number;
  resource_pattern: string;
  status: 'active' | 'expired' | 'revoked' | 'depleted';
  expires_at: string;
  auto_renew: boolean;
  renewal_amount: number;
  last_used_at: string | null;
  created_at: string;
}

export interface X402Credit {
  id: string;
  wallet_address: string;
  service_id: string | null;
  service_type: 'agent' | 'api' | 'web_service';
  credit_balance: number;
  total_purchased: number;
  total_spent: number;
  last_topup_tx: string | null;
  last_topup_amount: number | null;
  last_topup_at: string | null;
  auto_topup_enabled: boolean;
  auto_topup_threshold: number;
  auto_topup_amount: number;
  created_at: string;
  updated_at: string;
}

export interface X402Transaction {
  id: string;
  session_id: string | null;
  wallet_address: string;
  resource_url: string;
  resource_type: 'agent_execution' | 'api_call' | 'data_access';
  http_method: string;
  amount_charged: number;
  x402_header: string | null;
  payment_proof: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  response_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
}

export interface X402ServiceConfig {
  id: string;
  service_id: string;
  service_type: 'agent' | 'api' | 'web_service';
  service_name: string;
  owner_wallet: string;
  accepts_x402: boolean;
  pricing_model: 'per_request' | 'per_minute' | 'per_kb' | 'per_token';
  base_price: number;
  min_payment: number;
  max_payment: number | null;
  currency: 'USDC' | 'SOL';
  requires_preauth: boolean;
  max_session_amount: number | null;
  allowed_origins: string[];
  webhook_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface X402Authorization {
  id: string;
  wallet_address: string;
  service_id: string;
  service_type: 'agent' | 'api' | 'web_service';
  authorization_token: string;
  spending_limit_per_request: number | null;
  spending_limit_per_day: number | null;
  spending_limit_per_month: number | null;
  total_authorized: number;
  total_spent: number;
  status: 'active' | 'paused' | 'revoked' | 'expired';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}
