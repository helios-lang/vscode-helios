import * as vs from "vscode";
import * as lc from "vscode-languageclient";

export type Callback = (state: HeliosState) => void;

export type Status = "loading" | "ready" | "error";

export class HeliosState {
    private constructor(
        private readonly context: vs.ExtensionContext,
        readonly serverPath: string,
        readonly client: lc.LanguageClient,
        private readonly statusBar: vs.StatusBarItem
    ) {}

    /**
     * Initializes and returns a new state to be shared.
     *
     * This static method starts the provided language client before returning
     * an instance of `HeliosState`. This instance can then be used by commands
     * to get the path to the language server or set the state of the status
     * bar with the `setStatus` method.
     *
     * @param context A reference to the extension context.
     * @param serverPath The path to the Helios-LS executable.
     * @param client A reference to the language client.
     */
    public static async activate(
        context: vs.ExtensionContext,
        serverPath: string,
        client: lc.LanguageClient
    ): Promise<HeliosState> {
        const statusBar = vs.window.createStatusBarItem(
            vs.StatusBarAlignment.Left
        );
        statusBar.text = "$(check) Helios-LS: Ready";
        statusBar.tooltip = "Helios-LS is ready for tasks";
        statusBar.show();

        const state = new HeliosState(context, serverPath, client, statusBar);
        state.pushDisposable(client.start());
        state.pushDisposable(statusBar);

        await client.onReady();
        return state;
    }

    public get subscriptions(): vs.Disposable[] {
        return this.context.subscriptions;
    }

    /**
     * Registers a new command to be associated with the extension.
     *
     * @param name The name of the command.
     * @param callback A callback to call when the command is invoked.
     */
    public registerCommand(name: string, callback: Callback) {
        const handler = () => callback(this);
        const disposable = vs.commands.registerCommand(name, handler);
        this.pushDisposable(disposable);
    }

    /**
     * Sets the status of the status bar with the given `Status` value and an
     * optional message to append after the extension's name.
     *
     * @param status The status type.
     * @param message An optional message.
     */
    public setStatus(status: Status, message: string | undefined = undefined) {
        switch (status) {
            case "ready":
                var message_ = message || "Ready";
                this.statusBar.text = `$(check) Helios-LS: ${message_}`;
                this.statusBar.tooltip = "Helios-LS is ready for tasks";
                break;
            case "loading":
                var message_ = message || "Loading...";
                this.statusBar.text = `$(sync~spin) Helios-LS: ${message_}`;
                this.statusBar.tooltip = "Helios-LS is busy";
                break;
            case "error":
                var message_ = message || "Error";
                this.statusBar.text = `$(error) Helios-LS: ${message_}`;
                this.statusBar.tooltip = "Helios-LS has encountered an error";
                break;
        }
    }

    private pushDisposable(disposable: vs.Disposable) {
        this.context.subscriptions.push(disposable);
    }
}
