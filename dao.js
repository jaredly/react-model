
var _ = require('lodash')
  , Listener = require('./listener')

model.exports = Dao

/**
 * getters looks like {
 *    modelName: "path/to/json/endpoint",
 *    otherModelName: function (params, done) {}
 * }
 */
function Dao(baseUrl, models) {
  this.baseUrl = baseUrl || '/'
  this.models = models
  this.evt = new Listener()
  this.data = {}
}

// TODO: modelAction body.

Dao.prototype = {
  // public api
  model: function (name, params) {
    var that = this
    var chain = {
      on: function (what, fn) {
        that.evt.onModel(name, params, what, fn)
        return chain
      },
      off: function (what, fn) {
        that.evt.offModel(name, params, what, fn)
        return chain
      },
      get: function (fn) {
        that.modelAction(name, params, 'get', null, fn)
      }
    }
  },

  // create the function for the model action
  _modelAction: function (model, params, name, args) {
    if (!this.models[model]) {
      throw new Error('Model not found')
    }
    var context = {
          model: model,
          params: params,
          chamgeModel: this.changeModel.bind(this, model, params),
          replaceModel: this.replaceModel.bind(this, model, params),
          dao: this
        }
      , actions = {}
      , def = this.models[model]
    if (def.mixins) {
      def.mixins.forEach(function (mixin) {
        if (mixin.context) {
          merge(context, mixin.context(params))
        }
        if (mixin.actions) {
          merge(actions, mizin.actions)
        }
      })
    }
    if (def.context) {
      merge(context, def.context(params))
    }
    if (def.actions) {
      merge(actions, def.actions)
    }
    var action = actions[name]
    if (!action) {
      throw new Error("Action not defined for model: " + name)
    }
    return action.bind(context, args)
  },

  modelAction: function (model, params, name, args, done) {
    var action = this._modelAction(model, params, name, args)
    this.ev.startTransaction()

    action(function () {
      this.ev.finishTransation()
      done.apply(null, arguments)
    })
  },

  getCached: function (model, params) {
    var pdata = hashJson(params)
    return this.data[model] && this.data[model][pdata]
  },

  getModel: function (model, params, done) {
    this.modelAction(model, params, 'get', null, done)
  },

  // isFormatted: "data" uses the $set syntax
  changeModel: function (model, params, data, isFormatted, noCache) {
    var pdata = hashJson(params)
      , update = data

    if (isFormatted) {
      update = {}
      for (var name in data) {
        update[name] = {$set: data[name]}
      }
    }

    if (!noCache) {
      this.data[model][pdata] = React.addons.update(this.data[model][pdata], update)
    }
    this.evt.triggerModel(model, pdata, 'change', [update, true])
  },

  replaceModel: function (model, params, data, noCache) {
    var pdata = hashJson(params)

    if (!noCache) {
      if (!this.data[model]) this.data[model] = {}
      this.data[model][pdata] = data
    }
    this.evt.triggerModel(model, pdata, 'change', [data])
  },

  // utility functions
  _get: function (url, done) {
    request.get(this.baseUrl + url)
      .end(function (err, req) {
        if (err) return done(err)
        if (req.status !== 200) {
          return done(new Error('Status not 200: ' + req.status + '; Text: ' + req.text))
        }
        done(null, req.body)
      })
  },
  _getWithParams: function (url, params, done) {
    this._get(fillUrl(url, params), done)
  },
  _post: function (url, data, done) {
    request.get(this.baseUrl + url)
      .send(data)
      .end(function (err, req) {
        if (err) return done(err)
        if (req.status !== 200) {
          return done(new Error('Status not 200: ' + req.status + '; Text: ' + req.text))
        }
        done(null, req.body)
      })
  },
  _postWithParams: function (url, params, data, done) {
    this._post(fillUrl(url, params), data, done)
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

function fillUrl(url, params) {
  return url.replace(/:[^\/]+/g, function (what) {
    return params[what.slice(1)] || what
  })
}

function hashJson(obj) {
  if (obj === undefined) return 'null'
  if (Array.isArray(obj)) {
    return JSON.stringify(obj.map(hashJson))
  }
  if ('object' !== typeof obj) {
    return JSON.stringify(obj)
  }
  var keys = Object.keys(obj)
  keys.sort()
  return keys.map(function (name) {
    var val = obj[name]
      , red
    return JSON.stringify(name) + ': ' + hashJson(val)
  }).join(',')
}

function merge(a, b) {
  for (var c in b) {
    a[c] = b[c]
  }
  return a
}

