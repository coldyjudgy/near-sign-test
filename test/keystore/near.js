//working
const { JWE } = require("node-jose");
const { mnemonicToSeedSync } = require("bip39");
const { COIN } = require("../../lib");
const near = require("../../lib/blockchains/near/keyStore");
//const BN = require("bn.js");

const {
  createKeyStore,
  getAccount,
  getAlgo2HashKey,
} = require("./_getAccount");

const MNEMONIC = require("../mnemonic.json");

const TYPE = COIN.NEAR;
const INDEX = 1;

async function getSeed(keyStore, password) {
  const key = await getAlgo2HashKey(password, keyStore);
  const mnemonic = await JWE.createDecrypt(key).decrypt(keyStore.j.join("."));
  const seed = mnemonicToSeedSync(mnemonic.plaintext.toString());
  return seed
}

async function signTx(seed, path) {
  try {
    const isStake = true;
    const response = await near.KEYSTORE.signTx( 
      seed,
      path,
      {
        sender: "kms.testnet",
        receiver: "kms.testnet", 
        validator: "ed25519:DiogP36wBXKFpFeqirrxN8G2Mq9vnakgBvgnHdL9CcN3", 
        networkId: "testnet",
        amount: "31",// new BN("99999999999", 10).toString();
        isStake,
      }
    );

    console.log("response - ", response);

  } catch (error) {
    console.log(error);
  }
}

async function run() {
  const PASSWORD = MNEMONIC.password;
  const keyStore = await createKeyStore(PASSWORD);
  const SEED = await getSeed(
    keyStore,
    PASSWORD
  );

  await signTx(
    SEED, 
    { type: TYPE, account: 0, index: INDEX }
  );
}

run();


