import * as SSC from 'sscjs';

const ssc = new SSC('https://api.hive-engine.com/rpc/contracts/');

ssc.getContractInfo('tokens', (err, result) => {
    console.log(err, result);
});
