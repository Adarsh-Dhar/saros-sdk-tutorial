import {
  BIN_STEP_CONFIGS,
  LiquidityBookServices,
  MODE,
} from "@saros-finance/dlmm-sdk";

// Core configuration and services
export const liquidityBookServices = new LiquidityBookServices({
  mode: MODE.DEVNET,
});

// Example tokens and pool (DEVNET)
// DEVNET WSOL
export const USDC_TOKEN = {
  id: "wsol",
  mintAddress: "So11111111111111111111111111111111111111112",
  symbol: "WSOL",
  name: "WSOL",
  decimals: 9,
  addressSPL: "",
};

// DEVNET Saros
export const C98_TOKEN = {
  id: "saros",
  mintAddress: "mntCAkd76nKSVTYxwu8qwQnhPcEE9JyEbgW6eEpwr1N",
  symbol: "DEXV3-SAROS",
  name: "Dex V3 Saros",
  decimals: 6,
  addressSPL: "",
};

export const POOL_PARAMS = {
  address: "C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB",
  baseToken: C98_TOKEN,
  quoteToken: USDC_TOKEN,
  slippage: 0.5,
  hook: "",
};

// Export BIN_STEP_CONFIGS for use in other modules
export { BIN_STEP_CONFIGS };

// Export organized functionality from modules
export { onSwap } from "./swap";
export { 
  getDexName,
  getDexProgramId,
  getPoolAddresses,
  fetchPoolMetadata,
  onListenNewPoolAddress 
} from "./pool-metadata";
export { onCreatePool } from "./pool";
export { 
  onAddLiquidity,
  onRemoveLiquidity,
  convertBalanceToWei 
} from "./liquidity";

// Legacy API for backward compatibility
import { onSwap } from "./swap";
import { 
  getDexName, 
  getDexProgramId, 
  getPoolAddresses, 
  fetchPoolMetadata, 
  onListenNewPoolAddress 
} from "./pool-metadata";
import { onCreatePool } from "./pool";
import { 
  onAddLiquidity, 
  onRemoveLiquidity 
} from "./liquidity";

const api = {
  onSwap,
  getDexName,
  getDexProgramId,
  getPoolAddresses,
  fetchPoolMetadata,
  onListenNewPoolAddress,
  onCreatePool,
  onAddLiquidity,
  onRemoveLiquidity,
};

export default api;


