import { PublicKey } from '@solana/web3.js';
import { BN } from './common';
import {
  connection,
  payerAccount,
  farmList,
  SAROS_FARM_ADDRESS,
  SarosFarmService,
} from './common';

export const onUnStakePool = async () => {
  const hash = await SarosFarmService.unStakePool(
    connection,
    payerAccount,
    new PublicKey(farmList.poolAddress),
    new PublicKey(farmList.lpAddress),
    new BN(100),
    SAROS_FARM_ADDRESS,
    farmList.rewards,
    false // Set to true if want to unstake full balance
  );
  return `Your transaction hash: ${hash}`;
};

