import * as fs from 'fs';
import * as vs from 'vscode';
import * as which from 'which';
import { basename, join } from 'path';

const HELIOS_LS_EXECUTABLE = 'helios-ls';
const FIND_EXECUTABLE_TIMEOUT = 5000;

export enum HeliosErrorCode {
  ABORT = 'HELIOS_ABORT',
  CANCEL = 'HELIOS_CANCEL',
  NO_EXECUTABLE_FOUND = 'HELIOS_NO_EXECUTABLE_FOUND',
}

export class HeliosError extends Error {
  constructor(readonly code: HeliosErrorCode) {
    super(code);
  }
}

/**
 * Attempts to get the path of the language server.
 *
 * @param ec The extension context to get the global storage URI.
 */
export async function getServerPath(ec: vs.ExtensionContext): Promise<string> {
  const config = vs.workspace.getConfiguration('helios');
  let serverPath = config.get<string>('serverPath') || '';

  if (!(await isPathValid(serverPath))) {
    const response = await vs.window.showInformationMessage(
      serverPath.length === 0
        ? 'The path to the Helios-LS executable is not configured.'
        : 'The configured path to the Helios-LS executable is invalid.',
      'Quit Extension',
      'Find It for Me'
    );

    if (response === 'Find It for Me') {
      // We won't handle exceptions here
      serverPath = await locateExecutable(ec);
      const response = await vs.window.showInformationMessage(
        'Successfully found the Helios-LS executable. Would you like us to \
         update the configuration for you?',
        'No',
        'Yes'
      );

      if (response === 'Yes') config.update('serverPath', serverPath);
    } else {
      throw new HeliosError(HeliosErrorCode.ABORT);
    }
  }

  return serverPath;
}

/**
 * Determines if the given path is valid.
 *
 * @param path The path to check.
 */
export async function isPathValid(path: string): Promise<boolean> {
  if (path.length === 0) {
    return false;
  } else {
    try {
      const stats = await fs.promises.stat(path);
      return stats.isFile() && basename(path) === HELIOS_LS_EXECUTABLE;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Attempts to locate the executable of the Helios language server.
 *
 * This function will first search for the `helios-ls` executable in the
 * extension's global storage path. If it doesn't find it there, it will then
 * search for it in the PATH (using the [`which`] package).
 *
 * If neither of those operations succeed, that means either the user doesn't
 * have it installed or they may have placed the executable in some arbitrary
 * location (in which case, they should manually set it in the
 * `helios.serverPath` configuration).
 *
 * [`which`]: https://www.npmjs.com/package/which
 *
 * @param ec The extension context to get the global storage URI.
 */
async function locateExecutable(ec: vs.ExtensionContext): Promise<string> {
  let globalStorageUri = ec.globalStorageUri;
  let executablePath = join(globalStorageUri.fsPath, HELIOS_LS_EXECUTABLE);

  try {
    await fs.promises.stat(executablePath); // Throws if it isn't not valid
    return executablePath;
  } catch (error) {
    return await vs.window.withProgress(
      {
        location: vs.ProgressLocation.Notification,
        title: 'Locating the Helios-LS executable...',
        cancellable: true,
      },
      async (progress, token) => {
        return new Promise<string>(async (resolve, reject) => {
          progress.report({ increment: 25 });
          token.onCancellationRequested(() => {
            console.warn('The task has been cancelled');
            return reject(new HeliosError(HeliosErrorCode.CANCEL));
          });

          try {
            // We'll abort this task if it takes longer than 5 seconds.
            setTimeout(() => {
              reject(new HeliosError(HeliosErrorCode.CANCEL));
            }, 5000);

            progress.report({ increment: 50 });
            const path = await which(HELIOS_LS_EXECUTABLE);
            progress.report({ increment: 100 });
            return resolve(path);
          } catch (error) {
            console.error(`Failed to find executable: ${error}`);
            return reject(new HeliosError(HeliosErrorCode.NO_EXECUTABLE_FOUND));
          }
        });
      }
    );
  }
}
