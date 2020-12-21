import * as lc from "vscode-languageclient";
import * as vs from "vscode";

import * as commands from "./commands";
import { getServerPath } from "./utils";

let client: lc.LanguageClient | undefined;

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
 *
 * @param context The extension context.
 */
export async function activate(context: vs.ExtensionContext) {
    console.log("Activating extension...");

    for (const cmd in cmds) {
        const handler = cmds[cmd];
        const disposable = vs.commands.registerCommand(cmd, handler);
        context.subscriptions.push(disposable);
    }

    try {
        const path = await getServerPath();
        let client = createLanguageClient(path);
        context.subscriptions.push(client.start());
    } catch (error) {
        if (error === "HELIOS_ABORT") {
            await cleanUpAndDeactivate(context);
        } else if (error === "HELIOS_NO_EXECUTABLE_FOUND") {
            vs.window.showErrorMessage(
                "Failed to find the Helios language server executable. You may not have it installed on your system."
            );
            await cleanUpAndDeactivate(context);
        } else {
            console.error(error);
            vs.window.showErrorMessage("An unexpected error occurred");
        }
    }
}

/**
 * Disposes all the subscriptions of the extension before stopping the client
 * and deactivating the extension.
 *
 * @param context The extension context to dispose subscriptions from.
 */
async function cleanUpAndDeactivate(context: vs.ExtensionContext) {
    while (context.subscriptions.length > 0) {
        try {
            context.subscriptions.pop()!.dispose();
        } catch (error) {
            console.error(`Failed to dispose: ${error}`);
        }
    }

    await deactivate();
}

/**
 * Creates a new language client and establishes the client and server.
 */
function createLanguageClient(serverPath: string): lc.LanguageClient {
    let serverOptions: lc.ServerOptions = {
        run: {
            command: serverPath,
        },
        debug: {
            command: serverPath,
            options: {
                env: {
                    RUST_BACKTRACE: 1,
                    RUST_LOG: "helios_ls=trace",
                },
            },
        },
    };

    let clientOptions: lc.LanguageClientOptions = {
        documentSelector: [
            { scheme: "file", language: "helios" },
            { scheme: "untitled", language: "helios" },
        ],
    };

    return new lc.LanguageClient(
        "helios-ls",
        "Helios Language Server",
        serverOptions,
        clientOptions
    );
}

/**
 * This function is called when the extension is deactivated.
 */
export async function deactivate() {
    console.log("Deactivating extension...");
    await client?.stop();
    client = undefined;
}
