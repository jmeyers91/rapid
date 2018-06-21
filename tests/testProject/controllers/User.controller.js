
module.exports = rapid => {
  const { verifyPassword } = rapid.helpers;
  return class UserController {
    getUsers() {
      const { User } = rapid.models;
      return User.query();
    }

    getUserById(id) {
      return this.getUsers().where('id', id).first();
    }

    getByUsername(username) {
      return this.getUsers().where('username', username).first();
    }

    async login({ username, password }) {
      const user = await this.getByUsername(username);
      if(user && await verifyPassword(password, user.password)) {
        delete user.password;
        return user;
      }
      return null;
    }
  };
};
