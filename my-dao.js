
var Dao = require('./dao')

function Project(params, dao) {
  return new RestModel('Project', 'projects/:id', params, dao, {
    changeData: function (args, done) {
      this.dao._post(this.url + '/data', {file: args.file}, function (err, data) {
        this.changeModel('filename', data.filename)
      })
    }
  })
}

function Project(params, dao) {
  RestModel.call(this, 'Project', 'projects/:id', params, dao)
}

Project.prototype.actions = {
  changeData: function (args, done) {
    this.dao._post(this.url + '/data', {file: args.file}, function (err, data) {
      this.changeModel('filename', data.filename)
    })
  }
}

function RestModel(url) {
  return {
    context: function (params) {
      return {url: fillUrl(url, params)}
    },
    actions; {
      get: function (args, done) {
        this.dao._getWithParams(url, this.params, function (err, data) {
          if (!err) this.replaceModel(data)
          done(err, data)
        }.bind(this))
      },
      setAttr: function (args, done) {
        var data = {}
        data[args.attr] = args.value
        this.dao._postWithParams(url, this.params, data, function (err, data) {
          if (!err) this.changeModel(args.attr, args.value)
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

module.exports = function (baseUrl) {
  return new Dao(baseUrl, {
    'Project': {
      mixins: [RestModel('projects/:id')],
      // the context is {params: {}, changeModel: fn(), replaceModel: fn(), dao: dao}
      changeData: function (args, done) {
        this.dao._post(this.url + '/data', {file: args.file}, function (err, data) {
          if (err) return done(err)
          this.changeModel({
            filename: data.filename
          })
          for (var id in data.feature_data) {
            this.dao.replaceModel('FeatureData', {
              pid: this.params.id,
              id: id
            }, data.feature_data[id])
          }
          this.dao.replaceModel('InstanceSmall', {
            id: this.params.id
          }, data.instances)
          done(err, data)
        })
      }
    }
  }, function (action, onerr) {
    switch (action.type) {
      case 'changeProjectData':
        this._postWithParams('project/:id', action, function (err, data) {
          if (err) return onerr(err)
          this.
        }.bind(this))
    }
  })

  return new Dispatcher({
    changeProjectData: ['file']
  })
}

