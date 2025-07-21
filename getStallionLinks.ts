/**
 * getStallionLinks.ts
 *
 * function：get all links form stallion-profile
**/

'use strict';

// name space
import { myConst } from './consts/globalvariables';

// read modules
import { writeFile } from 'node:fs/promises'; // file system
import { Scrape } from './class/ScrapeCore0721'; // scraper
import Logger from './class/Logger'; // logger
import mkdir from './class/Mkdir0721'; // mdkir

// loggeer instance
const logger: Logger = new Logger(myConst.APP_NAME);
// scraper
const scraper = new Scrape(logger);
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
    // make dir
    await mkdirManager.mkDirAll(['./log', './txt']);
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
    // combined data
    const urlStr: string = finalUrlArray.join('\n');
    // write file
    await writeFile(`./txt/${fileName}.txt`, urlStr);
    logger.info('getStallionLinks: txt file output finished.');
    // close browser
    await scraper.doClose();
    process.exit(0);

  } catch (e) {
    logger.error(e);
  }
})();
