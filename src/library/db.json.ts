import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import { LoggerFactory } from './LoggerFactory';

const logger = LoggerFactory.getInstance().getLogger('DB');

export class JSONDBBuilder {
    private db: JsonDB;

    public constructor(dbFileName: string, saveOnPush: boolean, humanReadable: boolean, path: string) {
        this.db = new JsonDB(new Config(dbFileName, saveOnPush, humanReadable, path));
    }

    public getData(path: string) {
        try {
            return this.db.getData(path);
        } catch (e) {
            logger.debug(e.toString());
            return null;
        }
    }

    public push(path: string, data: Object) {
        logger.debug(`add data to path: ${path}`);
        this.db.push(path, data);
    }

    public delete(path: string) {
        this.db.delete(path);
    }

    public pushArray(path: string, data: Object, key: string) {
        let items = this.db.getData(path);
        let duplicated = false;
        for (const item of items) {
            if (item[key] === data[key]) {
                logger.warn(`duplicated item`);
                duplicated = true;
                break;
            }
        }
        if (!duplicated) {
            this.db.push(path + '[]', data);
        }
    }

    public findArray(path: string, value: string, key: string) {
        const items = this.db.getData(path);
        for (const item of items) {
            if (item[key] === value) {
                return item;
            }
        }
        return null;
    }
}
