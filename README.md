# Startup

Small IoC library with flexible API and async components in mind.

Startup was written with these goals:

* Easy to add to existing project
* Easy testing
* Components can be asynchronous

## Why
There are [hundreds][npmioc] of npm packages for IoC and DI.
Most of them force you to use some structure or special features for you component:
classes, decorators, objects with fixed structure or even typescript.
Startup don't force you with this. You just need to wrap code into function.

## Install
```sh
npm install @slonoed/startup
```

## How to use
Startup works with two simple entity: a function and a promise.
Each component is a function that returns value.
This value can't be null or undefined.

```javascript
// file simple.js
module.exports = function SimpleComponent() {
  return 'Hello'; // This is value of component
}
```

If this value is a Promise instance, Startup assume it's async component.
And all dependants will wait until it resolves.

```javascript
// file withTimer.js
module.exports = function ComponentWithTimer() {
  // Async component return promise
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('world'); // This is value of component
    }, 1000);
  });
}
```

Component itself don't declare what it needs (just function, remember?).

```javascript
// file composite.js
// arguments is a values from other components
module.exports = function CompositeComponent(simple, withTimer) {
  return simple + ' ' + withTimer;
}
```

Notice all components don't know anything about Startup.
Not tie all three together.

```javascript
const startup = require('@slonoed/startup');
const SimpleComponent = require('./simple');
const ComponentWithTimer = require('./withTimer');
const CompositeComponent = require('./composite');

startup(
  [SimpleComponent],
  [ComponentWithTimer],
  [CompositeComponent, SimpleComponent, ComponentWithTimer]
).then(system => {
  // All components online
  // If you need value of component just pass it to system
  const value = system(CompositeComponent);
  console.log(value); // "hello world"
})
```

### Passing simple values
You often need to pass not only components values but just values.
For example, your component may want some config, or HTMLElement, or any other value.
All you need is to pass it when start up your system.

```javascript
function ConfiguredComponent(config) {
  console.log(config.env)
}

startup(
  [ConfiguredComponent, { env: 'development' }],
  ...
)
// "development"
```

### Destroy system
When need to shut down system you need also shutdown all components.
You can't just throw link away and rely on garbage collector,
because your components can listen DOM events, wait for fetch request,
keep socket connection alive an so on.

Startup allow you to shut down all components in reverse order with
respect to async shutdown. Startup has special export called 'destroy'.
It is a [Symbol][Symbol]. If you component needs to be noticed on shutdown
add shutdown function to a component value with this symbol as key.
Example says more:

```javascript
const destroy = require('startup').destroy;

function Component() {
  const handler = () => console.log('event!');
  document.addEventListener('click', handler);

  return {
    [destroy]: () => {
      document.removeEventListener('click', handler);
    }
  };
}

startup(
  [Component]
).then(system => {
  system.destroy(); // call it to destroy all components in reverse order
});
```

If shutdown function returns promise, Startup will wait until it resolves before
kill other components.

## API
TBD


[npmioc]: https://www.npmjs.com/browse/keyword/ioc "npm search ioc"
[Symbol]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol
