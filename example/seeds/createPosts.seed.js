
module.exports = async function createPosts(rapid) {
  const { User, Post } = rapid.models;
  const jim = await User.query().where('username', 'jim').first();
  const sarah = await User.query().where('username', 'sarah').first();

  return Post.query().insert([
    {authorId: jim.id, title: 'First post', content: 'Hello world!'},
    {authorId: sarah.id, title: 'Second post', content: 'Lorem ipsum'},
  ]);
};

module.exports.runOrder = 2;
