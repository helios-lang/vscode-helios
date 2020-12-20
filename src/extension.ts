import * as commands from "./commands";
import * as lc from "vscode-languageclient";
import * as utils from "./utils";
import * as vs from "vscode";

let client: lc.LanguageClient;

type Callback = (...args: any[]) => any;
type Commands = { [key: string]: Callback };

/** Recognised commands for this extension. */
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
    console.log("Activating extension...");
    const status = vs.window.createStatusBarItem(vs.StatusBarAlignment.Left);

    for (const cmd in cmds) {
        const handler = cmds[cmd];
        const disposable = vs.commands.registerCommand(cmd, handler);
        context.subscriptions.push(disposable);
    }

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

    status.dispose();
    context.subscriptions.push(client.start());
}

/**
 * This function is called when the extension is deactivated.
 */
export async function deactivate() {
    await client.stop();
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
