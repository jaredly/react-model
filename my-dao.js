
var Dao = require('./dao')

function RestModel(url) {
  return {
    context: function (params) {
      return {url: fillUrl(url, params)}
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

module.exports = function (baseUrl) {
  return new Dao(baseUrl, {
    ProjectList: {
      mixins: [RestModel('projects/')]
    },
    /* Looks like
     * [{id: int, changed: Date}, ...]
     */
    RevisionsList: {
      mixins: [RestModel('projects/:id/rev/')]
    },
    /* Looks like
     * {
     *   version: int,
     *   modified: Date,
     *   config: {
     *     data: {
     *       filename: '',
     *       classes: [],
     *       headers: [],
     *     },
     *     features: {},
     *     learnesr: {},
     *     reducers: {}
     *   },
     *   results: {
     *     lid: {
     *       time: execution time,
     *       accuracy: float
     *     },
     *     ...
     *   }
     * }
     */
    Revision: {
      mixins: [RestModel('projects/:id/rev/:rid')]
      context: function (params) {
        return {
          newRevision: function (rid, revision) {
            this.dao.replaceModel('Revision', {
              id: params.id,
              rid: rid
            }, revision)
            this.dao.changeModel('RevisionsList', {
              id: params.id
            }, {
              $push: {id: rid, changed: new Date()}
            }, true)
          }
        }
      },
      actions: {
        // the context is {params: {}, changeModel: fn(), replaceModel: fn(), dao: dao}
        changeData: function (args, done) {
          this.dao._post(this.url + '/data', {file: args.file}, function (err, data) {
            if (err) return done(err)
            if (data.rid !== this.params.rid) {
              this.newRevision(data.rid, data.revision)
            } else {
              this.changeModel({
                filename: data.filename
              })
            }
            for (var id in data.feature_data) {
              this.dao.replaceModel('FeatureData', {
                pid: this.params.id,
                rid: data.rid,
                id: id
              }, data.feature_data[id])
            }
            this.dao.replaceModel('InstanceSmall', {
              rid: data.rid,
              id: this.params.id
            }, data.instances)
            done(err, data)
          })
        },
        changeFeature: function (args, done) {
          this.dao._post(this.url + '/features/' + args.id, args.data, function (err, data) {
            if (err) return done(err)
            if (data.rid !== this.params.rid) {
              this.newRevision(data.rid, data.revision)
            } else {
              var update = {features: {}}
              update.features[args.id] = args.data
              this.changeModel(update, true)
            }
            this.dao.replaceModel('FeatureData', {
              pid: this.params.id,
              rid: data.rid,
              id: args.id
            }, data.feature_data)
            done(err, data)
          })
        }
      }
    },
    /**
     * Looks like
     * [{id: id, data: ...}],
     */
    Trials: {
      mixins: [RestModel('projects/:id/rev/:rid/trials/')]
    },
    /* Looks like
     *  {
     *    id: id,
     *    revision: rid,
     *    target: {
     *      type: 'feature' || 'reducer' || 'learner',
     *      id: fid,
     *      param: str
     *    },
     *    range: {
     *      from: 1,
     *      to: 10,
     *      step: 1
     *    },
     *    OR (range or search)
     *    search: {
     *      // not sure about this
     *    },
     *    results: {
     *      [arg value]: {...results summary...},
     *      ...
     *    }
     *  }
     */
    Trial: {
      mixins: [RestModel('projects/:id/rev/:rid/trials/:tid')],
    },
    /* Looks like
     *  {
     *    lid: {
     *      execution_time: ...,
     *      accuracy: float,
     *      confusion: [...],
     *      assignments: [],
     *      extra: {} // whatever
     *    },
     *    ...
     *  }
     */
    Results: {
      context: function (params) {
        var url = 'projects/' + params.pid
        url += '/rev/' + params.rid
        url += '/results/'
        return {
          url: url,
          // url: url + params.ids.join(',')
        }
      },
      actions: {
        get: function (args, done) {
          var need = []
            , cached = {}
          this.params.ids.forEach(function (id) {
            var data = this.dao.getCached('Result', {
              pid: this.params.pid,
              rid: this.params.rid,
              id: id
            })
            if (data) cached[id] = data
            else need.push(id)
          }.bind(this))
          if (!need.length) {
            this.replaceModel(cached, true)
            return done(err, cached)
          }
          this.dao._get(this.url + need.ids.join(','), function (err, data) {
            if (err) return done(err)
            for (var id in data) {
              cached[id] = data[id]
              this.dao.replaceModel('Result', {
                pid: this.params.id,
                rid: this.params.rid,
                id: id
              }, data[id])
            }
            this.replaceModel(cached, true)
            done(err, data)
          }.bind(this))
        },
        refresh: function (args, done) {
          this.dao._get(this.baseUrl + args.id, function (err, data) {
            if (err) return done(err)
            var update = {}
            update[args.id] = data
            this.dao.replaceModel('Result', {
              pid: this.params.id,
              rid: this.params.rid,
              id: args.id
            }, data)
            this.changeModel(update, false, true)
            done(err, data)
          }.bind(this))
        },
      }
    },
    /* Looks like
     *  [
     *    value, value, ...
     *  ]
     */
    FeatureData: {
      minixs: [RestModel('projects/:pid/rev/:rid/features/:id/data')],
    },
    /* Looks like
     *  [
     *    {vclass: str, has_img: bool, has_vid: bool, meta: {}, filename: ?},
     *    ...
     *  ]
     */
    InstanceSmall: {
      mixins: [RestModel('projects/:pid/rev/:rid/raw-data')]
    },
    Project: {
      mixins: [RestModel('projects/:id/:rid')],
    }
  })
}

