import { Component, OnInit } from '@angular/core';
import * as Colors from '@brightlayer-ui/colors';
import { AccountService } from '@app/services/account.service';
import { ViewportService } from '@app/services/viewport.service';
import { TransactionService } from '@app/services/transaction.service';
import { MatDialog } from '@angular/material/dialog';
import { SeedDialogComponent } from '@app/pages/home/seed/seed-dialog.component';
import { animate, style, transition, trigger } from '@angular/animations';
import { SeedService } from '@app/services/seed.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    animations: [
        trigger('fade', [
            transition('void => active', [
                // using status here for transition
                style({ opacity: 0 }),
                animate(120, style({ opacity: 1 })),
            ]),
            transition('* => void', [animate(120, style({ opacity: 0 }))]),
        ]),
    ],
})
export class HomeComponent implements OnInit {
    colors = Colors;

    isLoading = false;
    isLoggedIn = false;
    isLedgerLoaded = false;
    isShowLedgerLoadHelperText = false;
    isCancelLogin = false;

    ledgerLoadErrorMessage: string;

    constructor(
        private readonly _dialog: MatDialog,
        private readonly _transactionService: TransactionService,
        private readonly _accountService: AccountService,
        private readonly _viewportService: ViewportService,
        private readonly _seedService: SeedService
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this._seedService.isUnlocked();
        if (this._accountService.accounts.length > 0) {
            this.isLedgerLoaded = true;
        }
    }

    isSmall(): boolean {
        return this._viewportService.isSmall();
    }

    isMedium(): boolean {
        return this._viewportService.isMedium();
    }

    openLedgerHomePage(): void {
        window.open('https://www.ledger.com/');
    }

    openEnterSeedDialog(): void {
        this.isShowLedgerLoadHelperText = false;
        this.ledgerLoadErrorMessage = undefined;
        const ref = this._dialog.open(SeedDialogComponent);
        ref.afterClosed().subscribe((isNewWalletCreated) => {
            this.isLoggedIn = isNewWalletCreated;
        });
    }

    connectLedger(): void {
        this.ledgerLoadErrorMessage = undefined;
        this._transactionService
            .checkLedgerOrError()
            .then(() => {
                this.isLedgerLoaded = true;
                this.isShowLedgerLoadHelperText = false;
            })
            .catch((err) => {
                console.error(err);
                this.ledgerLoadErrorMessage = err.message;
            });
    }

    showDashboard(): boolean {
        return !this.showLogin() && (this.isLedgerLoaded || this.isLoggedIn);
    }

    showLogin(): boolean {
        return this._seedService.hasSecret() && !this.isLoggedIn && !this.isCancelLogin;
    }

    showHome(): boolean {
        return !this.showLogin() && !this.showDashboard();
    }
}
