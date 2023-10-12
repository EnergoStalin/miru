import log from 'electron-log'
import { ipcMain } from 'electron'

/**
 * @typedef Updater
 * @prop { (window: import('electron').BrowserWindow) => void } update
 */

/**
 * @implements {Updater}
 */
class DummyUpdater {
  update() {}
}

/**
 * @implements {Updater}
 */
class NotifyPlatformUnsupported {
  /**
   * @param {import('electron').BrowserWindow} window
   */
  update(window) {
    // Wait window to show
    window.addListener('show', () => {
      window.webContents.send('update-platform-unsupported', true)
    })
  }
}

/**
* @type {Partial<Record<typeof process.platform, function(new:Updater)>>}
* @description Declarative map for platform specific updater bindings
*/
const platforms = {
 // Silently disable updates on linux like OS
 'linux': DummyUpdater,
 'freebsd': DummyUpdater,
 'openbsd': DummyUpdater,
}

// Try import electron updater if builded with it
try {
const { autoUpdater } = await import('electron-updater')

class Updater {
  /**
   * @param {import('electron').BrowserWindow} window
   */
  update(window) {
    log.transports.file.level = 'info'
    autoUpdater.logger = log
    ipcMain.on('update', () => {
      autoUpdater.checkForUpdatesAndNotify()
    })

    autoUpdater.checkForUpdatesAndNotify()
  }
}

/**
 * @implements {Updater}
 */
class ElectronUpdater extends Updater {
  /**
   * @param {import('electron').BrowserWindow} window
   */
  update(window) {
    super.update(window)
    autoUpdater.on('update-available', () => {
      window.webContents.send('update-available', true)
    })
    autoUpdater.on('update-downloaded', () => {
      window.webContents.send('update-downloaded', true)
    })
  }
}

// Enable updates on electron supported platforms https://www.electronjs.org/docs/latest/api/auto-updater#platform-notices
platforms['win32'] = ElectronUpdater;
platforms['darwin'] = ElectronUpdater;

} catch {
  // If builded without electron-updater
}

/**
 * @type {function(new:Updater)}
 */
export default platforms[process.platform] ?? NotifyPlatformUnsupported
