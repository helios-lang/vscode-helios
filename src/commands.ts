import { spawnSync } from "child_process";
import * as vs from "vscode";

import { HeliosContext } from "./context";

/**
 * Shows the syntax tree of the current file.
 */
export function showSyntaxTree(_: HeliosContext) {
    vs.window.showInformationMessage("Not yet implemented.");
}

/**
 * Shows the current version of the language server.
 */
export function showVersion(context: HeliosContext) {
    context.setStatus("loading", "Retrieving version...");
    const response = spawnSync(context.path, ["--version"], {
        encoding: "utf8",
    });

    const version = response.stdout.slice("helios-ls ".length).trim();
    vs.window.showInformationMessage(`Helios-LS ${version}`);
    context.setStatus("ready");
}
