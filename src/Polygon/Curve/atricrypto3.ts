import { Config } from './config';
import { LoggerFactory } from '../../library/LoggerFactory';
import { getPoolV1Info } from './lib/pool.v1';

const logger = LoggerFactory.getInstance().getLogger('main');

const main = async () => {
    //const poolParams = Config.pools.v1['0x92215849c439e1f8612b6646060b4e3e5ef822cc'];
    const poolInfo = await getPoolV1Info(
        '0x92215849c439e1f8612b6646060b4e3e5ef822cc',
        Config.pools['0x92215849c439e1f8612b6646060b4e3e5ef822cc'],
    );
    console.log(JSON.stringify(poolInfo));
};

main().catch((e) => {
    logger.error(e.message);
});
