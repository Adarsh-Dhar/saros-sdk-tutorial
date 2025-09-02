declare module '@saros-finance/sdk' {
  export interface SarosSDK {
    SarosFarmService: any;
    SarosStakeServices: any;
  }
  
  export function getSwapAmountSaros(...args: any[]): any;
  export function swapSaros(...args: any[]): any;
  export function createPool(...args: any[]): any;
  export function getPoolInfo(...args: any[]): any;
  export function depositAllTokenTypes(...args: any[]): any;
  export function withdrawAllTokenTypes(...args: any[]): any;
  export function convertBalanceToWei(...args: any[]): any;
  export function getTokenMintInfo(...args: any[]): any;
  export function getTokenAccountInfo(...args: any[]): any;
  export function getInfoTokenByMint(...args: any[]): any;
  
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
