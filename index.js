
// A simple model mixin

var _ = require('lodash')

module.exports = {
  getInitialState: function () {
    return {
      model: null,
      modelLoading: true,
      modelError: null,
    }
  },

  /*
  getModelParams: function (props, state) {
    return {id: props.pid}
  },
  */

 modelAction: function (name, args, done) {
   var params = this._getModelParams()
   this.props.ctx.dao.modelAction(this.model, params, name, args, done)
 },

  _onModelChange: function (attr, value) {
    if (arguments.length === 1) {
      return this.setState({model: attr, modelLoading: false, modelError: false})
    }
    if (!Array.isArray(attr)) {
      attr = [attr]
    }
    this.setState({
      model: React.addons.update(this.state.model, makeUpdate(attr, value)),
      modelLoading: false,
      modelError: false
    })
  },
  _onModelLoading: function () {
    this.setState({modelLoading: true})
  },
  _onModelError: function (err) {
    this.setState({modelError: err, modelLoading: false})
  },

  _getModelParams: function (props, state) {
    if (!this.getModelParams) return null
    if (arguments.length === 0) {
      props = this.props
      state = this.state
    }
    return this.getModelParams(props, state)
  },

  componentWillMount: function () {
    this._startListening(this.getModelParams(this.props, this.state))
  },
  componentDidUpdate: function (props, state) {
    var prev = this._getModelParams(props, state)
      , now = this._getModelParams(this.props, this.state)
    if (_.isEqual(prev, now)) return
    this._stopListening(prev)
    this._startListening(now)
  },

  _startListening: function (params) {
    if (!this.props.ctx || !this.props.ctx.dao) return
    this.props.ctx.dao.watchModel(
      this.model,
      params,
      this._onModelChange,
      this._onModelLoading,
      this._onModelError
    )
  },
  _stopListening: function (params) {
    if (!this.props.ctx || !this.props.ctx.dao) return
    this.props.ctx.dao.unwatchModel(
      this.model,
      params,
      this._onModelChange,
      this._onModelLoading,
      this._onModelError
    )
  }
}

function makeUpdate(attrs, value) {
  var update = {}
    , c = update
  while (attrs.length) {
    c = c[attrs.shift()] = {}
  }
  c.$set = value
  return update
}

