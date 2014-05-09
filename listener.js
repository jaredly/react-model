
// a transaction-aware change listener

module.exports = Listener

function Listener() {
  this.listeners = {}
  this.queue = []
  this.queuing = {}
  this.transaction = false
}

Listener.prototype = {
  startTransaction: function () {
    if (this.transaction) {
      throw new Error('Already in a transaction')
    }
    this.transaction = true
    this.queuing = {}
    this.queue = []
  },
  finishTransation: function () {
    this.queue.forEach(function (item) {
      this.trigger(item.event, item.args, true)
    }.bind(this))
    this.transaction = false
    this.queuing = {}
    this.queue = []
  },

  modelEvent: function (model, params, what) {
    var pdata = hashJson(params)
    return model + ':' + pdata + ':' + what
  },

  onModel: function (model, params, what, fn) {
    return this.on(this.modelEvent(model, params, what), fn)
  },
  offModel: function (model, params, what, fn) {
    return this.off(this.modelEvent(model, params, what), fn)
  },

  on: function (event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(handler)
  },
  off: function (event, handler) {
    if (!this.listeners[event]) return
    var ix = this.listeners[event].indexOf(handler)
    if (ix === -1) return false
    this.listeners[event].splice(ix, 1)
    return true
  },

  // args must be an array of arguments to pass to the handlers.
  trigger: function (event, args, force) {
    if (this.listeners[event]) return
    if (this.transaction && !force) {
      this.queueEvent(event, args)
      return
    }
    this.listeners[event].forEach(function (handler) {
      handler.apply(null, args)
    })
  },
  queueEvent: function (event, args) {
    var evt = {
      event: event,
      args: args
    }
    if (!this.queuing[event]) {
      this.queuing[event] = evt
      return this.queue.push(evt)
    }
    evt = this.queuing[event]

    // move event to the end of the queue... is good idea?
    this.queue.splice(this.queue.indexOf(evt), 1)
    this.queue.push(evt)

    // merge.. XXX: magic string
    if (event.indexOf('change' === 0)) {
      if (args[1]) { // is update
        if (evt.args[1]) {
          mergeUpdates(evt.args[0], args[0])
        } else {
          evt.args[0] = React.addons.update(evt.args[0], args[0])
        }
        return
      }
    }
    this.queuing[event].args = args
  },
  triggerModel: function (model, params, what, args) {
    return this.trigger(this.modelEvent(model, params, what), args)
  },
}

function mergeUpdates(dest, src) {
  for (var name in src) {
    if (undefined === dest[name]) {
      dest[name] = src[name]
    } else {
      if (src[name].$set) {
        dest[name] = src[name]
      } else if (dest[name].$set) {
        dest[name].$set = React.addons.update(dest[name].$set, src[name])
      } else {
        mergeUpdates(dest[name], src[name])
      }
    }
  }
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

