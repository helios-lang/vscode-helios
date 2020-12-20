import * as lc from "vscode-languageclient";
import * as vs from "vscode";

/**
 * Describes all the configurations available for this extension.
 */
export interface HLSConfiguration {
    /** The path to the Helios compiler executable. */
    heliosPath: string;
}

/**
 * A class that represents the client of the language server.
 */
export default class HLSClient {
    private languageClient: lc.LanguageClient | undefined;
    private configuration: HLSConfiguration;
    private disposables: vs.Disposable[];

    /**
     * Construct a new `HLSClient` with the given configuration.
     */
    public constructor(configuration: HLSConfiguration) {
        this.languageClient = undefined;
        this.configuration = configuration;
        this.disposables = [];
    }

    /**
     * Starts the language server client.
     *
     * This method will summon the Helios compiler with the "ide" argument to
     * start the language server. It will also register commands that are
     * associated with this extension.
     */
    public start() {
        console.log("Starting HLS...");

        let serverOptions: lc.Executable = {
            command: this.configuration.heliosPath,
            args: ["ide"],
            options: {
                env: { RUST_BACKTRACE: 1, RUST_LOG: "helios=trace" },
            },
        };

        let clientOptions: lc.LanguageClientOptions = {
            documentSelector: [
                { scheme: "file", language: "helios" },
                { scheme: "untitled", language: "helios" },
            ],
        };

        this.languageClient = new lc.LanguageClient(
            "HLS",
            "Helios Language Server",
            serverOptions,
            clientOptions
        );

        this.disposables.push(this.languageClient.start());
    }

    /**
     * Stops the language server client.
     *
     * This should be called when the extension is deactivated.
     */
    public async stop() {
        console.log("Stopping HLS...");
        await this.languageClient?.stop();
        this.disposables.forEach(disposable => disposable.dispose());
    }
}
