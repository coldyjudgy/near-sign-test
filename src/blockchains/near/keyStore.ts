import { encode } from "bs58";
import nacl from "tweetnacl";
import { derivePath } from "near-hd-key";
import { BIP44, RawTx } from "../../types";

const nearAPI = require("near-api-js");
const sha256 = require('js-sha256');

export class KEYSTORE {
  static getAccount(seed: Buffer, path: BIP44): string {
    const { key } = derivePath(
      `m/44'/${path.type}'/${path.account}'/0'/${path.index}'`,
      seed.toString("hex")
    ); // *! seed 생성
    const keyPair = nacl.sign.keyPair.fromSeed(key);
    return `ed25519:${encode(Buffer.from(keyPair.publicKey))}`;
  }

  private static getPrivateKey(seed: Buffer, path: BIP44): string {
    const { key } = derivePath(
      `m/44'/${path.type}'/${path.account}'/0'/${path.index}'`,
      seed.toString("hex")
    );
    const keyPair = nacl.sign.keyPair.fromSeed(key);
    return encode(Buffer.from(keyPair.secretKey));
  }

  // *! signTx 3개: seed, path, rawTx >> near.js 34:43에서 받아와야 함
  async signTx(seed: Buffer, path: BIP44, rawTx: RawTx): Promise<{ [key: string]: any }> {

    const privateKey = KEYSTORE.getPrivateKey(seed, path);
    const sender = rawTx.sender;
    const receiver = rawTx.receiver;
    const networkId = rawTx.networkId;
    const amount = nearAPI.utils.format.parseNearAmount(rawTx.amount);
    const provider = new nearAPI.providers
        .JsonRpcProvider(`https://rpc.${networkId}.near.org`);
    
    const publicKey = KEYSTORE.getAccount(seed, path);
    const keyPair = nearAPI.utils.key_pair.KeyPairEd25519.fromString(privateKey);
    const accessKey = await provider.query(
        `access_key/${sender}/${publicKey.toString()}`, ''
    );

    // checks to make sure provided key is a full access key

    const nonce = ++accessKey.nonce;
    const actions = [nearAPI.transactions.transfer(amount)];
    const recentBlockHash = nearAPI.utils.serialize.base_decode(accessKey.block_hash);
    
    const transaction = nearAPI.transactions.createTransaction(
        sender, 
        publicKey, 
        receiver, 
        nonce, 
        actions, 
        recentBlockHash
    );

    // before we can sign the transaction we must perform three steps...
    // 1) serialize the transaction in Borsh
    const serializedTx = nearAPI.utils.serialize.serialize(
        nearAPI.transactions.SCHEMA, 
        transaction
    );
    // 2) hash the serialized transaction using sha256
    const serializedTxHash = new Uint8Array(sha256.sha256.array(serializedTx));
    // 3) create a signature using the hashed transaction
    const signature = keyPair.sign(serializedTxHash);

    // now we can sign the transaction :)
    const signedTransaction = new nearAPI.transactions.SignedTransaction({
        transaction,
        signature: new nearAPI.transactions.Signature({ 
        keyType: transaction.publicKey.keyType, 
        data: signature.signature 
        })
    });

    return signedTransaction
  }

  /*
  export signMessage(node: BIP32Interface, msg: string) {
    // ...
  }
  */
}
