/**
 * getStallion.ts
 *
 * function：get all form stallion-profile
**/

'use strict';

// name space
import { myConst, mySelector } from './consts/globalvariables';

// read modules
import { Scrape } from './class/ScrapeCore0721'; // scraper
import Logger from './class/Logger'; // logger
import CSV from './class/Csv0517'; // aggregator
import mkdir from './class/Mkdir0721'; // mdkir

// loggeer instance
const logger: Logger = new Logger(myConst.COMPANY_NAME, myConst.APP_NAME, 'info');
// scraper
const scraper = new Scrape(logger);
// aggregator
const csvMaker = new CSV(myConst.CSV_ENCODING, logger);
// mkdir
const mkdirManager = new mkdir(logger);
// number array
const makeNumberRange = (start: number, end: number): number[] => [...new Array(end - start).keys()].map(n => n + start);

// main
(async (): Promise<void> => {
  try {
    logger.info('getStallionLinks: scraping start.');
    // texts
    let urlArray: string[][] = [];
    // str variables
    let strArray: any[] = [];
    // make dir
    await mkdirManager.mkDir('csv');
    // initialize
    await scraper.init();

    // scraping loop
    for await (const i of makeNumberRange(1, 10)) {
      try {
        // texts
        let tmpUrlArray: string[] = [];
        // tmp url
        const tmpUrl: string = myConst.BASE_URL + String(i).padStart(2, '0') + '.html';
        // goto page
        await scraper.doGo(tmpUrl);
        // wait
        await scraper.doWaitFor(1000);
        // get data
        tmpUrlArray = await scraper.doMultiEval('a', 'href');
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
    logger.info('getStallionLinks: scraping has finished.');
    // filename
    const fileName: string = myConst.FOREIGN_URL;
    // tmp url
    const foreignUrl: string = myConst.BASE_URL + fileName + '.html';
    // goto page
    await scraper.doGo(foreignUrl);
    // wait
    await scraper.doWaitFor(1000);
    // get data
    const foreignUrlArray: string[] = await scraper.doMultiEval('a', 'href');
    // add to two-dimentional array
    urlArray.push(foreignUrlArray);
    // final array
    const finalUrlArray: string[] = urlArray.flat();
    // delete last one
    finalUrlArray.pop();

    // loop urls
    for await (const url of finalUrlArray) {
      logger.trace(`scraping...${url}`);
      // goto stallion-profile
      await scraper.doGo(url);
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
        const result: string = await scraper.doSingleEval(mySelector.SELECTORS[i], 'textContent');
        // get into array
        myHorseObj[myConst.SHEET_TITLES[i]] = result;

      }
      console.log(myHorseObj);
      // push to tmp array
      strArray.push(myHorseObj);
    }

    // csv file name
    const csvFileName: string = (new Date).toISOString().replace(/[^\d]/g, '').slice(0, 14);
    // filepath
    const filePath: string = `./csv/${csvFileName}.csv`;
    // write data
    await csvMaker.makeCsvData(strArray, myConst.SHEET_TITLES, filePath);

    // close browser
    await scraper.doClose();
    process.exit(0);

  } catch (e) {
    logger.error(e);
  }
})();

