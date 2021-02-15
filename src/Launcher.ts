import execa from 'execa';
import fs from 'fs-extra';
import * as path from 'path';
import logger, { Logger } from '@wdio/logger';
import { SevereServiceError } from 'webdriverio';

export interface ServiceOptions {
    pathToBrowsersConfig: string;
    autoPullImages?: boolean;
    stopExistingSelenoid?: boolean;
    customSelenoidContainerName?: string;
    terminateWdioOnError?: boolean;
    selenoidVersion?: string;
    port?: number;
    dockerArgs?: string[];
    selenoidArgs?: string[];
}

export interface BrowserConfig {
    [browser: string]: {
        default: string;
        versions: {
            [version: string]: {
                image: string;
                port: number;
                path: string;
            };
        };
    };
}

export default class SelenoidStandaloneService {
    private options: ServiceOptions;
    private selenoidContainerName: string;
    private log: Logger;
    private dockerSocketPath: string;
    private selenoidBrowsersConfigPath: string;
    private selenoidVersion: string;

    constructor(serviceOptions: ServiceOptions) {
        this.options = serviceOptions;
        this.log = logger('wdio-selenoid-standalone-service');
        this.selenoidVersion = this.options.selenoidVersion || 'latest-release';
        this.selenoidContainerName = this.options.customSelenoidContainerName || 'wdio_selenoid';

        // fix docker paths for windows/*nix
        const platform = process.platform;
        if (platform === 'win32') {
            this.dockerSocketPath = '//var/run/docker.sock';
            const rawBrowserPath = path.join(process.cwd(), this.options.pathToBrowsersConfig);
            this.selenoidBrowsersConfigPath = rawBrowserPath.replace('C', 'c').replace(/\\/g, '/');
        } else {
            this.dockerSocketPath = '/var/run/docker.sock';
            this.selenoidBrowsersConfigPath = path.join(process.cwd(), this.options.pathToBrowsersConfig);
        }
    }

    async stopSelenoid(): Promise<string> {
        this.log.info('Stopping any running selenoid containers');
        try {
            const { stdout } = await execa('docker', ['rm', '-f', this.selenoidContainerName]);

            return Promise.resolve(stdout);
        } catch (error) {
            return Promise.resolve(error);
        }
    }

    async startSelenoid(): Promise<string> {
        this.log.info('Starting Selenoid Container');
        const dockerArgs = this.options.dockerArgs || [];
        const selenoidArgs = this.options.selenoidArgs || [];

        const startArgs = [
            'run',
            '-d',
            '--name',
            this.selenoidContainerName,
            '-p',
            '4444:4444',
            '-v',
            `${this.dockerSocketPath}:/var/run/docker.sock`,
            '-v',
            `${path.dirname(this.selenoidBrowsersConfigPath)}/:/etc/selenoid/:ro`,
            ...dockerArgs,
            `aerokube/selenoid:${this.selenoidVersion}`,
            ...selenoidArgs,
        ];

        try {
            const { stdout } = await execa('docker', startArgs);

            return Promise.resolve(stdout);
        } catch (error) {
            if (this.options.terminateWdioOnError === true) {
                throw new SevereServiceError(`Unable to start selenoid container \n${error}`);
            }

            return Promise.resolve(error);
        }
    }

    async verifySelenoidBrowserConfig(): Promise<void> {
        const filePath = await fs.pathExists(this.options.pathToBrowsersConfig);
        if (!filePath) {
            this.log.error(`Unable to find browsers.json at ${this.options.pathToBrowsersConfig}`);

            if (this.options.terminateWdioOnError === true) {
                throw new SevereServiceError(`Unable to find browsers.json at ${this.options.pathToBrowsersConfig}`);
            }
        }

        return Promise.resolve();
    }

    async pullRequiredBrowserFiles(): Promise<string> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const selenoidConfig: BrowserConfig = require(this.selenoidBrowsersConfigPath);

            const browserImages: string[] = [];

            Object.entries(selenoidConfig).forEach(([_browserName, browserConfig]) => {
                Object.entries(browserConfig.versions).forEach(([_version, versionConfig]) => {
                    browserImages.push(versionConfig.image);
                });
            });

            for (const image of browserImages) {
                this.log.info(`Pulling image ${image}`);
                await execa('docker', ['pull', image]);
            }

            return Promise.resolve('');
        } catch (error) {
            this.log.error(error);
            return Promise.resolve(error);
        }
    }

    async pullRequiredSelenoidVersion(): Promise<string> {
        this.log.info(`Pulling selenoid image 'aerokube/selenoid:${this.selenoidVersion}'`);
        const { stdout } = await execa('docker', ['pull', `aerokube/selenoid:${this.selenoidVersion}`]);

        return Promise.resolve(stdout);
    }

    async onPrepare(_config: unknown, _capabilities: unknown): Promise<string> {
        // kill existing selenoid if running
        await this.stopSelenoid();

        // check browsers file
        await this.verifySelenoidBrowserConfig();

        if (this.options.autoPullImages) {
            // pull any containers listed in the browsers.json
            await this.pullRequiredBrowserFiles();

            // pull selenoid if needed
            await this.pullRequiredSelenoidVersion();
        }

        // run container
        return this.startSelenoid();
    }

    async onComplete(_exitCode: number, _config: unknown, _capabilities: unknown): Promise<string> {
        return this.stopSelenoid();
    }
}
