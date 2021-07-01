import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { encode } from "bs58";
import { BIP44, RawTx } from "../../types";
//import bs58 from "bs58"
//const sha256 = require('js-sha256');
//const BN = require("bn.js");
//const sha256 = require('js-sha256');

const App = require("near-ledger-js");
const nearAPI = require("near-api-js");

// LEDGER
export class LEDGER {
  static async getAccount(
    path: BIP44,
    transport: TransportWebUSB | TransportNodeHid
  ): Promise<string> {
    transport.setScrambleKey("NEAR");
    const client = await App.createClient(transport);
    const response = await client.getPublicKey(
      `44'/${path.type}'/${path.account}'/0'/${path.index}'`
    );
    return response ? `ed25519:${encode(response)}` : "";
  }
  
  static async signTx(
    path: BIP44,
    transport: TransportWebUSB | TransportNodeHid,
    rawTx: RawTx) {
    const client = await App.createClient(transport);
    
    const rawPublicKey = await client.getPublicKey(`44'/${path.type}'/${path.account}'/0'/${path.index}'`);
    const publicKey = new nearAPI.utils.PublicKey({
      keyType: nearAPI.utils.key_pair.KeyType.ED25519,
      data: rawPublicKey,
    }); 

    //const publicKey = (await this.getAccount(path, transport)).toString();

    const sender = rawTx.sender;
    const receiver = rawTx.receiver;
    const networkId = rawTx.networkId;
    const amount = nearAPI.utils.format.parseNearAmount(rawTx.amount);

    var actions = [nearAPI.transactions.transfer(amount)];
    if (rawTx.isStake) {
      actions = [nearAPI.transactions.stake(amount, publicKey)];
    }

    const provider = new nearAPI.providers
        .JsonRpcProvider(`https://rpc.${networkId}.near.org`);
    
    const accessKey = await provider.query(
        `access_key/${sender}/${publicKey.toString()}`, ''
    );
    const nonce = ++accessKey.nonce;
    const recentBlockHash = nearAPI.utils.serialize.base_decode(accessKey.block_hash);

    const transaction = nearAPI.transactions.createTransaction(
      sender, 
      publicKey, 
      receiver, 
      nonce, 
      actions, 
      recentBlockHash);
    
    const response = await client.sign(
      transaction.encode(), `44'/${path.type}'/${path.account}'/0'/${path.index}'`
    );
  
    const signedTransaction = new nearAPI.transactions.SignedTransaction({
      transaction,
      signature: new nearAPI.transactions.Signature({ 
      keyType: transaction.publicKey.keyType, 
      data: response
      })
    });
  
  const signedSerializedTx = signedTransaction.encode();
  const result = await provider.sendJsonRpc(
    'broadcast_tx_commit', 
    [Buffer.from(signedSerializedTx).toString('base64')]
  );
  
  return result.transaction
  }

  /*
  export function signMessage(
    path: BIP44,
    transport: TransportWebUSB | TransportNodeHid,
    msg: string) {
    // ...
  }
  */
}
