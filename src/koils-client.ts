import * as lc from 'vscode-languageclient';
import * as vscode from 'vscode';
import { Configuration } from './extension';

export default class KoiLSClient {
    private languageClient: lc.LanguageClient | undefined;
    private configuration: Configuration;
    private disposables: vscode.Disposable[];

    public constructor(configuration: Configuration) {
        this.languageClient = undefined;
        this.configuration = configuration;
        this.disposables = [];
    }

    public start() {
        let serverOptions: lc.Executable = {
            command: this.configuration.koiPath,
            args: ['ide'],
            options: {
                env: { RUST_BACKTRACE: 1, RUST_LOG: "koi=trace" },
            }
        };

        let clientOptions: lc.LanguageClientOptions = {
            documentSelector: [
                { scheme: 'file', language: 'koi' },
                { scheme: 'untitled', language: 'koi' }
            ]
        };

        this.languageClient = new lc.LanguageClient(
            'KoiLS',
            'Koi Language Server',
            serverOptions,
            clientOptions
        );

        this.registerCommands();

        this.disposables.push(this.languageClient.start());
        // vscode.window.showInformationMessage('Started KoiLS');
    }

    private registerCommands() {
        this.disposables.push(vscode.commands.registerCommand('koils.run', () => {
            vscode.window.showInformationMessage('KoiLS: Run');
        }));
    }

    public async stop() {
        // vscode.window.showInformationMessage('Stopping KoiLS...');
        await this.languageClient?.stop();
        this.disposables.forEach(disposable => disposable.dispose());
    }
}
