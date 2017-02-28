/**
 * Part of sparrow project.
 *
 * @copyright  Copyright (C) 2017 ${ORGANIZATION}.
 * @license    __LICENSE__
 */
import Utilities from "../util/utilities";
import Sparrow from "../sparrow";

export default class PromiseAdapter {
  constructor (callback) {
    const deferred = Sparrow.$.Deferred();
    const resolve = deferred.resolve;
    const reject = deferred.reject;

    callback(resolve, reject);

    this.defer = Sparrow.$.when(deferred);
  }

  then (onFulfilled, onRejected) {
    return this.defer.then(onFulfilled, onRejected);
  }

  catch (onRejected) {
    return this.defer.catch(onRejected);
  }

  static all (promises) {
    return Sparrow.$.when(...promises);
  }

  static race (promises) {
    let _resolve;

    return new PromiseAdapter(resolve => {
      _resolve = resolve;

      promises.map(promise => {
        promise.then((v) => {
          if (_resolve) {
            resolve(v);
          }
        });
      });
    });
  }

  static resolve (object) {
    if (object instanceof PromiseAdapter) {
      object.defer.resolve();

      return object;
    }

    const promise = new PromiseAdapter(resolve => resolve(object));

    if (Utilities.isObject(object) && object.hasOwnProperty('then')) {
      return promise.then(object.then);
    }

    return promise;
  }

  static reject (reason) {
    return new PromiseAdapter((resolve, reject) => reject(reason));
  }
}
