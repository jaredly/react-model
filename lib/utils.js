
module.exports = {
  stringParams: stringParams,
  fillUrl: fillUrl,
  hashJson: hashJson,
  merge: merge,
  mergeUpdates: mergeUpdates
}

function stringParams(params, props, state, comp) {
  var data = {}
    , attr
    , val
  for (var name in params) {
    attr = params[name].split('.')
    switch (attr[0]) {
      case 'state': val = state; break;
      case 'props': val = props; break;
      default: val = comp[attr[0]]
    }
    attr.shift()
    var next
    while (attr.length) {
      next = attr.shift()
      val = ('object' === typeof val && val) ? val[next] : val
    }
    data[name] = val
  }
  return data
}

function fillUrl(url, params) {
  return url.replace(/:[^\/]+/g, function (what) {
    return params[what.slice(1)] || what
  })
}

function hashJson(obj) {
  if (obj === undefined) return 'null'
  if (Array.isArray(obj)) {
    return '[' + obj.map(hashJson).join(', ') + ']'
  }
  if ('object' !== typeof obj) {
    return JSON.stringify(obj)
  }
  var keys = Object.keys(obj)
  keys.sort()
  return '{' + keys.map(function (name) {
    var val = obj[name]
      , red
    return JSON.stringify(name) + ': ' + hashJson(val)
  }).join(', ') + '}'
}

function merge(a, b) {
  for (var c in b) {
    a[c] = b[c]
  }
  return a
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

