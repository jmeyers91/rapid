module.exports = rapid => {
  const { User } = rapid.models;
  const { resource } = rapid.middleware;

  return resource(User);
};
