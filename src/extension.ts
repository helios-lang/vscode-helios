import * as lc from "vscode-languageclient";
import * as vs from "vscode";

import * as commands from "./commands";
import { Callback, HeliosState } from "./state";
import { getServerPath } from "./utils";

let state: HeliosState | undefined;

/**
 * Recognised commands for this extension.
 */
const cmds: { [key: string]: Callback } = {
    "helios.showSyntaxTree": commands.showSyntaxTree,
    "helios.version": commands.showVersion,
};

/**
 * This function is called when the extension is activated.
 *
 * @param context The extension context.
 */
export async function activate(context: vs.ExtensionContext) {
    try {
        const serverPath = await getServerPath();
        let client = createLanguageClient(serverPath);
        state = await HeliosState.activate(context, serverPath, client);

        // Register command to restart server
        state.registerCommand("helios.restartServer", async _ => {
            vs.window.showInformationMessage("Restarting Helios-LS...");
            await cleanUpAndDeactivate(context);
            await activate(context);
        });

        // Register the rest of the commands
        for (const cmd in cmds) {
            const handler = cmds[cmd];
            state.registerCommand(cmd, handler);
        }
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
 * This function is called when the extension is deactivated.
 */
export async function deactivate() {
    await state?.client.stop();
    state = undefined;
}
