/**
 * getStallion.ts
 *
 * function：get all form stallion-profile
**/

'use strict';

/// Constants
// name space
import { myConst, mySelector } from './consts/globalvariables';

/// Modules
import * as path from 'node:path'; // path
import { existsSync } from 'node:fs'; // file system
import { readFile, writeFile } from 'node:fs/promises'; // filesystem
import { BrowserWindow, app, ipcMain, Tray, Menu, nativeImage } from 'electron'; // electron
import NodeCache from "node-cache"; // for cache
import ELLogger from './class/ElLogger'; // logger
import { Scrape } from './class/ElScrapeCore0810'; // scraper
import Dialog from './class/ElDialog0721'; // dialog
import CSV from './class/ElCsv0414'; // csvmaker

// desktop path
const dir_home =
  process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'] ?? '';
const dir_desktop = path.join(dir_home, 'Desktop');
// log level
const loglevel: string = myConst.LOG_LEVEL ?? 'all';
// loggeer instance
const logger: ELLogger = new ELLogger(myConst.COMPANY_NAME, myConst.APP_NAME, loglevel);
// dialog instance
const dialogMaker: Dialog = new Dialog(logger);
// csv instance
const csvMaker = new CSV(myConst.CSV_ENCODING, logger);
// cache
const cacheMaker: NodeCache = new NodeCache();
// scraper instance
const puppScraper: Scrape = new Scrape(logger);
// number array
const makeNumberRange = (start: number, end: number): number[] => [...new Array(end - start).keys()].map(n => n + start);


/// interfaces
// window option
interface windowOption {
  width: number; // window width
  height: number; // window height
  defaultEncoding: string; // default encode
  webPreferences: Object; // node
}

/*
 main
*/
// main window
let mainWindow: any = null;
// quit flg
let isQuiting: boolean;
// root path
let globalRootPath: string;
// production
if (!myConst.DEVMODE) {
  globalRootPath = path.join(path.resolve(), 'resources')
  // development
} else {
  globalRootPath = path.join(__dirname, '..');
}

// make window
const createWindow = async (): Promise<void> => {
  try {
    // window options
    const windowOptions: windowOption = {
      width: myConst.WINDOW_WIDTH, // window width
      height: myConst.WINDOW_HEIGHT, // window height
      defaultEncoding: myConst.DEFAULT_ENCODING, // encoding
      webPreferences: {
        nodeIntegration: false, // node
        contextIsolation: true, // isolate
        preload: path.join(__dirname, 'preload.js'), // preload
      }
    }
    // Electron window
    mainWindow = new BrowserWindow(windowOptions);
    // hide menubar
    mainWindow.setMenuBarVisibility(false);
    // load index.html
    await mainWindow.loadFile(path.join(globalRootPath, 'www', 'index.html'));
    // ready
    mainWindow.once('ready-to-show', async () => {
      // dev mode
      if (!app.isPackaged) {
        //mainWindow.webContents.openDevTools();
      }
    });

    // minimize and stay on tray
    mainWindow.on('minimize', (event: any): void => {
      // cancel double click
      event.preventDefault();
      // hide window
      mainWindow.hide();
      // return false
      event.returnValue = false;
    });

    // close
    mainWindow.on('close', (event: any): void => {
      // not quitting
      if (!isQuiting) {
        // except for apple
        if (process.platform !== 'darwin') {
          // quit
          app.quit();
          // return false
          event.returnValue = false;
        }
      }
    });

    // when close
    mainWindow.on('closed', (): void => {
      // destryo window
      mainWindow.destroy();
    });

  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      // show error
      dialogMaker.showmessage('error', `${e.message}`);
    }
  }
};

// enable sandbox
app.enableSandbox();

// avoid double ignition
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // show error message
  dialogMaker.showmessage('error', 'Double ignition. break.');
  // close app
  app.quit();
}

// ready
app.on('ready', async () => {
  logger.info('app: electron is ready');
  // make window
  createWindow();
  // menu label
  let displayLabel: string = '';
  // close label
  let closeLabel: string = '';
  // txt path
  const languageTxtPath: string = path.join(globalRootPath, "assets", "language.txt");
  // not exists
  if (!existsSync(languageTxtPath)) {
    logger.debug('app: making txt ...');
    // make txt file
    await writeFile(languageTxtPath, 'japanese');
  }
  // get language
  const language = await readFile(languageTxtPath, "utf8");
  logger.debug(`language is ${language}`);
  // switch on language
  if (language == 'japanese') {
    // set menu label
    displayLabel = '表示';
    // set close label
    closeLabel = '閉じる';
  } else {
    // set menu label
    displayLabel = 'show';
    // set close label
    closeLabel = 'close';
  }
  // cache
  cacheMaker.set('language', language);
  // app icon
  const icon: Electron.NativeImage = nativeImage.createFromPath(
    path.join(globalRootPath, 'assets/keiba128.ico')
  );
  // tray
  const mainTray: Electron.Tray = new Tray(icon);
  // contextMenu
  const contextMenu: Electron.Menu = Menu.buildFromTemplate([
    // show
    {
      label: displayLabel,
      click: () => {
        mainWindow.show();
      },
    },
    // close
    {
      label: closeLabel,
      click: () => {
        isQuiting = true;
        app.quit();
      },
    },
  ]);
  // set contextMenu
  mainTray.setContextMenu(contextMenu);
  // show on double click
  mainTray.on('double-click', () => mainWindow.show());
});

