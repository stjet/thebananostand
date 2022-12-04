// @ts-nocheck
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { SecretService } from '@app/services/secret.service';
import { DatasourceService } from '@app/services/datasource.service';
import { AppStateService } from '@app/services/app-state.service';

@Injectable({
    providedIn: 'root',
})
/** Services that handle send, receive, change transactions. */
export class TransactionService {
    constructor(
        private readonly _secretService: SecretService,
        private readonly _datasource: DatasourceService,
        private readonly _appStateService: AppStateService
    ) {}

    private async _configApi(bananodeApi): Promise<void> {
        const client = await this._datasource.getRpcNode();
        bananodeApi.setUrl(client.nodeAddress);
        bananodeApi.setAuth(environment.token);
    }

    /** Attempts a withdrawal.  On success, returns transaction hash. */
    async withdraw(recipient: string, withdrawAmount: number, accountIndex: number): Promise<string> {
        const accountSigner = await this.getAccountSigner(accountIndex);
        const bananodeApi = window.bananocoinBananojs.bananodeApi;
        await this._configApi(bananodeApi);
        const bananoUtil = window.bananocoinBananojs.bananoUtil;
        const config = window.bananocoinBananojsHw.bananoConfig;
        try {
            const amountRaw = window.bananocoinBananojs.getBananoDecimalAmountAsRaw(withdrawAmount);
            const response = await bananoUtil.sendFromPrivateKey(
                bananodeApi,
                accountSigner,
                recipient,
                amountRaw,
                config.prefix
            );
            return Promise.resolve(response);
        } catch (err) {
            console.error(err);

            return Promise.reject(err);
        }
    }

    /** Attempts to receive funds. */
    async receive(account: string, index: number, hash: string): Promise<string> {
        const config = window.bananocoinBananojsHw.bananoConfig;
        const accountSigner = await this.getAccountSigner(index);
        const bananodeApi = window.bananocoinBananojs.bananodeApi;
        await this._configApi(bananodeApi);

        try {
            let representative = await bananodeApi.getAccountRepresentative(account);
            if (!representative) {
                // TODO populate this via the rep scores API. For now default to batman
                representative = 'ban_3batmanuenphd7osrez9c45b3uqw9d9u81ne8xa6m43e1py56y9p48ap69zg';
            }
            const loggingUtil = window.bananocoinBananojs.loggingUtil;
            const depositUtil = window.bananocoinBananojs.depositUtil;
            const receiveResponse =
                ((await depositUtil.receive(
                    loggingUtil,
                    bananodeApi,
                    account,
                    accountSigner,
                    representative,
                    hash,
                    config.prefix
                )) as string) || ReceiveResponse;

            if (typeof receiveResponse === 'string') {
                return receiveResponse;
            }
            return receiveResponse.receiveBlocks[0];
        } catch (err) {
            console.error(err);
            return Promise.reject(err);
        }
    }

    /** Attempts a change block.  On success, returns transaction hash. */
    async changeRepresentative(newRep: string, address: string, accountIndex: number): Promise<string> {
        const accountSigner = await this.getAccountSigner(accountIndex);
        const bananodeApi = window.bananocoinBananojs.bananodeApi;
        await this._configApi(bananodeApi);
        const bananoUtil = window.bananocoinBananojs.bananoUtil;
        const config = window.bananocoinBananojsHw.bananoConfig;
        try {
            const response = await bananoUtil.change(bananodeApi, accountSigner, newRep, config.prefix);
            return Promise.resolve(response);
        } catch (err) {
            console.error(err);
            return Promise.reject(err);
        }
    }

    /** Checks if ledger is connected via USB & is unlocked, ready to use. */
    async checkLedgerOrError(): Promise<void> {
        const config = window.bananocoinBananojsHw.bananoConfig;
        window.bananocoinBananojs.setBananodeApiUrl(config.bananodeUrl);
        const TransportWebUSB = window.TransportWebUSB;
        try {
            const isSupportedFlag = await TransportWebUSB.isSupported();
            // eslint-disable-next-line no-console
            console.info('connectLedger', 'isSupportedFlag', isSupportedFlag);
            // Check Ledger is connected & app is open:
            await this.getAccountFromIndex(0);
            return Promise.resolve();
        } catch (err) {
            console.error(err);
            if (err.message) {
                if (err.message.includes('No device selected')) {
                    return Promise.reject('No ledger device connected.');
                }
            }

            return Promise.reject('Error connecting ledger.');
        }
    }

    /** Returns a public address associated with the active wallet's index number. */
    async getAccountFromIndex(accountIndex: number): Promise<string> {
        if (this._appStateService.store.getValue().hasUnlockedSecret) {
            const seed = await this._secretService.getActiveWalletSeed();
            const privateKey = await window.bananocoinBananojs.getPrivateKey(seed, accountIndex);
            const publicKey = await window.bananocoinBananojs.getPublicKey(privateKey);
            const account = window.bananocoinBananojs.getBananoAccount(publicKey);
            return account;
        }
        const accountData = await window.bananocoin.bananojsHw.getLedgerAccountData(accountIndex);
        const account = accountData.account;
        return account;
    }

    async getAccountSigner(index: number): any {
        if (this._appStateService.store.getValue().hasUnlockedSecret) {
            const seed = await this._secretService.getActiveWalletSeed();
            return await window.bananocoinBananojs.getPrivateKey(seed, index);
        }
        return await window.bananocoin.bananojsHw.getLedgerAccountSigner(index);
    }
}
