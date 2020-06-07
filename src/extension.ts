import * as vscode from 'vscode';
import KoiLSClient from './koils-client';

let client: KoiLSClient;

export interface Configuration {
    koiPath: string;
}

export function activate(ctx: vscode.ExtensionContext) {
    const configuration: Configuration = { koiPath: "$KOI_PATH" };
    const koiPath = vscode.workspace.getConfiguration("koi").get<string>("path");

    if (koiPath) { configuration.koiPath = koiPath; }
    client = new KoiLSClient(configuration);

    ctx.subscriptions.push(
        vscode.languages.setLanguageConfiguration('koi', {
            onEnterRules: [
                {
                    beforeText: /^\s*\/{3}/,
                    action: { indentAction: vscode.IndentAction.None, appendText: '/// ' }
                },
                {
                    beforeText: /^\s*\/{2}!/,
                    action: { indentAction: vscode.IndentAction.None, appendText: '//! ' }
                }
            ],
            indentationRules: {
                increaseIndentPattern: /^.*(=>?|->|(do|else|elif|module|then|with))\s*$/,
                decreaseIndentPattern: /^\s*(deriving|else|elif|end)(?:\b|;)$/
            },
            wordPattern: /(-?(?:\d+(?:\.\d+)?|\.\d+)\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
        })
    );

    vscode.workspace.onDidOpenTextDocument(onDidOpenTextDocument);
}

export async function deactivate() {
    await client.stop();
}

function onDidOpenTextDocument(document: vscode.TextDocument) {
    if (document.languageId !== "koi") { return; }
    vscode.window.showInformationMessage(`Opened: ${document.uri}`);
}
