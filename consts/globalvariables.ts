/**
 * globalvariables.ts
 **
 * function：global variables
**/

/** const */
export namespace myConst {
  export const COMPANY_NAME: string = 'nthree';
  export const APP_NAME: string = 'stallionscrape';
  export const LOG_LEVEL: string = 'info';
  export const CSV_ENCODING: string = 'SJIS';
  export const FOREIGN_URL: string = 'a-z';
  export const BASE_URL: string = 'http://keiba.no.coocan.jp/data/_index_';
  // header
  export const SHEET_TITLES: string[] = ['horsename', 'birthday', 'country', 'color', 'service', 'win', 'father', 'mother', 'motherfather', 'inbreed', 'cropwin', 'cropwinnative'];
}

export namespace mySelector {
  // target selector
  export const SELECTORS: string[] = ['title', 'table tr:nth-child(1) td', 'table tr:nth-child(2) td', 'table tr:nth-child(3)  td', 'table tr:nth-child(4) td', 'table tr:nth-child(8) td', 'table tr:nth-child(12) td', 'table tr:nth-child(13) td', 'table tr:nth-child(14) td', 'table tr:nth-child(15) td', 'table tr:nth-child(23) td', 'table tr:nth-child(24) td'];
}