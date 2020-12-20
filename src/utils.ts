import * as vs from "vscode";
import * as fs from "fs";
import which = require("which");

/**
 * Attempt to get the path of the language server.
 *
 * This function will first check if there is a valid path in the `serverPath`
 * configuration. Otherwise, it will use the first executable it finds in the
 * PATH. This function will throw an error if neither of the previous steps were
 * successful.
 */
export async function getServerPath(): Promise<string> {
    const config = vs.workspace.getConfiguration("helios");
    let serverPath = config.serverPath;

    if (serverPath === undefined || !(await isPathValid(serverPath))) {
        let choice = await vs.window.showInformationMessage(
            "The configured language server path you provided is invalid. Would you like to locate it?",
            "Quit server",
            "Find it for me instead"
        );

        if (choice === "Find it for me instead") {
            serverPath = await locateExecutable();
            let choice = await vs.window.showInformationMessage(
                "Successfully found the Helios language server executable. Would you like to update the configuration with the new path?",
                "No",
                "Yes"
            );
        }
    }

    return serverPath;
}

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

async function locateExecutable(): Promise<string> {
    const path = vs.window.withProgress(
        { location: vs.ProgressLocation.Notification },
        async (progress, token) => {
            token.onCancellationRequested(() => Promise.reject("Cancelled"));

            progress.report({ message: "Locating executable..." });
            const path = await which("helios-ls");
            if (path !== null) {
                console.log(`Found path to server executable: ${path}`);
                return Promise.resolve(path);
            } else {
                // Todo...
                return Promise.reject("Failed to find executable");
            }
        }
    );

    return path;
}
