module.exports = rapid =>
  rapid.action(
    'testActionValidation',
    {
      type: 'object',
      required: ['foo', 'bar'],
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' }
      }
    },
    props => props
  );
