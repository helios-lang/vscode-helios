import * as lc from 'vscode-languageclient';
import * as vscode from 'vscode';
import { Configuration } from './extension';

export default class HLSClient {
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
            command: this.configuration.heliosPath,
            args: ['ide'],
            options: {
                env: { RUST_BACKTRACE: 1, RUST_LOG: "koi=trace" },
            }
        };

        let clientOptions: lc.LanguageClientOptions = {
            documentSelector: [
                { scheme: 'file', language: 'helios' },
                { scheme: 'untitled', language: 'helios' }
            ]
        };

        this.languageClient = new lc.LanguageClient(
            'HLS',
            'Helios Language Server',
            serverOptions,
            clientOptions
        );

        this.registerCommands();
        this.disposables.push(this.languageClient.start());
    }

    private registerCommands() {
        this.disposables.push(vscode.commands.registerCommand('hls.run', () => {
            vscode.window.showInformationMessage('HLS: Run');
        }));
    }

    public async stop() {
        // vscode.window.showInformationMessage('Stopping HLS...');
        await this.languageClient?.stop();
        this.disposables.forEach(disposable => disposable.dispose());
    }
}
