
var Dao = require('./dao')
  , mixins = require('./mixins')
  , RestModel = mixins.RestModel

module.exports = function (baseUrl) {
  return new Dao(baseUrl, {
    /* Looks like
     * [{id: id, name: str, revisions: [{id: int, changed: Date}, ...]}]
     */
    Projects: {
      mixins: [RestModel('projects/')],
      actions: {
        create: function (args, done) {
          var url = this.dao._url(this.url + 'new')
          sendFile(url, 'file', args.file, {name: args.name}, function (err, data) {
            this.dao.replaceModel('Project', {
              pid: data.pid
            }, {
              name: args.name,
              revisions: [{id: data.rid, changed: data.revision.changed}]
            })
            this.dao.replaceModel('Revision', {
              pid: data.pid,
              rid: data.rid
            }, data.revision)
          }.bind(this))
        }
      }
    },
    /* Looks like
     *  {
     *    name: str,
     *    revisions: [{id: int, changed: Date}, ...]
     *  }
    Project: {
      mixins: [RestModel('projects/:id/')]
    },
     */

    /* Looks like
     * {
     *   version: int,
     *   changed: Date,
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
      mixins: [RestModel('projects/:pid/rev/:rid')]
      context: function (params) {
        return {
          newRevision: function (rid, revision) {
            this.dao.replaceModel('Revision', {
              id: params.pid,
              rid: rid
            }, revision)
            var update = {}
            update[this.params.pid] = {
              revisions: {
                $push: {id: rid, changed: revision.changed}
              }
            }
            this.dao.changeModel('Projects', null, update, true)
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
                pid: this.params.pid,
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
              pid: this.params.pid,
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
  })
}

