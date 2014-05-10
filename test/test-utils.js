
var expect = require('expect.js')
  , utils = require('../lib/utils.js')

var fixtures = {
  stringParams: [
    [
      'complex example',
      [{id: 'props.id', open: 'state.open', out: 'out', good: 'state.is.good'},
        {id: 40, man: 10}, {open: 'yes', is: {good: 'awesome'}}, {out: 'in'}],
      {
        id: 40,
        open: 'yes',
        good: 'awesome',
        out: 'in'
      }
    ],
    [
      'tolerate undefined',
      [{notthere: 'state.model.thing.not.there'},
        {}, {model: {}}, {}],
      {notthere: undefined}
    ]
  ]
}

describe('utils', function () {
  describe('stringParams', function () {
    fixtures.stringParams.forEach(function (fix) {
      it('should do ' + fix[0], function () {
        expect(utils.stringParams.apply(null, fix[1])).to.eql(fix[2])
      })
    })
  })
})