// activated
app.on('activate', async () => {
  // no window
  if (BrowserWindow.getAllWindows().length === 0) {
    // reboot
    createWindow();
  }
});

// quit button
app.on('before-quit', () => {
  // flg on
  isQuiting = true;
});

// closed
app.on('window-all-closed', () => {
  logger.info('app: close app');
  // quit
  app.quit();
});

/*
 IPC
*/
// ready
ipcMain.on("beforeready", async (_, __) => {
  logger.info("app: beforeready app");
  // language
  const language = cacheMaker.get('language') ?? '';
  // be ready
  mainWindow.send("ready", language);
});


// main
// get stallion data
ipcMain.on('scrape', async (event: any, arg: any) => {
  try {
    logger.info('scrape: scraping start.');
    // finish message
    let endmessage: string;
    // status message
    let statusmessage: string;
    // texts
    let urlArray: string[][] = [];
    // str variables
    let strArray: any[] = [];
    // language
    const language = cacheMaker.get('language') ?? '';
    // initialize
    await puppScraper.init();

    // scraping loop
    for await (const i of makeNumberRange(1, 10)) {
      try {
        // texts
        let tmpUrlArray: string[] = [];
        // tmp url
        const tmpUrl: string = myConst.BASE_URL + String(i).padStart(2, '0') + '.html';
        // goto page
        await puppScraper.doGo(tmpUrl);
        // wait
        await puppScraper.doWaitFor(1000);
        // get data
        tmpUrlArray = await puppScraper.doMultiEval('a', 'href');
        // delete top data
        tmpUrlArray.shift();
        // delete bottom data
        tmpUrlArray.pop();
        // add to two-dimentional array
        urlArray.push(tmpUrlArray);

      } catch (err) {
        logger.error(err);
      }
    }
    logger.info('scrape: scraping has finished.');
    // filename
    const fileName: string = myConst.FOREIGN_URL;
    // tmp url
    const foreignUrl: string = myConst.BASE_URL + fileName + '.html';
    // goto page
    await puppScraper.doGo(foreignUrl);
    // wait
    await puppScraper.doWaitFor(1000);
    // get data
    const foreignUrlArray: string[] = await puppScraper.doMultiEval('a', 'href');
    // add to two-dimentional array
    urlArray.push(foreignUrlArray);
    // final array
    const finalUrlArray: string[] = urlArray[0].flat();
    // delete last one
    finalUrlArray.pop();

    // loop urls
    for await (const url of finalUrlArray) {
      logger.silly(`scraping...${url}`);
      // goto stallion-profile
      await puppScraper.doGo(url);
      // horse header
      let myHorseObj: { [key: string]: string } = {
        horsename: '',
        birthday: '',
        country: '',
        color: '',
        service: '',
        win: '',
        father: '',
        mother: '',
        motherfather: '',
        inbreed: '',
        cropwin: '',
        cropwinnative: '',
      };

      // loop in selectors
      for await (const i of makeNumberRange(0, 11)) {
        // result
        const result: string = await puppScraper.doSingleEval(mySelector.SELECTORS[i], 'textContent');
        // get into array
        myHorseObj[myConst.SHEET_TITLES[i]] = result;

      }
      // switch on language
      if (language == 'japanese') {
        // set finish message
        statusmessage = '種牡馬取得中...';
      } else {
        // set finish message
        statusmessage = 'Getting stallions...';
      }
      // URL
      event.sender.send('statusUpdate', {
        status: statusmessage,
        target: url
      });
      // push to tmp array
      strArray.push(myHorseObj);
    }
    // csv file name
    const csvFileName: string = (new Date).toISOString().replace(/[^\d]/g, '').slice(0, 14);
    // desktop path
    const filePath: string = path.join(dir_desktop, csvFileName + '.csv');
    // write data
    await csvMaker.makeCsvData(strArray, myConst.SHEET_TITLES, filePath);
    // switch on language
    if (language == 'japanese') {
      // set finish message
      endmessage = myConst.FINISHED_MESSAGE_JA;
    } else {
      // set finish message
      endmessage = myConst.FINISHED_MESSAGE_EN;
    }
    // end message
    dialogMaker.showmessage('info', endmessage);
    logger.info('sire: getsire completed.');

    // close browser
    await puppScraper.doClose();
    process.exit(0);

  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      // error message
      dialogMaker.showmessage('error', e.message);
    }
  }
});

// exit
ipcMain.on('exitapp', async () => {
  try {
    logger.info('ipc: exit mode');
    // title
    let questionTitle: string = '';
    // message
    let questionMessage: string = '';
    // language
    const language = cacheMaker.get('language') ?? 'japanese';
    // japanese
    if (language == 'japanese') {
      questionTitle = '終了';
      questionMessage = '終了していいですか';
    } else {
      questionTitle = 'exit';
      questionMessage = 'exit?';
    }
    // selection
    const selected: number = dialogMaker.showQuetion('question', questionTitle, questionMessage);

    // when yes
    if (selected == 0) {
      // close
      app.quit();
    }

  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      // error message
      dialogMaker.showmessage('error', e.message);
    }
  }
});