module.exports = async function createUsers(rapid) {
  const { User } = rapid.models;
  const { hashPassword } = rapid.helpers;

  return User.query().insert([
    {
      name: 'Jim',
      username: 'jim',
      age: 26,
      password: await hashPassword('secret')
    },
    {
      name: 'Sarah',
      username: 'sarah',
      age: 23,
      password: await hashPassword('pineapple')
    }
  ]);
};

module.exports.runOrder = 1;
