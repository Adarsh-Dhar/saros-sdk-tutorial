import { SarosStakeServices } from './common';

export const getListStakeSaros = async () => {
  try {
    const response = await SarosStakeServices.getListPool({ page: 1, size: 2 });
    return response;
  } catch (err) {
    return [] as unknown[];
  }
};

