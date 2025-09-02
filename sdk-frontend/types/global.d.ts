declare module '@saros-finance/sdk' {
  export interface SarosSDK {
    SarosFarmService: any;
    SarosStakeServices: any;
    getSwapAmountSaros: (...args: any[]) => any;
    swapSaros: (...args: any[]) => any;
    createPool: (...args: any[]) => any;
    getPoolInfo: (...args: any[]) => any;
    depositAllTokenTypes: (...args: any[]) => any;
    withdrawAllTokenTypes: (...args: any[]) => any;
    convertBalanceToWei: (...args: any[]) => any;
    getTokenMintInfo: (...args: any[]) => any;
    getTokenAccountInfo: (...args: any[]) => any;
    getInfoTokenByMint: (...args: any[]) => any;
  }
  
  const sarosSdk: SarosSDK;
  export default sarosSdk;
}

declare module 'bn.js' {
  class BN {
    constructor(value: string | number | BN, base?: number);
    toString(base?: number): string;
    toNumber(): number;
    add(other: BN): BN;
    sub(other: BN): BN;
    mul(other: BN): BN;
    div(other: BN): BN;
    mod(other: BN): BN;
    pow(other: BN): BN;
    eq(other: BN): boolean;
    lt(other: BN): boolean;
    lte(other: BN): boolean;
    gt(other: BN): boolean;
    gte(other: BN): boolean;
    isZero(): boolean;
    isNeg(): boolean;
    abs(): BN;
    neg(): BN;
    and(other: BN): BN;
    or(other: BN): BN;
    xor(other: BN): BN;
    not(): BN;
    shln(bits: number): BN;
    shrn(bits: number): BN;
    bincn(bits: number): BN;
    bitLength(): number;
    byteLength(): number;
    toArray(endian?: 'le' | 'be', length?: number): number[];
    toBuffer(endian?: 'le' | 'be', length?: number): Buffer;
    toJSON(): string;
    static isBN(value: any): value is BN;
    static min(a: BN, b: BN): BN;
    static max(a: BN, b: BN): BN;
  }
  export = BN;
}
