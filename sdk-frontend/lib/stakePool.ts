import { PublicKey } from '@solana/web3.js';
import { BN } from './common';
import {
  connection,
  payerAccount,
  farmList,
  SAROS_FARM_ADDRESS,
  SarosFarmService,
} from './common';

export const onStakePool = async () => {
  const hash = await SarosFarmService.stakePool(
    connection,
    payerAccount,
    new PublicKey(farmList.poolAddress),
    new BN(100),
    SAROS_FARM_ADDRESS,
    farmList.rewards,
    new PublicKey(farmList.lpAddress)
  );
  return `Your transaction hash: ${hash}`;
};

