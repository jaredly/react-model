
var _ = require('lodash')

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

model.exports = Dao

/**
 * getters looks like {
 *    modelName: "path/to/json/endpoint",
 *    otherModelName: function (params, done) {}
 * }
 */
function Dao(baseUrl, getters) {
  this.baseUrl = baseUrl || '/'
  this.modelGetters = getters || {}
  this.model_listeners = {}
  this.listeners = {}
  this.data = {}
}

Dao.prototype = {
  // public api
  model: function (name, params) {
    var that = this
    var chain = {
      on: function (what, fn) {
        that.onModel(name, params, what, fn)
        return chain
      },
      off: function (what, fn) {
        that.offModel(name, params, what, fn)
        return chain
      }
    }
  },
  onModel: function (model, params, what, fn) {
    if (!this.model_listeners[model]) {
      this.model_listeners[model] = {
      }
    }
    var pdata = hashJson(params)
    if (!this.model_listeners[model][pdata]) {
      this.model_listeners[model][pdata] = {
        change: [],
        loading: [],
        error: []
      }
    }
    if (['change', 'loading', 'error'].indexOf(what) === -1) {
      throw new Error("Can't listen for " + what)
    }
    this.model_listeners[model][pdata][what].push(fn)
  },
  offModel: function (model, params, what, fn) {
    var pdata = hashJson(params)
    if (!this.model_listeners[model]) return false
    if (!this.model_listeners[model][pdata]) return false
    if (!this.model_listeners[model][pdata][what].length) return false
    var ar = this.model_listeners[model][pdata][what]
      , ix = ar.indexOf(fn)
    if (ix === -1) return false
    ar.splice(ix, 1)
    return true
  },

  watchModel: function (name, params, change, loading, error) {
    this.model(name, params)
      .on('change', change)
      .on('loading', loading)
      .on('error', error)

    this.getModel(model, params, false)
  },
  unwatchModel: function (name, params, change, loading, error) {
    this.model(name, params)
      .off('change', change)
      .off('loading', loading)
      .off('error', error)
  },

  on: function (event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(handler)
  },
  trigger: function (event, args) {
    if (this.listeners[event]) return false
    this.listeners[event].forEach(function (handler) {
      handler.apply(null, args)
    })
    return true
  },

  // args must be an array of arguments to pass to the handlers.
  triggerModel: function (model, params, what, args) {
    if (!this.model_listeners[model]) return false
    if ('string' !== typeof params) params = hashJson(params)
    if (!this.model_listeners[model][params]) return false
    if (!this.model_listeners[model][params][what].length) return false

    this.model_listeners[model][params][what].forEach(function (handler) {
      handler.apply(null, args)
    })
    return true
  },

  getModel: function (model, params, force) {
    if (!this.modelGetters[model]) {
      throw new Error("Don't know how to get model: " + model)
    }
    var pdata = hashJson(params)
    if (!force && this.data[model] && this.data[model][pdata]) {
      // TODO: clone here?
      return this.triggerModel(model, pdata, 'change', [this.data[model][pdata]])
    }
    this.triggerModel(model, pdata, 'loading', [true])
    var getter = this.modelGetters[model].bind(this)
      , done = function (err, data) {
          if (err) {
            if (false === this.triggerModel(model, pdata, 'error', [err])) {
              this.trigger('error', err)
            }
            return
          }
          if (!this.data[model]) this.data[model] = {}
          this.changeModel(model, pdata, data)
        }.bind(this)
    if ('string' === typeof getter) {
      return this._getWithParams(getter, params, done)
    }
    getter(params, done)
  },

  modelAction: function () {
  },

  changeModel: function (model, params, attr, value) {
    var pdata = hashJson(params)

    if (arguments.length === 3) {
      this.data[model][pdata] = attr
      this.triggerModel(model, pdata, 'change', [attr])
      return
    }

    if (!Array.isArray(attr)) {
      attr = [attr]
    }
    this.data[model][pdata] = React.addons.update(this.data[model][pdata], makeUpdate(attr, value))
    this.triggerModel(model, pdata, 'change', [attr, value])
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
