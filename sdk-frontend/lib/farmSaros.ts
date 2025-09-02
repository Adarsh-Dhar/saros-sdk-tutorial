import { SarosFarmService } from './common';

export const getListFarmSaros = async () => {
  try {
    const response = await SarosFarmService.getListPool({ page: 1, size: 2 });
    return response;
  } catch (err) {
    return [] as unknown[];
  }
};

