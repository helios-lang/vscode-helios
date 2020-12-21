import * as fs from "fs";
import * as vs from "vscode";
import which = require("which");
import { basename, join } from "path";

const HELIOS_LS_EXECUTABLE = "helios-ls";

/**
 * Attempts to get the path of the language server.
 *
 * @param context The extension context to get the global storage URI.
 */
export async function getServerPath(
    context: vs.ExtensionContext
): Promise<string> {
    const config = vs.workspace.getConfiguration("helios");
    let serverPath = config.get<string>("serverPath") || "";

    if (!(await isPathValid(serverPath))) {
        let response = await vs.window.showInformationMessage(
            serverPath === ""
                ? "The path to the Helios-LS executable is not configured."
                : "The configured path to the Helios-LS executable is invalid.",
            "Quit extension",
            "Find it for me"
        );

        if (response === "Find it for me") {
            // We won't handle exceptions here
            serverPath = await locateExecutable(context);

            let response = await vs.window.showInformationMessage(
                "Successfully found the Helios-LS executable. \
                 Would you like to update the configuration with its location?",
                "No",
                "Yes"
            );

            if (response === "Yes") {
                config.update("serverPath", serverPath);
            }
        } else {
            return Promise.reject("HELIOS_ABORT");
        }
    }

    return serverPath;
}

/**
 * Determines if the given path is valid.
 *
 * @param path The path to check.
 */
async function isPathValid(path: string): Promise<boolean> {
    if (path === "") {
        return Promise.resolve(false);
    } else {
        const checkIfValid = (stats: fs.Stats) => {
            return stats.isFile() && basename(path) === HELIOS_LS_EXECUTABLE;
        };
        return await fs.promises
            .stat(path)
            .then(checkIfValid)
            .catch(_ => false);
    }
}

/**
 * Attempts to locate the executable of the Helios language server.
 *
 * This function will first search for the `helios-ls` executable in the
 * extension's global storage path. If it doesn't find it there, it will then
 * search for it in the PATH (using the [`which`] Node module).
 *
 * If neither of those operations succeed, that means either the user doesn't
 * have it installed or they may have placed the executable in some arbitrary
 * location (in which case, they should manually set it in the
 * `helios.serverPath` configuration).
 *
 * [`which`]: https://www.npmjs.com/package/which
 *
 * @param context The extension context to get the global storage URI.
 */
async function locateExecutable(context: vs.ExtensionContext): Promise<string> {
    let globalStorageUri = context.globalStorageUri;
    let executablePath = join(globalStorageUri.fsPath, HELIOS_LS_EXECUTABLE);

    return await fs.promises
        .stat(executablePath)
        .then(_ => executablePath)
        .catch(_ => {
            return vs.window.withProgress(
                {
                    location: vs.ProgressLocation.Notification,
                    title: "Locating the Helios-LS executable...",
                    cancellable: true,
                },
                async (_, token) => {
                    return new Promise<string>(async (resolve, reject) => {
                        token.onCancellationRequested(() =>
                            reject("HELIOS_ABORT")
                        );
                        try {
                            const path = await which(HELIOS_LS_EXECUTABLE);
                            resolve(path);
                        } catch {
                            reject("HELIOS_NO_EXECUTABLE_FOUND");
                        }
                    });
                }
            );
        });
}
