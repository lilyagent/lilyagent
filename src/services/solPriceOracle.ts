import { Connection, PublicKey } from '@solana/web3.js';

export interface PriceData {
  solUsd: number;
  timestamp: number;
  source: string;
}

export interface ConversionResult {
  usdAmount: number;
  solAmount: number;
  rate: number;
  timestamp: number;
}

const PYTH_SOL_USD_FEED = 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG';
const CACHE_DURATION = 30000; // 30 seconds

class SolPriceOracle {
  private cachedPrice: PriceData | null = null;
  private connection: Connection;
  private fallbackPrices: string[] = [
    'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    'https://api.coinbase.com/v2/exchange-rates?currency=SOL'
  ];

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async getSolPrice(): Promise<number> {
    // Check cache first
    if (this.cachedPrice && Date.now() - this.cachedPrice.timestamp < CACHE_DURATION) {
      console.log('Using cached SOL price:', this.cachedPrice.solUsd);
      return this.cachedPrice.solUsd;
    }

    try {
      // Try Pyth price feed first (on-chain oracle)
      const price = await this.getPythPrice();
      if (price) {
        this.cachedPrice = {
          solUsd: price,
          timestamp: Date.now(),
          source: 'pyth'
        };
        return price;
      }
    } catch (error) {
      console.warn('Pyth price feed failed, trying fallbacks:', error);
    }

    // Try CoinGecko
    try {
      const price = await this.getCoinGeckoPrice();
      if (price) {
        this.cachedPrice = {
          solUsd: price,
          timestamp: Date.now(),
          source: 'coingecko'
        };
        return price;
      }
    } catch (error) {
      console.warn('CoinGecko price failed:', error);
    }

    // Use cached price if available, even if expired
    if (this.cachedPrice) {
      console.warn('Using expired cached price');
      return this.cachedPrice.solUsd;
    }

    // Fallback to reasonable estimate
    console.warn('All price feeds failed, using fallback estimate');
    return 150; // Conservative estimate
  }

  private async getPythPrice(): Promise<number | null> {
    try {
      const pythPriceAccount = new PublicKey(PYTH_SOL_USD_FEED);
      const accountInfo = await this.connection.getAccountInfo(pythPriceAccount);

      if (!accountInfo) return null;

      // Parse Pyth price account data
      const data = accountInfo.data;

      // Pyth price format: 8 bytes for price, 4 bytes for confidence, 4 bytes for exponent
      const priceBuffer = data.slice(208, 216);
      const exponentBuffer = data.slice(220, 224);

      const price = priceBuffer.readBigInt64LE(0);
      const exponent = exponentBuffer.readInt32LE(0);

      const actualPrice = Number(price) * Math.pow(10, exponent);

      if (actualPrice > 0 && actualPrice < 10000) {
        return actualPrice;
      }

      return null;
    } catch (error) {
      console.error('Error fetching Pyth price:', error);
      return null;
    }
  }

  private async getCoinGeckoPrice(): Promise<number | null> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();

      if (data.solana && data.solana.usd) {
        return data.solana.usd;
      }

      return null;
    } catch (error) {
      console.error('Error fetching CoinGecko price:', error);
      return null;
    }
  }

  async usdToSol(usdAmount: number): Promise<ConversionResult> {
    const rate = await this.getSolPrice();
    const solAmount = usdAmount / rate;

    return {
      usdAmount,
      solAmount,
      rate,
      timestamp: Date.now()
    };
  }

  async solToUsd(solAmount: number): Promise<ConversionResult> {
    const rate = await this.getSolPrice();
    const usdAmount = solAmount * rate;

    return {
      usdAmount,
      solAmount,
      rate,
      timestamp: Date.now()
    };
  }

  clearCache(): void {
    this.cachedPrice = null;
  }

  getCachedPrice(): PriceData | null {
    return this.cachedPrice;
  }
}

export const createSolPriceOracle = (connection: Connection): SolPriceOracle => {
  return new SolPriceOracle(connection);
};

let globalOracle: SolPriceOracle | null = null;

export const getSolPriceOracle = (connection: Connection): SolPriceOracle => {
  if (!globalOracle) {
    globalOracle = new SolPriceOracle(connection);
  }
  return globalOracle;
};

export default SolPriceOracle;
