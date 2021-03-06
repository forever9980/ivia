/**
 * Part of ivia project.
 *
 * @copyright  Copyright (C) 2017 {ORGANIZATION}. All rights reserved.
 * @license    The MIT License (MIT)
 */

import { ObserverFactory } from './observer/observer';
import Watcher from "./observer/watcher";
import Registry from "./util/registry";
import Scheduler from "./observer/scheduler";
import TaskQueue from "./observer/queue";
import ErrorHandler from "./error/error";
import Utilities, { nullFunction } from "./util/utilities";
import PromiseAdapter from "./promise/promise";
import EventHandler from "./event";
import FormHelper from "./dom/form";

/**
 * Default options.
 *
 * @type {Object}
 */
const defaultOptions = {
  data: {}
};

let uid = 0;

export default class Application {
  constructor ($) {
    this.id = ++uid;
    this.$ = $;
    this.watcher = null;
    this.watchers = [];
    this.currentWatcher = null;
    this.watcherStack = [];
    this.elements = {};

    this._isMounted = false;

    this.registry = new Registry(this, {
      'observerFactory': new ObserverFactory(this),
      'scheduler': new Scheduler(this),
      'error': new ErrorHandler,
      'event': new EventHandler(this)
    });
  }

  init(instance, options = {}) {
    this.options = this.$.extend({}, defaultOptions, options);
    this.data = options.data;
    this.instance = instance;

    // Push properties back to instance
    instance.$ = this.$;
    instance.$data = this.options.data;
    instance.$options = this.options;
    proxyMethod(instance, this, 'find');
    proxyMethod(instance, this, 'async');
    proxyMethod(instance, this, 'mount', true);
    proxyMethod(instance, this, 'bind', true);
    proxyMethod(instance, this, 'on', true);
    proxyMethod(instance, this, 'model', true);
    proxyMethod(instance, this, 'show', true);
    proxyMethod(instance, this, 'hide', true);
    proxyMethod(instance, this, 'wrap', true);
    proxyMethod(instance, this, 'watch', true);
    proxyMethod(instance, this, 'nextTick');
    proxyMethod(instance, this, 'forceUpdate', true);
    proxyMethod(instance, this.event, 'listen', true);
    proxyMethod(instance, this.event, 'off', true);
    proxyMethod(instance, this.event, 'once', true);
    proxyMethod(instance, this.event, 'emit', true);
    proxyMethod(instance, this.observerFactory, 'set', true);
    proxyMethod(instance, this.observerFactory, 'delete', true);

    this.hook('beforeCreate');

    initState(this);

    // Lifecycle
    this.hook('created');

    if (options.el) {
      this.mount(options.el);
    }

    // TODO: Implement destroy methods and hooks
  }

  mount (el) {
    if (this._isMounted) {
      this.error.warn('This app has been already mounted.');
      return;
    }

    this.hook('beforeMount');

    const $el = Utilities.isJquery(el) ? el : this.$(el);

    if ($el.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        const str = $el.selector ? $el.selector : $el[0] + '';
        this.error.warn(`Can not mount ${str}, element not found. Consider change selector or call after "domready".`);
      }

      return;
    }

    this.instance.$el = this.$el = $el;

    this._isMounted = true;

    this.hook('configure');

    this.hook('mounted');

    this.watcher = new Watcher(this, function () {
      this.app.watchers.map(watcher => watcher.update());
    }, nullFunction);

