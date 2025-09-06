import { liquidityBookServices, POOL_PARAMS } from "../index";

/**
 * Pool & Metadata Management
 * 
 * This module provides functions for discovering pools and fetching live data.
 * Essential for dashboards, bots, and UIs that need to display pool information.
 */

/**
 * Get the DEX name
 * 
 * @returns The name of the DEX (e.g., "Saros Dex")
 */
export const getDexName = () => {
  try {
    return liquidityBookServices.getDexName();
  } catch {
    return "";
  }
};

/**
 * Get the DEX program ID
 * 
 * @returns The program ID reference for the DEX
 */
export const getDexProgramId = () => {
  try {
    return liquidityBookServices.getDexProgramId();
  } catch {
    return "";
  }
};

/**
 * Fetch all available pool addresses
 * 
 * @returns Array of pool addresses
 */
export const getPoolAddresses = async () => {
  try {
    return await liquidityBookServices.fetchPoolAddresses();
  } catch {
    return [] as string[];
  }
};

/**
 * Fetch detailed metadata for a specific pool
 * 
 * @param poolAddress - Optional pool address, defaults to POOL_PARAMS.address
 * @returns Pool metadata object
 */
export const fetchPoolMetadata = async (poolAddress?: string) => {
  try {
    const address = poolAddress || POOL_PARAMS.address;
    return await liquidityBookServices.fetchPoolMetadata(address);
  } catch {
    return {} as Record<string, unknown>;
  }
};

/**
 * Listen for new pool addresses being created
 * 
 * This function subscribes to new pool creation events.
 * Useful for real-time monitoring of pool creation.
 * 
 * @param onNewPool - Callback function called when a new pool is created
 * @returns Promise that resolves when listening starts
 */
export const onListenNewPoolAddress = async (onNewPool?: (poolAddress: string) => void) => {
  const postTx = async (poolAddress: string) => {
    console.log("[DLMM] New pool:", poolAddress);
    if (onNewPool) {
      onNewPool(poolAddress);
    }
  };
  await liquidityBookServices.listenNewPoolAddress(postTx);
  return "Listening for new pools...";
};
