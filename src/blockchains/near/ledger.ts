import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { encode } from "bs58";
import { BIP44, RawTx } from "../../types";

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

    const sender = rawTx.sender;
    const receiver = rawTx.receiver;
    const networkId = rawTx.networkId;
    const amount = nearAPI.utils.format.parseNearAmount(rawTx.amount);
    const provider = new nearAPI.providers
        .JsonRpcProvider(`https://rpc.${networkId}.near.org`);
    
    const accessKey = await provider.query(
        `access_key/${sender}/${this.getAccount.toString()}`, ''
    );
    const nonce = ++accessKey.nonce;

    const actions = [nearAPI.transactions.transfer(amount)];
    const recentBlockHash = nearAPI.utils.serialize.base_decode(accessKey.block_hash);

    var transaction = client.createTransaction(
      sender, 
      this.getAccount, 
      receiver, 
      nonce, 
      actions, 
      recentBlockHash);
      
    transaction = Buffer.from(transaction);

    const serializedTx = nearAPI.utils.serialize.serialize(
      nearAPI.transactions.SCHEMA, 
      transaction
  );
    
    const result = await client.sign(
      serializedTx, path
    );
      

    return result
    // ...
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
