
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
    get: function (args, done) {
      this.dao._getWithParams(url, this.params, function (err, data) {
        if (!err) this.changeModel(data)
        done(err, data)
      }.bind(this))
    },
    set: function (args, done) {
    }
  }
}

module.exports = function (baseUrl) {
  return new Dao(baseUrl, {
    'Project': {
      _type: RestModel('projects/:id'),
      get: 'projects/:id',
      // the context is {params: {}, change: fn(), dao: dao}
      changeData: function (args, dao, done) {
        this._post(this.url + '/data', {file: args.file}, function (err, data) {
          this.changeModel('filename', data.filename)
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

