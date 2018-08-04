module.exports = rapid => {
  const { Model, models } = rapid;

  return class Post extends Model {
    static get tableName() {
      return 'posts';
    }
    static get singularName() {
      return 'post';
    }

    static get jsonSchema() {
      return {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          id: { type: 'integer' },
          title: { type: 'string', minLength: 2 },
          content: { type: 'string', minLength: 2 }
        }
      };
    }

    static get relationMappings() {
      return {
        author: {
          relation: Model.BelongsToOneRelation,
          modelClass: models.User,
          join: {
            from: 'users.id',
            to: 'posts.authorId'
          }
        }
      };
    }
  };
};
