import * as vs from "vscode";
import * as fs from "fs";
import which = require("which");

/**
 * Attempts to get the path of the language server.
 */
export async function getServerPath(): Promise<string> {
    const config = vs.workspace.getConfiguration("helios");
    let serverPath = config.serverPath;

    if (!(await isPathValid(serverPath))) {
        let choice = await vs.window.showInformationMessage(
            serverPath === ""
                ? "The path to the Helios language server is not configured."
                : "The configured path to the Helios language server is invalid.",
            "Quit server",
            "Find it for me"
        );

        if (choice === "Find it for me") {
            serverPath = await locateExecutable();
            let choice = await vs.window.showInformationMessage(
                "Successfully found the Helios language server executable. Would you like to update the configuration with its location?",
                "No",
                "Yes"
            );

            if (choice === "Yes") {
                config.update("serverPath", serverPath);
            }
        } else {
            return Promise.reject("ABORT");
        }
    }

    return serverPath;
}

/**
 * Determines if the given path is valid.
 * @param path The path to check.
 */
async function isPathValid(path: string | undefined): Promise<boolean> {
    if (!path || path === "") {
        return Promise.resolve(false);
    } else {
        return await fs.promises
            .stat(path)
            .then(_ => true)
            .catch(_ => false);
    }
}

/**
 * Attempts to locate the executable of the Helios language server.
 *
 * This function will check if the Helios language server is in the PATH. If it
 * isn't found, then that means either the user doesn't have it installed, or
 * they have placed it in some arbitrary location (in which case, they should
 * manually set it in the `helios.serverPath` configuration).
 */
async function locateExecutable(): Promise<string> {
    return vs.window.withProgress(
        {
            location: vs.ProgressLocation.Notification,
            title: "Locating Helios language server executable...",
            cancellable: true,
        },
        async (_, token) => {
            return new Promise<string>(async (resolve, reject) => {
                token.onCancellationRequested(() => reject("CANCEL"));
                try {
                    const path = await which("helios-ls");
                    resolve(path);
                } catch (_) {
                    reject("NO_EXECUTABLE_FOUND");
                }
            });
        }
    );
}
