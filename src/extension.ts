import * as lc from "vscode-languageclient";
import * as vs from "vscode";

import * as commands from "./commands";
import { Callback, HeliosContext } from "./context";
import { getServerPath } from "./utils";

let hContext: HeliosContext | undefined;

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
 * @param eContext The extension context.
 */
export async function activate(eContext: vs.ExtensionContext) {
    try {
        const serverPath = await getServerPath(eContext);
        let client = createLanguageClient(serverPath);
        hContext = await HeliosContext.activate(eContext, serverPath, client);

        // Register command to restart server
        hContext.registerCommand("helios.restartServer", async _ => {
            vs.window.showInformationMessage("Restarting Helios-LS...");
            await cleanUpAndDeactivate(eContext);
            await activate(eContext);
        });

        // Register the rest of the commands
        for (const cmd in cmds) {
            const handler = cmds[cmd];
            hContext.registerCommand(cmd, handler);
        }

        // Detect changes to configuration
        vs.workspace.onDidChangeConfiguration(onDidChangeConfiguration);
    } catch (error) {
        if (error === "HELIOS_ABORT") {
            await cleanUpAndDeactivate(eContext);
        } else if (error === "HELIOS_NO_EXECUTABLE_FOUND") {
            vs.window.showErrorMessage(
                "Unable to find the Helios-LS executable. \
                 Is it installed correctly?"
            );
            await cleanUpAndDeactivate(eContext);
        } else {
            console.error(error);
            vs.window.showErrorMessage("An unexpected error occurred");
        }
    }
}

const configsRequiringReload = ["helios.serverPath"];

/**
 * Handler for when the user has changed a configuration in the `settings.json`
 * file. This function will only check Helios-specific options (such as the
 * language server path).
 *
 * @param event The configuration change event.
 */
async function onDidChangeConfiguration(event: vs.ConfigurationChangeEvent) {
    // Check if the changed option is one that requires a reload
    const changedOption = configsRequiringReload.find(option =>
        event.affectsConfiguration(option)
    );

    if (!changedOption) return;

    const response = await vs.window.showInformationMessage(
        `Changing '${changedOption}' requires a reload.`,
        "Reload now"
    );

    if (response === "Reload now") {
        await vs.commands.executeCommand("workbench.action.reloadWindow");
    }
}

/**
 * Creates a new language client and establishes the client and server.
 */
function createLanguageClient(serverPath: string): lc.LanguageClient {
    let serverOptions: lc.ServerOptions = {
        run: {
            command: serverPath,
            transport: lc.TransportKind.stdio,
        },
        debug: {
            command: serverPath,
            transport: lc.TransportKind.stdio,
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
        "Helios-LS",
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
    await hContext?.client.stop();
    hContext = undefined;
}
