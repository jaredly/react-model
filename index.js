
// A simple model mixin

var _ = require('lodash')

module.exports = {
  getInitialState: function () {
    var state = {}
    for (var name in this.models) {
      state[name] = null
      state[name + 'Loading'] = false
      state[name + 'Error'] = false
    }
    return state
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

  // if there's only one model for this component, you can leave off the first
  // argument.
  modelAction: function (model, action, args, done) {
    if (!this.props.ctx || !this.props.ctx.dao) return
    if (arguments.length === 3) {
      var models = Object.keys(this.models)
      if (models.length !== 1) {
        throw new Error('Multiple models...unsure which you want')
      }
      done = args
      args = action
      action = model
      model = models[0]
    }
    var params = this._getModelParams(model)
      , modelName = this._getModelName(model)
    this.props.ctx.dao.modelAction(modelName, params, action, args, done)
  },

  _getModelName: function (which) {
    if ('string' === typeof this.models[which]) return this.models[which]
    return this.models[which].name
  },

  _getModelParams: function (which, props, state) {
    if ('string' === typeof this.models[which] || !this.models[which].params) return null
    if (arguments.length <= 1) {
      props = this.props
      state = this.state
    }
    return this.models[which](props, state)
  },

  _onModelChange: function (which, data, isUpdate) {
    var model = data
      , state = {}
    if (isUpdate) {
      model = React.addons.update(this.state.model, data)
    }
    state[which] = model
    state[which + 'Loading'] = false
    state[which + 'Error'] = false
    this.setState(state)
  },
  _onModelLoading: function (which, isLoading) {
    var state = {}
    state[which + 'Loading'] = isLoading
    this.setState(state)
  },
  _onModelError: function (which, err) {
    var state = {}
    state[which + 'Loading'] = false
    state[which + 'Error'] = err
    this.setState(state)
  },

  _makeListeners: function () {
    if (this._model_listeners) return
    this._model_listeners = {}
    for (var name in this.models) {
      this._model_listeners[name] = this._onModelChange.bind(this, name)
    }
  },

  componentWillMount: function () {
    this._makeListeners()
    for (var name in this.models) {
      this._startListening(which, this._getModelParams(which, this.props, this.state))
    }
  },
  componentDidUpdate: function (props, state) {
    var prev, now
    for (var which in this.models) {
      prev = this._getModelParams(which, props, state)
      now = this._getModelParams(which, this.props, this.state)
      if (_.isEqual(prev, now)) continue;
      this._stopListening(which, prev)
      this._startListening(which, now)
    }
  },

  _startListening: function (which, params) {
    if (!this.props.ctx || !this.props.ctx.dao) return
    this._onModelLoading(which, true)
    var modelName = this._getModelName(which)
    this.props.ctx.dao.model(which, params)
      .on('change', this._model_listeners[which])
      .get(function (err) {
        if (err) return this._onModelError(which, err)
        this._onModelLoading(which, false)
      })
  },
  _stopListening: function (which, params) {
    if (!this.props.ctx || !this.props.ctx.dao) return
    var modelName = this._getModelName(which)
    this.props.ctx.dao.model(modelName, params)
      .off('change', this._model_listeners[which])
  }
}

