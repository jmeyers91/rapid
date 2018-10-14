module.exports = rapid => {
  return class User extends rapid.Model {
    static get tableName() {
      return 'users';
    }

    static get jsonSchema() {
      return {
        type: 'object',
        required: ['name', 'username', 'password'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', minLength: 2 },
          username: { type: 'string', minLength: 2 },
          password: { type: 'string', minLength: 2 },
        },
      };
    }
  };
};
