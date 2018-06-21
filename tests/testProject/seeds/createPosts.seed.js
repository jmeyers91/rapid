
module.exports = async function createPosts(rapid) {
  const { Post } = rapid.models;

  return Post.query().insert([
    {title: 'First post', content: 'Hello world!'},
    {title: 'Second post', content: 'Lorem ipsum'},
  ]);
};
