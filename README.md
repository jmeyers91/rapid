# Rapid

## Install

```bash
npm install @simplej/rapid
npm install --global @simplej/rapid-cli
```

## Create a Rapid app

```bash
rapid init my_app
cd my_app
npm run start
```

This creates a project with a basic directory structure and a few example modules.

## Using the Rapid CLI

`rapid init` - Create a blank Rapid project.

`rapid` - Start the app in the current directory using the models, controllers, and API routers found in the project.

`rapid --root ./path/to/app` - Pass a directory to rapid instead of using the current directory.

`rapid watch` - Start the app and restart on changes.

`rapid migrate` - Run the migrations in `./migrations`.

`rapid seed` - Run the seeds in `./seeds`.

`rapid clear` - Drop the database.

## API

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

Actions are added to rapid using the `action` method and can optionally include a input schema for validation. All actions are asynchronous.

```js
rapid.action(
  'getUserByUsername',
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

Database migrations for migrating the structure of the database.

### Middleware

Middleware is accessable through `rapid.middleware`.

#### `auth`

Require a valid auth token to access the endpoint. Responds with a 401 error if the auth token is missing or invalid. The `auth` middleware expects the auth token to be in the `Authorization` header.

```js
rapid.api.get('/secret', rapid.middleware.auth(), context => {
  context.response.body = { secretUserData: { ... } };
});
```

#### `login`

Takes a function that receives a credentials object and returns either a user object or `null`. If the user resolver function returns `null`, the endpoint will respond with a 400 error otherwise it will set `context.state.user` / `context.state.authToken` and continue the request.

```js
rapid.api.post(
  '/login',
  async ({ username, password }) => {
    const user = await rapid.models.User.query().where('email', username).first();
    if(!user) return null;
    if(!await rapid.helpers.verifyPassword(password, user.password)) return null;
    return user;
  },
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

Hashes and salts a password using [bcryptjs](https://github.com/dcodeIO/bcrypt.js#readme). Returns a promise that resolves a string.

```js
const hashedPassword = await rapid.helpers.hashPassword('my password');
```

#### `verifyPassword`

Checks if a plaintext password matches a hashed password. Returns a promise that resolves `true/false`.

```js
const username = 'user';
const password = 'secret';
const user = await rapid.models.User.query().where('username', username).first();
const valid = await rapid.helpers.verifyPassword(password, user.hashedPassword);

console.log('The credentials are ' + valid ? 'correct' : 'incorrect');
```
