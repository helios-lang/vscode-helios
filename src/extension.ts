import * as commands from "./commands";
import * as lc from "vscode-languageclient";
import * as utils from "./utils";
import * as vs from "vscode";

let client: lc.LanguageClient;

type Callback = (...args: any[]) => any;
type Commands = { [key: string]: Callback };

/**
 * Recognised commands for this extension.
 */
const cmds: Commands = {
    "helios.showSyntaxTree": commands.showSyntaxTree,
    "helios.version": commands.showVersion,
    "helios.restartServer": commands.restartServer,
};

/**
 * This function is called when the extension is activated.
 * @param context The extension context.
 */
export async function activate(context: vs.ExtensionContext) {
    for (const cmd in cmds) {
        const handler = cmds[cmd];
        const disposable = vs.commands.registerCommand(cmd, handler);
        context.subscriptions.push(disposable);
    }

    try {
        const serverPath = await utils.getServerPath();

        let serverOptions: lc.ServerOptions = {
            command: serverPath,
            transport: lc.TransportKind.stdio,
            options: {
                env: { RUST_BACKTRACE: 1, RUST_LOG: "helios_ls=trace" },
            },
        };

        let clientOptions: lc.LanguageClientOptions = {
            documentSelector: [
                { scheme: "file", language: "helios" },
                { scheme: "untitled", language: "helios" },
            ],
        };

        client = new lc.LanguageClient(
            "helios-ls",
            "Helios Language Server",
            serverOptions,
            clientOptions
        );

        context.subscriptions.push(client.start());
    } catch (error) {
        if (error === "HELIOS_ABORT" || error === "HELIOS_CANCEL") {
            context.subscriptions.forEach(disposable => disposable.dispose());
            await deactivate();
        } else if (error === "HELIOS_NO_EXECUTABLE_FOUND") {
            vs.window.showErrorMessage(
                "Failed to find the Helios language server executable. You may not have it installed."
            );
            context.subscriptions.forEach(disposable => disposable.dispose());
            await deactivate();
        } else {
            console.error(error);
            vs.window.showErrorMessage(
                `An unexpected error occurred: ${error}`
            );
        }
    }
}

/**
 * This function is called when the extension is deactivated.
 */
export async function deactivate() {
    if (client) {
        await client.stop();
    }
}

// /**
//  * Handler for when a document in the workspace is opened.
//  * @param document The opened text document.
//  */
// function onDidOpenTextDocument(document: vs.TextDocument) {
//     if (document.languageId !== "helios") {
//         return;
//     }

//     console.log(`Opened ${document.uri}`);
// }
