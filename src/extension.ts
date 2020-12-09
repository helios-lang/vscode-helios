import * as vscode from 'vscode';
import KoiLSClient from './koils-client';

let client: KoiLSClient;

export interface Configuration {
    koiPath: string;
}

export function activate(ctx: vscode.ExtensionContext) {
    const configuration: Configuration = { koiPath: '$KOI_PATH' };
    const koiPath = vscode.workspace.getConfiguration('koi').get<string>('path');
    if (koiPath) { configuration.koiPath = koiPath; }

    ctx.subscriptions.push(
        vscode.languages.setLanguageConfiguration('koi', {
            onEnterRules: [
                {
                    beforeText: /^\s*-{2}\|/,
                    action: { indentAction: vscode.IndentAction.None, appendText: '--| ' },
                },
                {
                    beforeText: /^\s*\/{3}/,
                    action: { indentAction: vscode.IndentAction.None, appendText: '/// ' },
                },
                {
                    beforeText: /^\s*\/{2}!/,
                    action: { indentAction: vscode.IndentAction.None, appendText: '//! ' },
                },
            ],
            wordPattern: /(-?(?:\d+(?:\.\d+)?|\.\d+)\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
        })
    );

    vscode.workspace.onDidOpenTextDocument(onDidOpenTextDocument);

    client = new KoiLSClient(configuration);
    client.start();
}

export async function deactivate() {
    await client.stop();
}

function onDidOpenTextDocument(document: vscode.TextDocument) {
    if (document.languageId !== 'koi') { return; }
    console.log(`Opened ${document.uri}`);
}
