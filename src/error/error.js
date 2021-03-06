/**
 * Part of ivia project.
 *
 * @copyright  Copyright (C) 2017 ${ORGANIZATION}.
 * @license    __LICENSE__
 */

export default class ErrorHandler {
  constructor (app) {
    this.app = app;
  }

  warn (message) {
    console.warn(this.format(message));
  }

  error (message) {
    console.error(this.format(message));
  }

  log (message) {
    console.log(this.format(message));
  }

  format (message) {
    return `[Ivia]: ${message}`;
  }
}
