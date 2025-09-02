import { PublicKey } from '@solana/web3.js';
import {
  connection,
  payerAccount,
  SAROS_FARM_ADDRESS,
  farmList,
  SarosFarmService,
} from './common';

export const onClaimReward = async () => {
  const poolRewardAddress = farmList.rewards[0].poolRewardAddress;
  const mintAddress = farmList.rewards[0].address;

  const hash = await SarosFarmService.claimReward(
    connection,
    payerAccount,
    new PublicKey(poolRewardAddress),
    new PublicKey(SAROS_FARM_ADDRESS),
    new PublicKey(mintAddress)
  );
  return `Your transaction hash: ${hash}`;
};

