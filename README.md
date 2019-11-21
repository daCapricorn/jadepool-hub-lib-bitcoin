# Bitcoin Transaction Builder for NodeJS

[![License](https://img.shields.io/npm/l/@jadepool/lib-bitcoin.svg)](LICENSE)

One of Jadepool support library - Bitcoin transaction builder.

## How to install

```bash
npm install @jadepool/lib-bitcoin
```

## How to use

```js
  const lib = require('@jadepool/lib-bitcoin')
  const pubKey = 'ECDSA PUBLIC KEY'
  // genAddressByPubKey
  const address = lib.genAddressByPubKey(pubKey, true) // true for testnet
  // validateAddress
  const isValid = lib.validateAddress(address, true)
  // composeUnsignedTransferTx
  const transferInfo = {
    inputs: [
      { // utxo info
        address: 'fromAddress',
        scriptPubKey: 'from utxo info.',
        txid: 'from utxo info.',
        vout: 0 // from utxo info
      }
    ],
    outputs: [
      {
        address: 'toAddress',
        satoshi: 'shatoshi no decimal'
      }
    ],
    // optional for Omni(like USDT)
    omni: {
      from: 'fromAddress',
      to: 'toAddress',
      value: 'amount no decimal',
      // optional
      contract: 'omni contract', // optional, default is 6f6d6e69
      propertyId: 31, // optional, default is 31(USDT in mainnet)
    }
  }
  // return unsignedInputs
  const { inputs/* [{ vin, address, unsignedHash }] */, rawtx } = lib.composeUnsignedTransferTx(transferInfo, true)
  // buildTransferTx
  const sigs = [
    {
      vin: 0,
      signature: 'sig hex',
      pubKey: 'public key'
    }
  ]
  const { txid, rawtx } = lib.buildTransferTx(transferInfo, sigs, true)
```
