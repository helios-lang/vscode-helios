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
 * A representation of the extension's context. It holds references to data
 * commonly shared throughout the client such as the language server path and
 * the status bar item in the editor window.
 */
export class HeliosContext {
    private constructor(
        private readonly eContext: vs.ExtensionContext,
        readonly serverPath: string,
        readonly client: lc.LanguageClient,
        private readonly statusBarItem: vs.StatusBarItem
    ) {}

    /**
     * Initializes and returns a new `HeliosContext` to be shared.
     *
     * This static method starts the provided language server client before
     * returning an instance of `HeliosContext`.
     *
     * @param eContext A reference to the extension context.
     * @param serverPath The path to the Helios-LS executable.
     * @param client A reference to the language server client.
     * @param statusBarItem A reference to the extension's status bar item.
     */
    public static async activate(
        eContext: vs.ExtensionContext,
        serverPath: string,
        client: lc.LanguageClient,
        statusBarItem: vs.StatusBarItem
    ): Promise<HeliosContext> {
        const hContext = new HeliosContext(
            eContext,
            serverPath,
            client,
            statusBarItem
        );

        hContext.pushDisposable(client.start());
        hContext.pushDisposable(statusBarItem);
        hContext.setLanguageConfiguration();

        await client
            .onReady()
            .then(_ => hContext.setStatus("ready"))
            .catch(_ => hContext.setStatus("error"));

        return hContext;
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
                this.statusBarItem.text = `$(check) ${name}: ${message_}`;
                this.statusBarItem.tooltip = `${name} is ready for tasks`;
                break;
            case "loading":
                var message_ = message || "Loading...";
                this.statusBarItem.text = `$(sync~spin) ${name}: ${message_}`;
                this.statusBarItem.tooltip = `${name} is busy`;
                break;
            case "error":
                var message_ = message || "Error";
                this.statusBarItem.text = `$(error) ${name}: ${message_}`;
                this.statusBarItem.tooltip = `${name} has encountered an error`;
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
