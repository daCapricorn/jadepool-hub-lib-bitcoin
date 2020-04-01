const bitcoin = require('bitcoinjs-lib')
const bech32 = require('bech32')
const btcAddress = require('bitcoin-address')
const secp256k1 = require('tiny-secp256k1')

/**
 * @param {any} value 
 * @param {string} message
 */
function assert (value, message) {
  if (value === undefined || value === null || value === false) {
    throw new Error(message)
  }
  return value
}

/**
 * @param {any} value
 * @param {'undefined'|'boolean'|'string'|'number'|'object'|'function'} typeStr
 * @param {string} message
 */
function ensureType (value, typeStr, message) {
  if (typeof value !== typeStr) {
    throw new Error(message)
  }
  return value
}

function getNetwork (isTestnet) {
  return isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
}

/**
 * build a transaction
 * @param {object} info
 * @param {object[]} info.inputs
 * @param {string} info.inputs.scriptPubKey
 * @param {string} info.inputs.address
 * @param {string} info.inputs.txid
 * @param {number} info.inputs.vout
 * @param {object[]} info.outputs
 * @param {string} info.outputs.address
 * @param {string} info.outputs.satoshi
 * @param {object} [info.omni=undefined]
 * @param {string} info.omni.from
 * @param {string} info.omni.to
 * @param {string} info.omni.value
 * @param {string} [info.omni.contract='6f6d6e69']
 * @param {number} [info.omni.propertyId=31]
 */
function buildTransaction (info, isTestnet = false) {
  assert(info && info.inputs && info.outputs, 'inputs and outputs should be existed.')
  // ensure inputs and outputs
  info.inputs.forEach((input, i) => {
    assert(lib.validateAddress(input.address, isTestnet), `input[${i}] address invalid.`)
    ensureType(input.scriptPubKey, 'string', `input[${i}] scriptPubKey should be string`)
    ensureType(input.txid, 'string', `input[${i}] txid should be string`)
    ensureType(input.vout, 'number', `input[${i}] vout should be number`)
  })
  info.outputs.forEach((output, i) => {
    assert(lib.validateAddress(output.address, isTestnet), `input[${i}] address invalid.`)
    ensureType(parseInt(output.satoshi), 'number', `input[${i}] satoshi should be a string of number.`)
  })
  if (typeof info.omni === 'object') {
    assert(lib.validateAddress(info.omni.from, isTestnet), 'omni.from invalid')
    assert(lib.validateAddress(info.omni.to, isTestnet), 'omni.to invalid')
    ensureType(info.omni.value, 'number', `omni.value should be a string of number.`)
  }

  // build transaction
  const txb = new bitcoin.TransactionBuilder(getNetwork(isTestnet))
  info.inputs.forEach(e => txb.addInput(e.txid, e.vout))
  info.outputs.forEach(e => txb.addOutput(e.address, parseInt(e.satoshi)))
  // 添加额外 omni 参数
  if (info.omni) {
    // 构建omni合约代码
    const toPaddedHexString = (num, len) => {
      let str = num.toString(16)
      return '0'.repeat(len - str.length) + str
    }
    const simpleSendData = [
      info.omni.contract || '6f6d6e69', // omni contract
      toPaddedHexString(info.omni.propertyId || 31, 16), // version 0000 + 31 for Tether
      toPaddedHexString(info.omni.value, 16) // amount in HEX
    ].join('')
    const data = [ Buffer.from(simpleSendData, 'hex') ] // NEW** data must be an Array(Buffer)
    // 构建用于添加的omni output数据
    const omniOutput = bitcoin.payments.embed({ data }).output // NEW** Payments API
    txb.addOutput(omniOutput, 0)
  }
  let rawtx = txb.buildIncomplete().toHex()
  return bitcoin.Transaction.fromHex(rawtx)
}

const lib = {
  /**
   * @param {string} pubKey
   */
  genAddressByPubKey (pubKey, isTestnet = false) {
    const key = Buffer.from(pubKey, 'hex')
    const network = getNetwork(isTestnet)
    const eccpair = bitcoin.ECPair.fromPublicKey(key, { network })
    return bitcoin.payments.p2pkh({ pubkey: eccpair.publicKey, network }).address
  },
  /**
   * @param {string} address
   */
  validateAddress (address, isTestnet = false) {
    let isValid = btcAddress.validate(address, isTestnet ? 'testnet' : 'prod')
    // check bech32 address
    if (!isValid) {
      var result
      try {
        result = bech32.decode(address)
      } catch (err) {
        return false
      }
      if (result) {
        if (result.prefix !== 'tb' && result.prefix !== 'bc') return false
        if (result.words.length !== 53 && result.words.length !== 33) return false
        isValid = true
      }
    }
    return isValid
  },
  /**
   * @param {object} transferInfo
   * @param {object[]} transferInfo.inputs
   * @param {string} transferInfo.inputs.scriptPubKey
   * @param {boolean} isTestnet
   */
  composeUnsignedTransferTx (transferInfo, isTestnet = false) {
    const tx = buildTransaction(transferInfo, isTestnet)
    const hashType = bitcoin.Transaction.SIGHASH_ALL
    const inputs = transferInfo.inputs.map((input, vin) => {
      // 设置未签名hash
      const script = Buffer.from(input.scriptPubKey, 'hex')
      const signatureHash = tx.hashForSignature(vin, script, hashType)
      return {
        vin,
        address: input.address,
        unsignedHash: signatureHash.toString('hex')
      }
    })
    return {
      inputs,
      rawtx: tx.toHex()
    }
  },
  /**
   * @param {object} transferInfo
   * @param {object[]} sigs
   * @param {number} sigs.vin
   * @param {string} sigs.signature 单纯签名结果
   * @param {string} sigs.pubKey 还原 id 或公钥
   * @param {boolean} isTestnet
   */
  buildTransferTx (transferInfo, sigs, isTestnet = false) {
    const tx = buildTransaction(transferInfo, isTestnet)
    const hashType = bitcoin.Transaction.SIGHASH_ALL
    const network = getNetwork(isTestnet)
    for (const sig of sigs) {
      assert(sig.signature.length === 64 * 2, 'Invalid signature length.')
      const sigBuf = Buffer.from(sig.signature, 'hex')
      ensureType(sig.pubKey, 'string', 'Public key should be string.')
      const pubKey = Buffer.from(sig.pubKey, 'hex')
      assert(secp256k1.isPoint(pubKey), 'Public key should be valid.')
      // add signature
      const ecpair = bitcoin.ECPair.fromPublicKey(pubKey, { network })
      const signature = bitcoin.script.signature.encode(sigBuf, hashType)
      const p2pkh = bitcoin.payments.p2pkh({ pubkey: ecpair.publicKey, signature, network })
      tx.setInputScript(sig.vin, p2pkh.input)
    }
    return {
      txid: tx.getId(),
      rawtx: tx.toHex()
    }
  }
}

module.exports = lib
