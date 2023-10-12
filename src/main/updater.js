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
* @type {function(new:Updater)}
* @description Updater to use at the end
*/
let updater = DummyUpdater

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

updater = ElectronUpdater

} catch {
  console.log('Built without electron-updater')
}

/**
 * @returns {boolean} when enable updater or not
 * @description enabled if AppIamge or current platform not linux like and unset DISABLE_MIRU_UPDATER.
 */
function isEnabled() {
  /**
   * @type {typeof process.platform[]}
   */
  const linuxLike = [
    'linux',
    'freebsd',
    'openbsd'
  ]

  return !!process.env.APPIMAGE || !linuxLike.includes(process.platform) && !process.env.DISABLE_MIRU_UPDATER
}

/**
 * @type {function(new:Updater)}
 * @description If updater disabled always return DummyUpdater otherwise return ElectonUpdater if built with electron-updater support
 */
export default isEnabled() ? updater : DummyUpdater
