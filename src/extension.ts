import * as vscode from 'vscode';
import HLSClient from './client';

let client: HLSClient;

export interface Configuration {
    heliosPath: string;
}

export function activate(ctx: vscode.ExtensionContext) {
    const configuration: Configuration = { heliosPath: '$HELIOS_PATH' };
    const heliosPath = vscode.workspace.getConfiguration('helios').get<string>('path');
    if (heliosPath) { configuration.heliosPath = heliosPath; }

    ctx.subscriptions.push(
        vscode.languages.setLanguageConfiguration('helios', {
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

    client = new HLSClient(configuration);
    client.start();
}

export async function deactivate() {
    await client.stop();
}

function onDidOpenTextDocument(document: vscode.TextDocument) {
    if (document.languageId !== 'helios') { return; }
    console.log(`Opened ${document.uri}`);
}
