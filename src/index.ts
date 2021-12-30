import { app, BrowserWindow, session } from "electron";
import { registerAppProtocol } from "electron/utils/registerAppProtocol";
import { setupDevTools } from "electron/utils/setupDevTools";
import "electron/ipc";
import { IpcChannel } from "types/ipc";
import { Spotify } from "spotify";
require("dotenv").config();

if (require("electron-squirrel-startup")) {
	app.quit();
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

const isDevelopment = !app.isPackaged;
const appLock = app.requestSingleInstanceLock();

const WINDOW_WIDTH = 1350;
const WINDOW_HEIGHT = 900;
const DEVTOOLS_WIDTH = 500;

let mainWindow: BrowserWindow = null;

registerAppProtocol(app);
setupDevTools(app, DEVTOOLS_WIDTH);

const createWindow = (): void => {
	mainWindow = new BrowserWindow({
		height: WINDOW_HEIGHT,
		width: isDevelopment ? WINDOW_WIDTH + DEVTOOLS_WIDTH : WINDOW_WIDTH,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
		callback({
			responseHeaders: {
				...details.responseHeaders,
				"Content-Security-Policy": ["script-src 'self';image-src 'self'"],
			},
		});
	});

	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY).catch(console.error);
	mainWindow.setMenu(null);

	isDevelopment && mainWindow.webContents.openDevTools();
};

appLock || app.quit();

if (appLock) {
	app.on("second-instance", (event, commandLine) => {
		mainWindow.webContents.send(IpcChannel.spotifyAuth, Spotify.handleAuth(commandLine));

		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
	});

	app.whenReady().then(() => {
		createWindow();
	});
}

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
