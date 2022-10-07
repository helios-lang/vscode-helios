import * as fs from 'fs';
import * as vs from 'vscode';
import * as which from 'which';
import { basename, join } from 'path';

export const LS_DISPLAY_NAME = 'Helios-LS';
export const LS_EXECUTABLE = 'helios-ls';
const FIND_EXECUTABLE_TIMEOUT = 5000;

export enum HeliosErrorCode {
  /**
   * The client has encountered a serious error.
   */
  ABORT = 'HELIOS_ABORT',
  /**
   * The client has been requested to stop the current task.
   */
  LS_SEARCH_CANCELED = 'HELIOS_LS_SEARCH_CANCELED',
  /**
   * The client was unable to find the `helios-ls` executable.
   */
  LS_NOT_FOUND = 'HELIOS_LS_NOT_FOUND',
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
  const givenServerPath = config.get<string>('serverPath')?.trim();

  // If the provided server path is given and valid, return it
  if (givenServerPath && (await isValidServerPath(givenServerPath))) {
    return givenServerPath;
  }

  // Otherwise if the provided server path cannot be found in the given path OR
  // the server path has not been configured, request to find it for the user
  const isServerPathGiven = Boolean(givenServerPath);

  const response = await vs.window.showInformationMessage(
    isServerPathGiven
      ? `The configured path to the ${LS_DISPLAY_NAME} executable is invalid.`
      : `The path to the ${LS_DISPLAY_NAME} executable has not been configured.`,
    'Find It For Me',
    'Dismiss'
  );

  if (response === 'Find It For Me') {
    const serverPath = await locateExecutable(ec);
    const response = await vs.window.showInformationMessage(
      `Successfully found the ${LS_DISPLAY_NAME} executable. Would you like us to update the configuration for you?`,
      'No',
      'Yes'
    );

    if (response === 'Yes') config.update('serverPath', serverPath);
    return serverPath;
  }

  throw new HeliosError(HeliosErrorCode.LS_NOT_FOUND);
}

/**
 * Determines if the given path to the language server is valid.
 *
 * @param path The path to the `helios-ls` executable.
 */
export async function isValidServerPath(path: string): Promise<boolean> {
  try {
    const stats = await fs.promises.stat(path);
    return stats.isFile() && basename(path) === LS_EXECUTABLE;
  } catch (error) {
    return false;
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
  try {
    let executablePath = join(ec.globalStorageUri.fsPath, LS_EXECUTABLE);
    await fs.promises.stat(executablePath); // Throws if it is not valid
    return executablePath;
  } catch (error) {
    return await vs.window.withProgress(
      {
        location: vs.ProgressLocation.Notification,
        title: `Locating the ${LS_DISPLAY_NAME} executable...`,
        cancellable: true,
      },
      async (progress, token) => {
        return new Promise<string>(async (resolve, reject) => {
          progress.report({ increment: 25 });
          token.onCancellationRequested(() => {
            console.warn('The task has been cancelled');
            return reject(new HeliosError(HeliosErrorCode.LS_SEARCH_CANCELED));
          });

          try {
            // We'll abort this task if it takes longer than
            // `FIND_EXECUTABLE_TIMEOUT` milliseconds.
            setTimeout(() => {
              reject(new HeliosError(HeliosErrorCode.LS_SEARCH_CANCELED));
            }, FIND_EXECUTABLE_TIMEOUT);

            progress.report({ increment: 50 });
            const path = await which(LS_EXECUTABLE);

            progress.report({ increment: 100 });
            return resolve(path);
          } catch (error) {
            console.error(`Failed to find executable: ${error}`);
            return reject(new HeliosError(HeliosErrorCode.LS_NOT_FOUND));
          }
        });
      }
    );
  }
}
