import { supabase } from '../lib/supabase';

export interface APIKey {
  id: string;
  api_id: string;
  user_wallet_address: string;
  key_prefix: string;
  name: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  rate_limit_per_hour: number;
  total_requests: number;
  created_at: string;
}

export interface APIKeyWithSecret {
  id: string;
  key: string;
  api_id: string;
  user_wallet_address: string;
  key_prefix: string;
  name: string | null;
  expires_at: string | null;
  rate_limit_per_hour: number;
}

export interface CreateAPIKeyParams {
  api_id: string;
  user_wallet_address: string;
  name?: string;
  expiresInDays?: number;
  rateLimitPerHour?: number;
}

export interface APIKeyUsage {
  id: string;
  endpoint: string;
  http_method: string;
  status_code: number;
  response_time_ms: number;
  created_at: string;
}

class APIKeyService {
  private generateSecureKey(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 32;
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += characters.charAt(randomValues[i] % characters.length);
    }

    return result;
  }

  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  async createAPIKey(params: CreateAPIKeyParams): Promise<APIKeyWithSecret | { error: string }> {
    try {
      console.log('[APIKeyService] Creating API key for:', params);

      // Generate secure random key
      const randomPart = this.generateSecureKey();
      const fullKey = `lily_${randomPart}`;
      const keyPrefix = fullKey.substring(0, 12) + '...';

      // Hash the key for storage
      const keyHash = await this.hashKey(fullKey);

      // Calculate expiration if needed
      const expiresAt = params.expiresInDays
        ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Insert into database
      const { data, error} = await supabase
        .from('api_keys')
        .insert({
          api_id: params.api_id,
          user_wallet_address: params.user_wallet_address,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          name: params.name || 'Production Key',
          expires_at: expiresAt,
          is_active: true,
          rate_limit_per_hour: params.rateLimitPerHour || 1000,
          total_requests: 0
        })
        .select()
        .single();

      if (error) {
        console.error('[APIKeyService] Database error:', error);
        return { error: error.message };
      }

      console.log('[APIKeyService] API key created successfully:', data.id);

      // Return the full key only this one time
      return {
        id: data.id,
        key: fullKey,
        api_id: data.api_id,
        user_wallet_address: data.user_wallet_address,
        key_prefix: keyPrefix,
        name: data.name,
        expires_at: data.expires_at,
        rate_limit_per_hour: data.rate_limit_per_hour
      };
    } catch (error: any) {
      console.error('[APIKeyService] Error creating API key:', error);
      return { error: error.message || 'Failed to create API key' };
    }
  }

  async listUserAPIKeys(userWalletAddress: string, apiId?: string): Promise<APIKey[]> {
    try {
      let query = supabase
        .from('api_keys')
        .select('*')
        .eq('user_wallet_address', userWalletAddress)
        .order('created_at', { ascending: false });

      if (apiId) {
        query = query.eq('api_id', apiId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[APIKeyService] Error fetching keys:', error);
        return [];
      }

      return data as APIKey[];
    } catch (error) {
      console.error('[APIKeyService] Error listing API keys:', error);
      return [];
    }
  }

  async getAPIKeyDetails(keyId: string): Promise<APIKey | null> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .maybeSingle();

      if (error || !data) {
        console.error('[APIKeyService] Error fetching key details:', error);
        return null;
      }

      return data as APIKey;
    } catch (error) {
      console.error('[APIKeyService] Error getting key details:', error);
      return null;
    }
  }

  async revokeAPIKey(keyId: string, userWalletAddress: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId)
        .eq('user_wallet_address', userWalletAddress);

      if (error) {
        console.error('[APIKeyService] Error revoking key:', error);
        return false;
      }

      console.log('[APIKeyService] API key revoked:', keyId);
      return true;
    } catch (error) {
      console.error('[APIKeyService] Error revoking API key:', error);
      return false;
    }
  }

  async deleteAPIKey(keyId: string, userWalletAddress: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_wallet_address', userWalletAddress);

      if (error) {
        console.error('[APIKeyService] Error deleting key:', error);
        return false;
      }

      console.log('[APIKeyService] API key deleted:', keyId);
      return true;
    } catch (error) {
      console.error('[APIKeyService] Error deleting API key:', error);
      return false;
    }
  }

  async validateAPIKey(key: string): Promise<{ valid: boolean; keyData?: APIKey; error?: string }> {
    try {
      const keyHash = await this.hashKey(key);

      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        return { valid: false, error: error.message };
      }

      if (!data) {
        return { valid: false, error: 'Invalid API key' };
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { valid: false, error: 'API key has expired' };
      }

      // Update last_used_at
      await supabase
        .from('api_keys')
        .update({
          last_used_at: new Date().toISOString(),
          total_requests: data.total_requests + 1
        })
        .eq('id', data.id);

      return { valid: true, keyData: data as APIKey };
    } catch (error: any) {
      console.error('[APIKeyService] Error validating key:', error);
      return { valid: false, error: error.message };
    }
  }

  async logKeyUsage(
    apiKeyId: string,
    endpoint: string,
    httpMethod: string,
    statusCode: number,
    responseTimeMs: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase
        .from('api_key_usage')
        .insert({
          api_key_id: apiKeyId,
          endpoint,
          http_method: httpMethod,
          status_code: statusCode,
          response_time_ms: responseTimeMs,
          error_message: errorMessage
        });
    } catch (error) {
      console.error('[APIKeyService] Error logging usage:', error);
    }
  }

  async getKeyUsageStats(keyId: string, days: number = 7): Promise<APIKeyUsage[]> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('api_key_usage')
        .select('*')
        .eq('api_key_id', keyId)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.error('[APIKeyService] Error fetching usage stats:', error);
        return [];
      }

      return data as APIKeyUsage[];
    } catch (error) {
      console.error('[APIKeyService] Error getting usage stats:', error);
      return [];
    }
  }

  async checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      // Get key details
      const { data: keyData } = await supabase
        .from('api_keys')
        .select('rate_limit_per_hour')
        .eq('id', apiKeyId)
        .single();

      if (!keyData) {
        return { allowed: false, remaining: 0 };
      }

      // Count requests in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { count } = await supabase
        .from('api_key_usage')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', apiKeyId)
        .gte('created_at', oneHourAgo);

      const requestCount = count || 0;
      const allowed = requestCount < keyData.rate_limit_per_hour;
      const remaining = Math.max(0, keyData.rate_limit_per_hour - requestCount);

      return { allowed, remaining };
    } catch (error) {
      console.error('[APIKeyService] Error checking rate limit:', error);
      return { allowed: false, remaining: 0 };
    }
  }
}

export const apiKeyService = new APIKeyService();
export default APIKeyService;
