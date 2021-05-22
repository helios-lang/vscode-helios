import * as lc from 'vscode-languageclient';
import * as vs from 'vscode';

import * as commands from './commands';
import { Callback, HeliosContext } from './context';
import { HeliosError, HeliosErrorCode, getServerPath } from './utils';

/**
 * The global `HeliosContext` instance.
 */
let hc: HeliosContext | undefined;

/**
 * Recognised commands for this extension.
 */
const cmds: { [key: string]: Callback } = {
  'helios.showSyntaxTree': commands.showSyntaxTree,
  'helios.version': commands.showVersion,
};

/**
 * This function is called when the extension is activated.
 *
 * @param ec The extension context.
 */
export async function activate(ec: vs.ExtensionContext) {
  const alignment = vs.StatusBarAlignment.Left;
  const status = vs.window.createStatusBarItem(alignment);
  status.text = '$(sync~spin) Helios-LS: Getting ready...';
  status.tooltip = 'Helios-LS is getting ready...';
  status.show();

  try {
    // TODO: Allow syntax highlighting even without language server
    const path = await getServerPath(ec);
    const client = createLanguageClient(path);
    hc = await HeliosContext.activate(ec, path, client, status);

    // Register command to restart server
    hc.registerCommand('helios.restartServer', async _ => {
      vs.window.showInformationMessage('Restarting Helios-LS...');
      await cleanUpAndDeactivate(ec);
      await activate(ec);
    });

    // Register the rest of the commands
    for (const cmd in cmds) {
      const handler = cmds[cmd];
      hc.registerCommand(cmd, handler);
    }

    // Detect changes to configuration
    vs.workspace.onDidChangeConfiguration(onDidChangeConfiguration);
  } catch (error) {
    if (error instanceof HeliosError) {
      if (error.code === HeliosErrorCode.CANCEL) {
        await vs.window.showErrorMessage(
          'Could not find the Helios-LS executable in time.',
          'Quit Extension'
        );
      } else if (error.code === HeliosErrorCode.NO_EXECUTABLE_FOUND) {
        status.text = '$(error) Helios-LS: Failed to initialize';
        status.tooltip = 'Helios-LS failed to initialize properly';
        await vs.window.showErrorMessage(
          'Unable to find the Helios-LS executable. Is it installed correctly?',
          'Quit Extension'
        );
      }

      // Deactivate extension
      await cleanUpAndDeactivate(ec);
      status.hide();
    } else {
      status.text = '$(error) Helios-LS: An error occurred';
      status.tooltip = 'Helios-LS has encountered an unexpected error';
      console.error(`An unexpected error occurred: ${error}`);
    }
  }
}

const configsRequiringReload = ['helios.serverPath'];

/**
 * Handler for when the user has changed a configuration in the workspace's
 * `settings.json` file. This function will only check Helios-specific options.
 *
 * @param event The configuration change event.
 */
async function onDidChangeConfiguration(event: vs.ConfigurationChangeEvent) {
  // Check if the changed option is one that requires a reload
  const changedOption = configsRequiringReload.find(option =>
    event.affectsConfiguration(option)
  );

  if (!changedOption) return;

  const response = await vs.window.showWarningMessage(
    `Changing '${changedOption}' requires a reload.`,
    'Reload Now'
  );

  if (response === 'Reload Now') {
    await vs.commands.executeCommand('workbench.action.reloadWindow');
  }
}

/**
 * Creates a new language client and establishes the client and server.
 *
 * @param serverPath The path to the language server executable.
 */
function createLanguageClient(serverPath: string): lc.LanguageClient {
  let serverOptions: lc.ServerOptions = {
    run: {
      command: serverPath,
      transport: lc.TransportKind.stdio,
    },
    debug: {
      command: serverPath,
      transport: lc.TransportKind.stdio,
      options: {
        env: {
          RUST_BACKTRACE: 1,
          RUST_LOG: 'helios_ls=trace',
        },
      },
    },
  };

  let clientOptions: lc.LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'helios' },
      { scheme: 'untitled', language: 'helios' },
    ],
  };

  return new lc.LanguageClient(
    'helios-ls',
    'Helios-LS',
    serverOptions,
    clientOptions
  );
}

/**
 * Disposes all the subscriptions of the extension before stopping the client
 * and deactivating the extension.
 *
 * @param ec The extension context to dispose subscriptions from.
 */
async function cleanUpAndDeactivate(ec: vs.ExtensionContext) {
  while (ec.subscriptions.length > 0) {
    try {
      ec.subscriptions.pop()!.dispose();
    } catch (error) {
      console.error(`Failed to dispose: ${error}`);
    }
  }

  await deactivate();
}

/**
 * This function is called when the extension is deactivated.
 */
export async function deactivate() {
  await hc?.client.stop();
  hc = undefined;
}
