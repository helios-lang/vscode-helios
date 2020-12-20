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
        let client = await createLanguageClient();
        context.subscriptions.push(client.start());

        const status = vs.window.createStatusBarItem(vs.StatusBarAlignment.Left);
        status.text = "$(check) Helios: Ready";
        status.tooltip = "Ready for tasks";
        status.show();
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
 * Creates a new language client and establishes the client and server.
 */
async function createLanguageClient(): Promise<lc.LanguageClient> {
    const serverPath = await utils.getServerPath();

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
    if (client) {
        await client.stop();
    }
}
