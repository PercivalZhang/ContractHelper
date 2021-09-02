import { configure, getLogger, Logger } from 'log4js';
import * as path from 'path';

export class LoggerFactory {
    private static instance: LoggerFactory;

    private constructor() {
        configure(path.resolve('config/log4js.json'));
    }

    static getInstance() {
        if (!LoggerFactory.instance) {
            LoggerFactory.instance = new LoggerFactory();
        }
        return LoggerFactory.instance;
    }

    getLogger(category: string): Logger {
        return getLogger(category);
    }
}
