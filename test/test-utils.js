
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
    ],
    [
      'tolerate null',
      [{notthere: 'state.model.thing.not.there'},
        {}, {model: null}, {}],
      {notthere: null}
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

  describe.only('hashJson', function () {
    it('should hash something simple', function () {
      expect(utils.hashJson({})).to.equal('{}')
    })

    it('should hash something complicated', function () {
      expect(utils.hashJson({
        b: 3,
        c: 4,
        a: [3,4,5,{y:10}]
      })).to.eql('{"a": [3, 4, 5, {"y": 10}], "b": 3, "c": 4}')
    })

    it('should has same things the same', function () {
      expect(utils.hashJson({
        a: 3,
        b: 5,
        c: {a: 3, b: 10}
      })).to.equal(utils.hashJson({
        a: 3,
        c: {b: 10, a: 3},
        b: 5,
      }))
    })
  })
})

