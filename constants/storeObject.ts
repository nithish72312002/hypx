const { Defender } = require('@openzeppelin/defender-sdk');

const dotenv = require('dotenv');

dotenv.config();

async function main() {

const rclient = new Defender({

relayerApiKey: process.env.RELAYER_API_KEY,
relayerApiSecret: process.env.RELAYER_SECRET_KEY,
});

const tx = await rclient.relaySigner.sendTransaction({
    to: '0x1B9ec5Cc45977927fe6707f2A02F51e1415f2052',
    speed: 'fast',
    data: '0x6057361d000000000000000000000000000000000000000000000000000000000000000a',
    gasLimit: '80000',
  });
  const txUpdate = await client.relaySigner.getTransaction(tx.transactionId);
  console.log('Tx Status', JSON.stringify(txUpdate, null, 2));
}



main().catch((error) => {
console.error(error);
process.exitCode = 1;
});