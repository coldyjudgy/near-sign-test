const { JWE } = require("node-jose");
const { mnemonicToSeedSync } = require("bip39");
const { fromSeed } = require("bip32");
//import { derivePath } from "near-hd-key";
const nearAPI = require("near-api-js");
const { COIN } = require("../../lib");
const near = require("../../lib/blockchains/near/keyStore");

const {
  createKeyStore,
  getAccount,
  getAlgo2HashKey,
} = require("./_getAccount");

const MNEMONIC = require("../mnemonic.json");

const TYPE = COIN.NEAR;
const INDEX = 0;

async function getSeed(keyStore, password) {
  const key = await getAlgo2HashKey(password, keyStore);
  const mnemonic = await JWE.createDecrypt(key).decrypt(keyStore.j.join("."));
    return mnemonicToSeedSync(mnemonic.plaintext.toString());
}

/*
const SEED = derivePath(
  `m/44'/${path.type}'/${path.account}'/0'/${path.index}'`,
  seed.toString("hex")
);
*/

// *! signTx 3개: seed, path, account >> keyStore.js에서 필요. 밑에 run에서 넣기
async function signTx(seed, path, account) {
  try {
    const response = near.KEYSTORE.signTx(
      seed,
      path,
      {
        sender: account,
        receiver: "d25519:Azqg1LaL3gZCgLN9ymtg6Dtg6by951ctWbHnckDUZNFF",
        networkId: "testnet",
        amount: 300000,
      }
    );

    console.log("response - ", response);
      console.log(
        "verifySignature - ",
        // *! verify 찾기
        nearAPI.KeyPair.verify(response)
      );
     
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
}

async function run() {
  const PASSWORD = MNEMONIC.password;
  const keyStore = await createKeyStore(PASSWORD);
  const account = await getAccount(
    { type: TYPE, account: 0, index: INDEX },
    keyStore,
    PASSWORD
  );
  const SEED = await getSeed(keyStore, PASSWORD);
  await signTx(
    SEED,
    { type: TYPE, account: 0, index: INDEX },
    account
  );
}

run();


