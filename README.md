# Ivia.js

A reactivity MVVM framework for jQuery with Vue-like interface.

## Table of Contents

- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Create Ivia Instance](#create-ivia-instance)
  - [Create Custom Plugin](#create-custom-plugin)
- [Binding Data (One-way-binding)](#binding-data-one-way-binding)
  - [Simple Binding](#simple-binding)
  - [Custom Handler](#custom-handler)
  - [Array Operation](#array-operation)
- [DOM Events](#dom-events)
- [Two-Way Binding](#two-way-binding)
- [Show/Hide](#showhide)
  - [Hide element](#hide-element)
  - [Custom Show/Hide Handler](#custom-showhide-handler)
- [Find Element](#find-element)
- [Wrap](#wrap)
- [Methods / Watchers and Computed](#methods--watchers-and-computed)
- [Events](#events)
- [Setters](#setters)
- [Async/Sync](#asyncsync)
  - [nextTick](#nexttick)
  - [Async DOM Operation](#async-dom-operation)
  - [Promise A/+](#promise-a)
- [Element Creation](#element-creation)

## Getting Started

### Installation

Install by npm or yarn.

``` bash
npm install ivia --save

yarn add ivia
```

Install by bower

```bash
bower install ivia --save
```

Download single file for browser.

```html
<script src="js/jquery.min.js"></script>
<script src="js/ivia.min.js"></script>
```

CDN

```html
<script src="//unpkg.com/ivia/dist/ivia.min.js"></script>
```

If you are using ES6 syntax to import module, you must inject jQuery or Zepto first.

```js
import jQuery from 'jquery';
import Ivia from 'ivia';

Ivia.$ = jQuery;

// Or Zepto
Ivia.$ = Zepto;

// Use _name to know which is in Ivia later
Ivia.$._name; // `jquery` or `zepto`
```

Make sure your environment has `window` and `document` object, Ivia does not support server environment now.

### Create Ivia Instance

Ivia's interface is very similar to Vue, we can create an instance and add `el`in option to select element.

```html
<div id="app"></div>

<script>
var sp = new Ivia({
  el: '#app', // You can also use $('#app')
  data: { ... },
  methods: {
    ...
  }
});
</script>
```

Sometimes you may need to put your code before HTML `<body>`, you can add `domready` option.

```html
<head>
  <script>
  var sp = new Ivia({
    el: '#app',
    domready: true
  });
  </script>
</head>
<body>
  <div id="app"></div>
</body>
```

Or use jQuery plugin pattern.

```js
$(document).ready(function () {
  var sp = $('#app').ivia({ ... });
});
```

### Create Custom Plugin

Sometimes you may need to handle a big project with many re-usable widgets, you can use Ivia to help you create jQuery plugins.
 
```js
// Do not pass `el` option
// This options will be default options.

Ivia.plugin('flower', {
  data: { ... },
  methods: { ... }
});
```

Now, use this plugin everywhere:

```js
$('.flower-widget').flower();

// Or add custom options
$('.flower-widget').flower({
  data: {
    foo: 'bar'
  },
  method: {
    extraMethod: function () {}
  },
  extraOptions: {
    foo: 'bar',
    ajaxUrl: '/post'
  }
});
```

The new options will recursively merge with original one, so you can override any data. Use `$options` later in Ivia instance to get your extra options.

```js
this.$options.extraOptions.ajaxUrl; // /post
```

## Binding Data (One-way-binding)

### Simple Binding

- API: `this.$bind(selector: string, dataPath: string, handler: string|Function)`
- Handler: `function ($element: jQuery, value: mixed, oldValue: mixed, arrayControl: Object = null)`

Ivia has a reactive data structure, you can bind an HTML element to a data value then if this data changed, Ivia
will notice your handler to change DOM.

```html
<div id="app">
  <p id="flower"></p>
</div>

<script>
var sp = new Ivia({
  el: '#app',
  data: {
    flower: {
      name: 'sakura',
      nmuber: 25 
    }
  },
  configure: function () {
    this.$bind('#flower', 'flower.name', ':text');
    this.$bind('#flower', 'flower.number', 'data-number');
  }
});
</script>
```

`$bind()` method help us bin a value to element we selected, don't worry to double selected, Ivia will cache it.
the third argument tells Ivia to bind the attribute to this data. This is similar to Vue `v-bind:data-number` directive. 

An attribute name start with `:` is a special control, currently we supports `:text`, `:html` and `:value`, which will
auto use jquery `.text()`, `html()` or `val()` to bind data, otherwise will use `attr()`.

The rendered result will be:

```html
<p id="flower" data-number="25">sakura</p>
```

Now you can change data:

```js
sp.flower.name = 'rose';
```

the text in `<p>` will change to `rose`, try this in [playground](https://jsfiddle.net/asika32764/jvyzv1uc/)

> NOTE: All selector must under the root element which you set in `el:` option, Ivia will use `this.$find()` to find
> elements only contains in root element, if you have to control outside element, inject a custom element object.
> `this.$bind(this.$('.my-outside-item'), 'flower')`

### Custom Handler

You will hope to do some extra action when data changed, just bind a callback.

```js
this.$bind('#flower', 'flower.name', function ($ele, value, oldValue) {
  $ele.text(name);
  
  // Push new data to remote
  this.$.ajax(...); // this.$ is a jQuery obj reference 
  
  // Add new child to other element
  this.$find('.logs').append(
    // Ivia provides createElement() method
    // You can still use $(`<li>...</li>`) to create element.
    Ivia.createElement('li', {'data-number': this.flower.number}, value)  
  );
  
  // Show/hide
  if (value) {
    $ele.slideDown();
  } else {
    $ele.slideUp();
  }
});
```

### Array Operation

If data is an array and changed by `push`, `unshift` and `splice`, there will be forth argument with control info, 
it includes `method` and `args` to help you know what has been inserted.

```js
var sp = new Ivia({
  el: '#app',
  data: {
    items: ['a', 'b', 'c']
  },
  configure: function () {
    this.$bind('#flower', 'items', function ($ele, value, oldValue, ctrl) {
      if (ctrl) {
        switch (ctrl.method) {
          case 'push':
            ctrl.args.forEach(e => $ele.append(this.$(`<li>${e}</li>`)));
            break;
          case 'splice':
            ...
            break;
          case 'unshift':
            ...
            break;
        }
        return;
      }
      
      // Not array inserted, just refresh all
      $ele.empty();
      value.forEach(e => $ele.append(this.$(`<li>${e}</li>`)));
    });
  }
});

// Let's push a new item
sp.items.push('d');
```

## DOM Events

- API: `this.$on(selector: string, eventName: string, handler: Function, delegate: boolean = false)`
- Handler: `function ($ele, event)`

Use `$on()` to bind DOM events to your data.

```html
<div id="app">
  <input id="flower-input" type="text" />
  <p id="flower-output"></p>
</div>

<script>
var sp = new Ivia({
  el: '#app',
  data: {
    flower: ''
  },
  configure: function () {
    this.$on('#flower-input', 'input', function ($ele, event) {
      this.flower = $ele.val();
    });
    
    this.$bind('#flower-output', 'flower', ':text');
  }
});
</script>
```

See [example](https://jsfiddle.net/asika32764/my6u31j7/)

If your elements are not always on page, your JS will add or remove them, you can add `true` to forth argument to use 
jQuery delegate event binding, then jQuery will help you watch your element.

```js
this.$on('#flower-input', 'input', $ele => this.flower = $ele.val(), true);
```

## Two-Way Binding

- API: `this.$model(selector: string|Element, dataPath: string, delegate: boolean = false)`
 
Two-way binding can only works for `input`, `textarea` and `select` now.

```html
<div id="app">
  <input id="flower-input" type="text" />
  <p id="flower-output"></p>
</div>

<script>
var sp = new Ivia({
  el: '#app',
  data: {
    flower: 'initial data'
  },
  configure: function () {
    this.$model('#flower-input', 'flower')
      .$bind('#flower-output', 'flower', ':text');
  }
});
</script>
```

See [Example](https://jsfiddle.net/asika32764/y4z4j8Lu/) 

## Show/Hide

- API: `this.$show(selector: string|Element, dataPath: string, onShow: string|Function, onHide: string|Function)`

Use `$show()` to control an element show/hide depend on data, if value is `true`, not empty string or bigger then `0`,
this element will be visible on page.

```html
<div id="app">
  <select name="" id="list">
    <option value="0">Zero</option>
    <option value="1">One</option>
    <option value="2">Two</option>
    <option value="-1">Negative One</option>
  </select>
  
  <div id="list-show">
    <ul>
      <li>A</li>
      <li>B</li>
      <li>C</li>
    </ul>
  </div>
</div>

<script>
var sp = new Ivia({
  el: '#app',
  data: {
    list: '1'
  },
  configure: function () {
    this.$show('#list-show li', 'list');
    
    this.$model('#list', 'list');
  }
});
</script>
```

See [Example](https://jsfiddle.net/asika32764/15ysvu2k/1/)

### Hide element

Use `$hide()`, the show/hide value will be reversed from `$show()`.

### Custom Show/Hide Handler

Use `string` as jQuery method.

```js
// Same as $ele.show()
this.$show('#list-show li', 'list', 'show', 'hide');

// Same as $ele.fadeIn()
this.$show('#list-show li', 'list', 'fadeIn', 'fadeOut');

// Samse as $ele.slideDown()
this.$show('#list-show li', 'list', 'slideDown', 'slideUp');
```

If you only provide first handler, is will use as toggle handler.

```js
this.$show('#list-show li', 'list', 'toggle'); // toggle show/hide

this.$show('#list-show li', 'list', 'fadeToggle'); // toggle fadeIn/fadeOut
```

Use callback:

```js
this.$show('#list-show li', 'list', function ($ele, v, old, ctrl) {
  $ele.slideDown();
}, function ($ele, v, old, ctrl){
  $ele.slideUp();  
});

// Use ES6 arrow function
this.$show('#list-show li', 'list', $ele => $ele.slideDown(), $ele => $ele.slideUp());
```

See [Example](https://jsfiddle.net/asika32764/mjh2n63s/2/)

## Find Element

Use `$find(selector)` to find all children element in the root element. Ivia will cache selector so you won't have multiple
select, if you want to refresh this select, add `true` at second argument.

The `$bind()`, `$model` and `$show()` method will cache target elements too, if you add some elements matches their selector,
you must call `$find(selector, true)` to refresh cache. `$on()` method can simply add `true` at last argument to enable delegation.

## Wrap

Simply use `$wrap` so you don't need always type same selector:

```js
this.$wrap('#flower-selector', function ($ele, wrapper) {
  this.$bind('flower.name', ':text');
  this.$model('flower.name');
  
  // wrapper is same as this, useful for arrow function
  wrapper.$show('flower.show', 'fadeToggle');
});
```

Only supports `$bind`, `$show`, `$model`, `$on` methods.

## Methods / Watchers and Computed

methods, watches and computed is same as Vue.

```js
var sp = new Ivia({
  el: '#app',
  data: {
    firstName: 'john',
    lastName: 'williams'
  },
  configure: function () {
    this.$model('#first', 'firstName');
    this.$model('#last', 'lastName');
    
    this.$bind('#full-name', 'fullName', ':text');
  },
  methods: {
    capitalize: function (text) {
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
  },
  computed: {
    fullName: function () {
      return this.capitalize(this.firstName) + ' ' + this.capitalize(this.lastName);
    }
  },
  watch: {
    foo: function (value, oldValue, ctrl) {
      // Do some manually update
    }
  }
});
```

Also support `$watch()` method:

```js
this.$watch('foo.bar', function (value, oldValue, ctrl) {
    // Do some manually update
});
```

See [Example](https://jsfiddle.net/asika32764/1bfw6h99/1/) and [Vue: Computed amd Watchers](https://vuejs.org/v2/guide/computed.html)

## Events

Ivia events is also similar to Vue, the only different is that we change `$on()` method to `$listen`:
 
```js
this.$listen('event-name', (arg) => {
    console.log(arg); // Hello
});

this.$emit('event-name', 'Hello');

this.$off('event-name');
```

Supported methods: `$listen()`, `$emit()`, `$off()`, `$once()`.

## Setters

You must also use `$set()` and `$delete()` to operate some object in data that Ivia can add reactive observer.
 
```js
this.$set(this.$data.foo, 'bar', 'value');
this.$delete(this.$data.foo, 'bar', 'value');
```

See [Vue doc: reavtivity](https://vuejs.org/v2/guide/reactivity.html#Change-Detection-Caveats)

## Async/Sync

### nextTick

Ivia also supports `$nextTick()` after all watchers updated the DOM:

```js
this.foo = 'new data';

this.$nextTick(function () {
  // Do something after DOM updated.
});
```

See [Vue nextTick](https://vuejs.org/v2/guide/reactivity.html#Async-Update-Queue)

### Async DOM Operation

DOM operation is synchronous, Ivia provides an `$async()` method to help us do something asynchronous and return Promise/A+ object.

```js
this.$async(function () {
  for (...) {
    $element.append(...); // Run 1000 times, here will not block your process
  }
}).then(function () {
  // Do something after DOM appended
});

// The below code will continue execute

this.$async(function () {
  for (...) {
    $element.append(...); // Run 1000 times, here will not block your process
  }
}).then(function () {
  // Do something after DOM appended
});

// These 2 tasks will not block each other.
```

Also you can use `Promise.all()` or `Promise.race()`, this example we convert jQuery ajax deferred object to Promise:

```js
Ivia.Promise.all([
  this.$async(() => this.$.get(url1)),
  this.$async(() => this.$.post(url2, data)),
  this.$async(() => this.$.get(url3)),
]).then(() => {
    // will wait 3 ajax completed
});
```

### Promise A/+

Ivia provides a Promise object in `Ivia.Promise`, if browser supports native Promise, this object will be reference of native Promise.
If browser not support, Ivia will wrap `jQuery.Deferred` and adapt it to fit Promise A/+ interface.
 
```js
new Ivia.Promise(resolce => {
    // Do something
    
    resolve(...);
});
```

## Element Creation

In the original way, we use `$` to create element:

```js
Ivia.$('<div class="foo">Text</div>');
```

Ivia has a `createElement()` method to help you generate DOM element:

```js
Ivia.createElement('div', {class: 'foo'}, 'Text');
```

We can add more children in the third argument.

```js
Ivia.createElement('ul', {class: 'nav'}, [
    {nodeName: 'li', attributes: {class: 'nav-item active'}, children: 'Text'},
    {nodeName: 'li', attributes: {class: 'nav-item'}, children: 'Text'},
    {nodeName: 'li', attributes: {class: 'nav-item'}, children: 'Text'},
]);
```

Result:

```html
<ul class="nav">
  <li class="nav-item active">Text</li>
  <li class="nav-item">Text</li>
  <li class="nav-item">Text</li>
</ul>
```

This is useful if we return Ajax JSON data to generate HTML.


## TODO

- Component system
- Props
- State control

## Credit

This project is inspired by [Evan You](https://github.com/yyx990803)'s [Vue.js](https://github.com/vuejs/vue) and the 
reactive structure is heavily referenced of Vue.

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2017, Simon Asika
