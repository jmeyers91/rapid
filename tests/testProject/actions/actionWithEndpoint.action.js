module.exports = rapid =>
  rapid
    .action('testActionEndpoints')
    .schema({
      type: 'object',
      required: ['foo', 'bar'],
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' },
      },
    })
    .postAuto('/testActionEndpoints')
    .receiver(props => props);
