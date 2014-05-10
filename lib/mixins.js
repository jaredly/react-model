
module.exports = {
  TestModel: TestModel,
  RestModel: RestModel
}

function TestModel(url) {
  return {
    actions: {
      get: function (args, done) {
        var data = this.dao.getCached(this.model, this.params)
        if (!data) {
          data = this.createData()
        }
        this.replaceModel(data)
        done(null, data)
      },
      setAttr: function (args, done) {
        var update = {}
        update[args.attr] = args.value
        this.changeModel(update)
        done(null, data)
      },
      set: function (args, done) {
        this.changeModel(args.data)
        done(null, data)
      }
    }
  }
}

function RestModel(url) {
  return {
    context: function (params) {
      return {url: utils.fillUrl(url, params)}
    },
    actions; {
      get: function (args, done) {
        var cached = this.dao.getCached(this.model, this.params)
        if (cached) {
          this.replaceModel(cached)
          return done(null, cached)
        }
        this.dao._getWithParams(url, this.params, function (err, data) {
          if (!err) this.replaceModel(data)
          done(err, data)
        }.bind(this))
      },
      setAttr: function (args, done) {
        var update = {}
        update[args.attr] = args.value
        this.dao._postWithParams(url, this.params, update, function (err, data) {
          if (!err) this.changeModel(update)
          done(err, data)
        }.bind(this))
      },
      set: function (args, done) {
        this.dao._postWithParams(url, this.params, args.data, function (err, data) {
          if (!err) this.changeModel(args.data)
          done(err, data)
        }.bind(this))
      }
    }
  }
}

