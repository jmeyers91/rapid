# Rapid

## Install

```
npm install --global @simplej/rapid
```

## Create a Rapid app

```
rapid init my_app
cd my_app
npm run start
```

This creates a project with a basic directory structure and a few example modules.

## Using the Rapid CLI

`rapid init` - Create a blank Rapid project.

`rapid` - Start the app in the current directory using the models, controllers, and API routers found in the project.

`rapid --root ./path/to/app` - Pass a directory to rapid instead of using the current directory.

`rapid --watch` - Start the app and restart on changes.

`rapid migrate` - Run the migrations in `./migrations`.

`rapid seed` - Run the seeds in `./seeds`.

`rapid clear` - Drop the database.

Combine commands:

`rapid clear migrate seed --root ./app`

## Stack

### Webserver

[Koa](https://koajs.com/) and [Koa-Router](https://github.com/alexmingoia/koa-router).

### Database

[Knex](https://knexjs.org/) as a query builder for Postgres, and [Objection](https://vincit.github.io/objection.js/) as the ORM.
