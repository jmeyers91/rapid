
module.exports = rapid => {
  return class Post extends rapid.Model {
    static get tableName() {
      return 'posts';
    }

    static get jsonSchema() {
      return {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          id: {type: 'integer'},
          title: {type: 'string', minLength: 2},
          content: {type: 'string', minLength: 2},
        },
      };
    }
  }
};