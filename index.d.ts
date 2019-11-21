// Type definitions for lib-bitcoin 0.1.0
// Definitions by: Tang Bo Hao <https://github.com/btspoony>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/**
 * Generate address by a ECDSA publicKey(hex-encoding)
 * @param pubKey hex格式的ECDSA公钥
 */
export function genAddressByPubKey(pubKey: string, isTestnet?: boolean): string;

/**
 * validate a address is eth format or not
 * @param address eth address
 */
export function validateAddress(address: string, isTestnet?: boolean): boolean;

type InputData = {
  scriptPubKey: string
  address: string
  txid: string
  vout: number
}

type OutputData = {
  address: string
  /** shatoshi no decimal */
  satoshi: string
}

type OmniTransferInfo = {
  /** tx from address */
  from: string
  /** tx to address */
  to: string
  /** tx value amount no deciaml */
  value: string
  /** omni property id USDT should be 31 */
  propertyId?: number
  /** omni contract string */
  contract?: string // default: 6f6d6e69
}

type TransferInfo = {
  inputs: InputData[]
  outputs: OutputData[]
  omni?: OmniTransferInfo
}

type UnsignedInput = {
  vin: number
  address: string
  unsignedHash: string
}

type UnsignedResult = {
  inputs: UnsignedInput[]
  rawtx: string
}

/**
 * return unsigned hash of tx
 * @param info transfer info
 * @returns unsigned tx hash
 */
export function composeUnsignedTransferTx(info: TransferInfo, isTestnet?: boolean): UnsignedResult;

type InputSignature = {
  vin: number
  signature: string
  pubKey: string
}

type TransactionResult = {
  /** hash of the transaction */
  txid: string
  /** raw of the transaction */
  rawtx: string
}

/**
 * return txid and rawtx to send
 * @param info transfer info
 * @param signature 64位的签名
 * @param pubKeyOrRecovery hex格式的ECDSA公钥 或者 还原 id
 * @returns tx result
 */
export function buildTransferTx(info: TransferInfo, sigs: InputSignature[], isTestnet?: boolean): TransactionResult;
