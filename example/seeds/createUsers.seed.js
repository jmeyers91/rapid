
module.exports = async function createUsers(rapid) {
  const { User } = rapid.models;
  const { hashPassword } = rapid;

  return rapid.models.User.query().insert([
    {name: 'Jim', username: 'user', password: await hashPassword('secret')},
    {name: 'Sarah', username: 'sarah', password: await hashPassword('pineapple')},
  ]);
};
