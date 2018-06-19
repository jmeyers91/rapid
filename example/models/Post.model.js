
module.exports = rapid => {
  return class Post extends rapid.Model {
    static get tableName() {
      return 'posts';
    }

    static get jsonSchema() {
      return {
        type: 'object',
        required: ['text'],
        properties: {
          id: {type: 'integer'},
          text: {type: 'string', minLength: 2},
        },
      };
    }
  }
};