import * as vs from "vscode";
import HLSClient, { HLSConfiguration } from "./client";

let client: HLSClient;

export function activate(context: vs.ExtensionContext) {
    let workspaceConfig = vs.workspace.getConfiguration("helios");
    const config: HLSConfiguration = {
        heliosPath: workspaceConfig.get("path") || "helios",
    };

    context.subscriptions.push(
        vs.languages.setLanguageConfiguration("helios", {
            onEnterRules: [
                {
                    beforeText: /^\s*-{2}\|/,
                    action: {
                        indentAction: vs.IndentAction.None,
                        appendText: "--| ",
                    },
                },
                // {
                //     beforeText: /^\s*\/{3}/,
                //     action: {
                //         indentAction: vs.IndentAction.None,
                //         appendText: "/// ",
                //     },
                // },
            ],
        })
    );

    context.subscriptions.push(
        vs.commands.registerCommand("hls.showSyntaxTree", () => {
            vs.window.showInformationMessage("HLS: Show Syntax Tree");
        })
    );

    vs.workspace.onDidOpenTextDocument(onDidOpenTextDocument);

    client = new HLSClient(config);
    client.start();
}

export async function deactivate() {
    await client.stop();
}

function onDidOpenTextDocument(document: vs.TextDocument) {
    if (document.languageId !== "helios") {
        return;
    }

    console.log(`Opened ${document.uri}`);
}
