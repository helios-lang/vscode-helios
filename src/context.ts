import * as vs from "vscode";
import * as lc from "vscode-languageclient";

/**
 * The type of a recognized callback to be invoked when a command is executed.
 */
export type Callback = (context: HeliosContext) => void;

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
        private readonly ec: vs.ExtensionContext,
        readonly path: string,
        readonly client: lc.LanguageClient,
        private readonly status: vs.StatusBarItem
    ) {}

    /**
     * Initializes and returns a new `HeliosContext` to be shared.
     *
     * This static method starts the provided language server client before
     * returning an instance of `HeliosContext`.
     *
     * @param ec A reference to the extension context.
     * @param path The path to the Helios-LS executable.
     * @param client A reference to the language server client.
     * @param status A reference to the extension's status bar item.
     */
    public static async activate(
        ec: vs.ExtensionContext,
        path: string,
        client: lc.LanguageClient,
        status: vs.StatusBarItem
    ): Promise<HeliosContext> {
        const hc = new HeliosContext(ec, path, client, status);

        hc.pushDisposable(client.start());
        hc.pushDisposable(status);
        hc.setLanguageConfiguration();

        try {
            await client.onReady();
            hc.setStatus("ready");
        } catch (error) {
            console.error(`Failed to get client ready: ${error}`);
            hc.setStatus("error");
        }

        return hc;
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
            case "ready": {
                const msg = message ?? "Ready";
                this.status.text = `$(check) ${name}: ${msg}`;
                this.status.tooltip = `${name} is ready for tasks`;
                break;
            }
            case "loading": {
                const msg = message ?? "Loading...";
                this.status.text = `$(sync~spin) ${name}: ${msg}`;
                this.status.tooltip = `${name} is busy`;
                break;
            }
            case "error": {
                const msg = message ?? "Error";
                this.status.text = `$(error) ${name}: ${msg}`;
                this.status.tooltip = `${name} has encountered an error`;
                break;
            }
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
                    beforeText: /^\s*#!/,
                    action: {
                        indentAction: vs.IndentAction.None,
                        appendText: "#! ",
                    },
                },
                {
                    beforeText: /^\s*#{2}/,
                    action: {
                        indentAction: vs.IndentAction.None,
                        appendText: "## ",
                    },
                },
            ],
            indentationRules: {
                increaseIndentPattern: /^.*(=>?|do|else|enum|of|record|then)\s*$/,
                decreaseIndentPattern: /^\s*(else)\s*$/,
            },
        });

        this.pushDisposable(disposable);
    }

    private pushDisposable(disposable: vs.Disposable) {
        this.ec.subscriptions.push(disposable);
    }
}