    this.forceUpdate();
  }

  forceUpdate () {
    if (this.watcher) {
      this.watcher.update();
    }
  }

  hook (name) {
    if (this.options.hasOwnProperty(name) && typeof this.options[name] === 'function') {
      this.options[name].call(this.instance);
    }
  }

  bind (selector, key, callback) {
    const $element = this.find(selector);

    // Default callback
    if (typeof callback === 'string') {
      const name = callback;
      callback = ($element, value) => {
        switch (name) {
          case ':html':
            $element.html(value);
            break;

          case ':text':
            $element.text(value);
            break;

          case ':value':
            if (FormHelper.isFormElement($element)) {
              FormHelper.update($element);
            }
            break;
          default:
            $element.attr(name, value);
        }
      };
    }

    this.watch(key, function biding (value, oldValue, ctrl) {
      callback.call(this.instance, $element, value, oldValue, ctrl);
    });

    return this;
  }

  on (selector, eventName, callback, delegate = false) {
    const $element = this.find(selector);
    let self = this;

    const handler = function (event) {
      callback.call(self.instance, self.$(this), event);
    };

    if (delegate) {
      this.$el.on(eventName, selector, handler);
    } else {
      $element.on(eventName, handler);
    }

    return this;
  }

  model (selector, key, delegate = false) {
    const handler = function ($element, event) {
      let value;
      switch ($element.attr('type')) {
        case 'radio':
          value = $element[0].value;
          break;
        default:
          value = $element.val();
      }

      return Utilities.set(this.$data, key, value);
    };

    const $element = this.find(selector);

    if (process.env.NODE_ENV === 'development' && !FormHelper.isFormElement($element)) {
      this.error.warn(
        'Please only use two-way-binding on input, select or textarea elements. The element you selected: ' +
        $element[0].outerHTML.substr(0, 50) + '...'
      );
    }

    this.watch(function () {
      const value = Utilities.get(this.$data, key);
      if ($element.val() !== value) {
        FormHelper.update($element, value);
      }
    }, nullFunction);

    this.on(selector, 'change', handler, delegate);

    if ($element[0].tagName !== 'SELECT') {
      this.on(selector, 'input', handler, delegate);
    }

    return this;
  }

  show (selector, key, onShow = null, onHide = null) {
    const $element = this.find(selector);

    if (onShow !== null) {
      onHide = onHide || onShow;
    }

    const toggleHandler = ((handler) => {
      return (() => {
        if (typeof handler === 'string') {
          if (process.env.NODE_ENV === 'development' && typeof $element[handler] !== 'function') {
            this.error.error(`Method: ${handler}() not found in ${Ivia.$._name} object.`);
          }

          return () => $element[handler]();
        } else if (typeof handler === 'function') {
          return (value, oldValue, ctrl) => handler.call(this.instance, $element, value, oldValue, ctrl);
        }
      })();
    });

    onShow = toggleHandler(onShow || 'show');
    onHide = toggleHandler(onHide || 'hide');

    const handler = function (value, oldValue, ctrl) {
      const valueBool = (value == true || value != 0);

      if (valueBool != (oldValue == true || oldValue != 0)) {
        if (valueBool) {
          onShow(value, oldValue, ctrl);
        } else {
          onHide(value, oldValue, ctrl);
        }
      }
    };

    this.watch(key, handler);

    return this;
  }

  hide (selector, key, onShow = null, onHide = null) {
    const getter = (function () {
      if (typeof key === 'function') {
        return function () {
          return key.call(this);
        };
      } else {
        return function () {
          return this[key];
        };
      }
    }).call(this);

    const shouldHide = function () {
      const value = getter.call(this);
      return value != true && value == 0;
    };

    this.show(selector, shouldHide, onShow, onHide);
  }

  wrap (selector, handler) {
    const $element = this.find(selector);
    const self = this;
    const wrapper = {
      execute: function () {
        handler.call(this, $element, this);
      }
    };

    ['bind', 'on', 'model', 'show'].forEach(function (method) {
      wrapper['$' + method] = function () {
        self[method]($element, ...arguments);
        return this;
      };
    });

    wrapper.execute($element);

    return this;
  }

  watch (path, callback, options = {}) {
    options.user = true;

    const watcher = new Watcher(this, path, callback, options);
    this.watchers.push(watcher);

    if (options.immediate) {
      callback.call(this.instance, watcher.get());
    }

    return (function unwatch () {
      watcher.teardown();
    });
  }

  find (selector, refresh = false) {
    if (typeof selector === 'object' && !Utilities.isJquery(selector)) {
      return this.$(selector);
    }

    if (selector === 'string') {
      if (!this.elements.hasOwnProperty(selector) || refresh) {
        this.elements[selector] = this.$el.find(selector);
      }

      return this.elements[selector];
    }

    return this.$(selector);
  }

  nextTick (callback) {
    return TaskQueue.nextTick(callback);
  }

  async (handler) {
    return new Application.Promise(resolve => {
      Application.Promise.resolve()
        .then(handler)
        .then((value) => resolve(value))
    });
  }

  pushStack (watcher) {
    if (this.currentWatcher) {
      this.watcherStack.push(this.currentWatcher);
    }

    this.currentWatcher = watcher;
  }

  popStack () {
    this.currentWatcher = this.watcherStack.pop();
  }
}

function initState (app) {
  // TODO: Init Props
  initData(app, app.options.data);

  if (app.options.methods) {
    initMethods(app, app.options.methods);
  }

  if (app.options.computed) {
    initComputed(app, app.options.computed);
  }

  if (app.options.watch) {
    initWatchers(app, app.options.watch);
  }
}

function initData (app, data) {
  // TODO: Check no props conflict
  for (let key in data) {
    if (!Utilities.isReserved(key)) {
      proxy(app.instance, data, key);
    }
  }

  app.observerFactory.create(data);
}

function initMethods (app, methods) {
  for (let key in methods) {
    const method = methods[key];
    if (!app.options.data[key] && typeof method === 'function') {
      // Faster binding function
      app.instance[key] = Utilities.bind(method, app.instance);
    }
  }
}

function initWatchers (app, watches) {
  for (let key in watches) {
    let handler = watches[key];
    let options;

    if (Utilities.isPlainObject(handler)) {
      options = handler;
      handler = handler.handler;
    }

    if (typeof handler === 'string') {
      handler = app[handler];
    }

    app.watch(key, handler, options);
  }
}

function initComputed (app, computed) {
  for (let key in computed) {
    const handler = computed[key];
    let setter = nullFunction;
    let getter;
    let cache;

    getter = typeof handler === 'function' ? handler : handler.get;
    getter = Utilities.bind(getter, app.instance);

    const watcher = new Watcher(app, key, getter, {lazy: true});

    if (!app.hasOwnProperty(key)) {

      if (typeof handler !== 'function') {
        setter = handler.set;
        cache  = handler.cache;
        getter = cache === false ? nullFunction : function () {
          return watcher.getCachedValue();
        };
      }

      setter = Utilities.bind(setter, app.instance);

      Object.defineProperty(app.data, key, {
        enumerable: true,
        configurable: true,
        get: getter,
        set: setter
      });
    }
  }
}

export function proxy (target, source, key) {
  Object.defineProperty(target, key, {
    get: function proxyGetter () {
      return source[key]
    },
    set: function proxySetter (value) {
      source[key] = value;
    }
  });
}

export function proxyMethod (target, source, key, chain = false) {
  const methodName = '$' + key;
  target[methodName] = function (...args) {
    const r = source[key](...args);

    return chain ? target : r;
  }
}

Application.Promise = PromiseAdapter;
