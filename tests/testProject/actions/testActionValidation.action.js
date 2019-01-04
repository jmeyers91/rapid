module.exports = rapid =>
  rapid
    .action('testActionValidation')
    .schema({
      type: 'object',
      required: ['foo', 'bar'],
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' },
      },
    })
    .receiver(props => props);
