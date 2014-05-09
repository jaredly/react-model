
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
  models: {
    'projects': 'ListProjects',
    'project': {
      'name': 'Project',
      'params': {
        id: 'props.param'
      }
    },
    'feature': {
      name: 'Feature',
      params: function (props, state) {
        return {val: this.getComputedVal()}
      }
    }
  }
  */

  modelAction: function (name, args, done) {
    if (!this.props.ctx || !this.props.ctx.dao) return
    var params = this._getModelParams()
    this.props.ctx.dao.modelAction(this.model, params, name, args, done)
  },

  _onModelChange: function (data, isUpdate) {
    var model = data
    if (isUpdate) {
      model = React.addons.update(this.state.model, data)
    }
    this.setState({
      model: model,
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
    this._onModelLoading()
    this.props.ctx.dao.model(this.model, params)
      .on('change', this._onModelChange)
      .get(function (err) {
        if (err) return this._onModelError(err)
        this.setState({modelLoading: false})
      })
  },
  _stopListening: function (params) {
    if (!this.props.ctx || !this.props.ctx.dao) return
    this.props.ctx.dao.model(this.model, params)
      .off('change', this._onModelChange)
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

