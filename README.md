# Rapid

A Node.js framework for quickly building API servers backed by a PostgreSQL database.

## Install

```bash
npm install @simplej/rapid
```

## Getting started

Install the [Rapid CLI](https://github.com/jmeyers91/rapid-cli) and use it to scaffold an app.

```bash
npm install --global @simplej/rapid-cli
rapid init my_app
```

Start your new app.

```bash
cd my_app
npm run start
```

Now connect at http://localhost:9090

## Using the Rapid CLI

`rapid init [name]` - Create a blank Rapid project.

`rapid` - Start the app in the current directory using the models, controllers, and API routers found in the project.

`rapid --root ./path/to/app` - Pass a directory to rapid instead of using the current directory.

`rapid watch` - Start the app and restart on changes.

`rapid migrate` - Run the migrations in `./migrations`.

`rapid seed` - Run the seeds in `./seeds`.

`rapid clear` - Drop the database.

## API

### `new Rapid(rootPath)`

Create a new rapid instance.

```js
const rapid = await Rapid('/my/app/dir');
```

### `rapid.start() -> rapid`

Start the rapid app. Starts the database, webserver, etc. and resolving any added modules (models, seeds, actions, etc.). Returns a promise that resolves the rapid instance when complete.

```js
const rapid = await Rapid('/my/app/dir').start();
```

### `rapid.autoload() -> rapid`

Rapid has built in support for loading app modules using filename and directory conventions. Meaning models, seeds, actions, routes, etc. will be loaded relative to the root path passed to the `Rapid` constructor. This can be enabled by calling the `autoload` method on the rapid instance.

```js
const rapid = await Rapid('/my/app/dir').autoload().start();
```

### Models

Rapid used the [Objection.js](http://vincit.github.io/objection.js/) ORM's `Model` class. Models are added to rapid using the `addModel` method.

```js
rapid.addModel(rapid =>
  class User extends rapid.Model {
    static get tableName() { return 'users'; }

    static get jsonSchema() {
      return {
        type: 'object',
        required: ['name', 'age'],
        properties: {
          id: { type: 'integer' },
          age: { type: 'integer' },
          name: { type: 'string', minLength: 2 },
        },
      };
    }
  }
);
```

Models can be accessed through `rapid.Models`:

```js
const users = await rapid.models.User.query();
```

### Actions

Actions are added to rapid using the `action` method and can optionally include an input schema for validation. All actions are asynchronous.

```js
rapid.action(
  'add',
  {
    type: 'object',
    required: ['a', 'b'],
    properties: {
      a: { type: 'integer' },
      b: { type: 'integer' },
    },
  },
  async ({ a, b }) => {
    return a + b;
  },
);
```

Actions can be accessed and run through `rapid.actions`.

```js
const result = await rapid.actions.add({ a: 5, b: 10 });
```

### Routes / Routers

Routes and routers allow you to handle incoming HTTP requests. Rapid uses [Koa](https://koajs.com/) and [Koa Router](https://github.com/alexmingoia/koa-router#readme) to handle routing. Routes paths are prefixed with `/api/`.

Routes can be added using the rapid `api` property:

```js
rapid.api
  .get('/user/:userId', someMiddleware(), async context => {
    const userId = +context.params.userId;
    const user = await rapid.models.User
      .query()
      .where('id', userId)
      .first();

    context.response.body = { user };
  });
```

### Channels

Channels are just [socket.io](https://socket.io/) [namespaces](https://socket.io/docs/server-api/#Namespace). Useful in situations where you need to be able to send data directly to clients instead of just passively waiting for requests and responding.

```js
rapid.addChannels(rapid =>
  rapid.io
    .of('/channelName')
    .on('connection', socket => {
      socket.on('echo', data => socket.emit('echo-response', data));
    })
);
```

### Hooks

Hooks allow you to run arbitrary code at different points in the rapid lifecycle (ex. `rapidWillStart`, `modelsDidAttach`, `rapidDidStart`,  etc).

Hooks can be added using the rapid `addHook` method:

```js
rapid.addHook({
  async modelsDidAttach(rapid) {
    // do something after models attach
  },

  async rapidDidStart(rapid) {
    // do something once app has started
  },
})
```

### Seeds

Database seed functions for populating the database with initial data.

Seeds can be added using the rapid `addSeeds` method:

```js
rapid.addSeeds(
  async function createUsers(rapid) {
    const { User } = rapid.models;
    await User.query().insert([ ... ]);
  },

  async function createPosts(rapid) {
    const { Post } = rapid.models;
    await Post.query().insert([ ... ]);
  },
)
```

### Migrations

Database migrations for migrating the structure of the database. Migrations are handled by [Knex](https://knexjs.org/).

### Middleware

Middleware is accessable through `rapid.middleware`.

#### `auth`

Require a valid auth token to access the endpoint. Responds with a 401 error if the auth token is missing or invalid. The `auth` middleware expects the auth token to be in the `Authorization` header.

```js
const { auth } = rapid.middleware;

rapid.api.get('/secret', auth(), context => {
  context.response.body = { secretUserData: { ... } };
});
```

#### `socketAuth`

Similar to the `auth` middleware except it works on socket channels instead of the webserver.

```js
const { socketAuth } = rapid.middleware;

rapid.addChannels(rapid =>
  rapid.io
    .of('/channelName')
    .use(socketAuth())
    .on('connection', socket => {
      socket.on('private', data => socket.emit('secret-data', '...'));
    })
);
```

#### `login`

Takes a function that receives a credentials object and returns either a user object or `null`. If the user resolver function returns `null`, the endpoint will respond with a 400 error otherwise it will set `context.state.user` / `context.state.authToken` and continue the request.

```js
const { login } = rapid.middleware;

rapid.api.post(
  '/login',
  login(async ({ username, password }) => {
    const user = await rapid.models.User.query().where('email', username).first();
    if(!user) return null;
    if(!await rapid.helpers.verifyPassword(password, user.password)) return null;
    return user;
  }),
  context => {
    context.response.body = {
      user: context.state.user,
      authToken: context.state.authToken,
    };
  }
);
```


### Helpers

Helpers are just utility functions available through `rapid.helpers`.

#### `hashPassword`

Hashes and salts a password using [bcryptjs](https://github.com/dcodeIO/bcrypt.js#readme). Returns a promise that resolves a string. Useful for making passwords safe to store on the server. Use `verifyPassword` to check if the hashed password matches a plaintext password.

```js
const hashedPassword = await rapid.helpers.hashPassword('my password');
```

#### `modelToJWT`

Converts a model instance into a JSON web token. Used in the `login` middleware. Useful for manually authorizing a client.

```js
const { modelToJWT } = rapid.helpers;
const { User } = rapid.models;
const user = await User.query().where('username', 'user').first();
const authToken = modelToJWT(user);

console.log('user auth token', authToken);
```

#### `verifyPassword`

Checks if a plaintext password matches a hashed password. Returns a promise that resolves `true/false`.

```js
const { verifyPassword } = rapid.helpers;
const { User } = rapid.models;
const username = 'user';
const password = 'secret';

const user = await User.query().where('username', username).first();
const valid = await verifyPassword(password, user.hashedPassword);

console.log('The credentials are ' + valid ? 'correct' : 'incorrect');
```

#### `verifyAuthToken`

Checks if an JWT auth token is valid. Returns a promise that resolves the token's payload or rejects an error if the token is invalid. Useful for manually checking auth tokens generated by the `login` middleware or the `modelToJWT` helper.

```js
const { verifyAuthToken } = rapid.helpers;
const authToken = 'Bearer ...';

try {
  const user = await verifyAuthToken(authToken);
  console.log('Auth token is valid', user);
} catch(error) {
  console.log('Auth token is invalid', error);
}
```

## License

Rapid is [MIT licensed](./LICENSE).
