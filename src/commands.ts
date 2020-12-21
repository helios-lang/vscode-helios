import { spawnSync } from "child_process";
import * as vs from "vscode";

import { State } from "./state";

/**
 * Shows the syntax tree of the current file.
 */
export async function showSyntaxTree(_: State) {
    vs.window.showInformationMessage("Not yet implemented.");
}

/**
 * Shows the current version of the language server.
 */
export async function showVersion(state: State) {
    state.setStatus("loading", "Retrieving version...");
    const res = spawnSync(state.serverPath, ["--version"], {
        encoding: "utf8",
    });

    state.setStatus("ready");
    const version = res.stdout.slice("helios-ls ".length).trim();
    vs.window.showInformationMessage(`Helios-LS ${version}`);
}
