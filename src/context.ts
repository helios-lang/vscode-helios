import * as vs from "vscode";
import * as lc from "vscode-languageclient";

/**
 * The type of a recognized callback to be invoked when a command is executed.
 */
export type Callback = (state: HeliosContext) => void;

/**
 * The current status of the language server (which will be displayed in the
 * editor window's status bar).
 */
export type Status = "loading" | "ready" | "error";

/**
 * Representation of the current client context of the extension. It holds
 * references to information used commonly throughout the client such as the
 * path to the language server or the status bar item in the editor window.
 */
export class HeliosContext {
    private constructor(
        private readonly eContext: vs.ExtensionContext,
        readonly serverPath: string,
        readonly client: lc.LanguageClient,
        private readonly status: vs.StatusBarItem
    ) {}

    /**
     * Initializes and returns a new client context to be shared.
     *
     * This static method starts the provided language client before returning
     * an instance of `HeliosContext`. This instance can then be used by
     * commands to get the path to the language server or set the state of the
     * status bar with the `setStatus` method.
     *
     * @param eContext A reference to the extension context.
     * @param serverPath The path to the Helios-LS executable.
     * @param client A reference to the language client.
     */
    public static async activate(
        eContext: vs.ExtensionContext,
        serverPath: string,
        client: lc.LanguageClient
    ): Promise<HeliosContext> {
        const alignment = vs.StatusBarAlignment.Left;
        const status = vs.window.createStatusBarItem(alignment);
        status.text = "$(check) Helios-LS: Ready";
        status.tooltip = "Helios-LS is ready for tasks";
        status.show();

        const state = new HeliosContext(eContext, serverPath, client, status);
        state.pushDisposable(client.start());
        state.pushDisposable(status);
        state.setLanguageConfiguration();

        await client.onReady();
        return state;
    }

    /**
     * Sets the status of the status bar with the given `Status` value and an
     * optional message to append after the extension's name.
     *
     * @param status The status type.
     * @param message An optional message.
     */
    public setStatus(status: Status, message: string | undefined = undefined) {
        const name = "Helios-LS";
        switch (status) {
            case "ready":
                var message_ = message || "Ready";
                this.status.text = `$(check) ${name}: ${message_}`;
                this.status.tooltip = `${name} is ready for tasks`;
                break;
            case "loading":
                var message_ = message || "Loading...";
                this.status.text = `$(sync~spin) ${name}: ${message_}`;
                this.status.tooltip = `${name} is busy`;
                break;
            case "error":
                var message_ = message || "Error";
                this.status.text = `$(error) ${name}: ${message_}`;
                this.status.tooltip = `${name} has encountered an error`;
                break;
        }
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

    private setLanguageConfiguration() {
        const disposable = vs.languages.setLanguageConfiguration("helios", {
            onEnterRules: [
                {
                    beforeText: /^\s*-{2}\|/,
                    action: {
                        indentAction: vs.IndentAction.None,
                        appendText: "--| ",
                    },
                },
            ],
        });

        this.pushDisposable(disposable);
    }

    private pushDisposable(disposable: vs.Disposable) {
        this.eContext.subscriptions.push(disposable);
    }
}
