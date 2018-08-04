module.exports = rapid => {
  const { Model, models } = rapid;

  return class User extends Model {
    static get tableName() {
      return 'users';
    }
    static get singularName() {
      return 'user';
    }

    static get jsonSchema() {
      return {
        type: 'object',
        required: ['name', 'age', 'username', 'password'],
        properties: {
          id: { type: 'integer' },
          age: { type: 'integer' },
          name: { type: 'string', minLength: 2 },
          username: { type: 'string', minLength: 2 },
          password: { type: 'string', minLength: 2 }
        }
      };
    }

    static get relationMappings() {
      return {
        posts: {
          relation: Model.HasManyRelation,
          modelClass: models.Post,
          join: {
            from: 'users.id',
            to: 'posts.authorId'
          }
        }
      };
    }
  };
};
