exports.up = async knex => {
  if (await knex.schema.hasTable('posts')) return;
  return knex.schema.createTable('posts', table => {
    table.increments('id').primary();
    table.timestamps(true, true);

    table.string('title').notNullable();
    table.string('content').notNullable();
  });
};

exports.down = async knex => {
  if (await knex.schema.hasTable('posts')) {
    return knex.schema.dropTable('posts');
  }
};
