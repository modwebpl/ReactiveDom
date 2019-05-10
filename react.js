export class react {
  constructor(config) {
    let _this = this;

    this.signals = {};
    this.el = config.el || '*';
    this.prop = config.prop || 'data-prop';
    this.parse = config.parse || 'textContent';
    this.data = config.data;
    this.watch = config.watch || {};
    this.nodeList = {};

    this.Dep = {
      target: null,
      subs: {},
      depend(deps, dep) {
        if (!deps.includes(this.target)) deps.push(this.target);
        if (!_this.Dep.subs[this.target].includes(dep)) {
          _this.Dep.subs[this.target].push(dep)
        }
      },
      getValidDeps(deps, key) {
        return deps.filter(dep => this.subs[dep].includes(key))
      },
      notifyDeps(deps) {
        deps.forEach(val => _this.notify(val));
      }
    };

    this.observeData(config.data);
    if (Object.keys(_this.config.watch).length > 0) this.subscribeWatchers(config.watch, config.data);

    return {
      data: this.data,
      get: this.nodeList,
      prop(name, val) {
        _this.signals = {};
        _this.data[name] = val;
        typeof _this.data[name] === 'function' ? _this.makeComputed(_this.data, name, val) : _this.makeReactive(_this.data, name);
        if (Object.keys(_this.watch).length > 0) _this.subscribeWatchers(_this.watch, _this.data);
        return _this.parseDOM(document.body, _this.data);
      },
      watch(name, val) {
        _this.signals = {};
        _this.watch[name] = val;
        typeof _this.data[name] === 'function' ? _this.makeComputed(_this.data, name, val) : _this.makeReactive(_this.data, name);
        _this.subscribeWatchers(_this.watch, _this.data);
        return _this.parseDOM(document.body, _this.data);
      }
    }
  }

  notify(signal) {
    if (!this.signals[signal] || this.signals[signal].length < 1) return;
    this.signals[signal].forEach((signalHandler) => signalHandler())
  };

  subscribeWatchers(watchers, context) {
    let _this = this, key;
    for (key in watchers) {
      if (watchers.hasOwnProperty(key)) _this.observe(key, watchers[key].bind(context))
    }
  }

  observe(property, signalHandler) {
    if (!this.signals[property]) this.signals[property] = [];
    this.signals[property].push(signalHandler);
  }

  makeComputed(obj, key, computeFunc) {
    let _this = this, cache = null, deps = [];

    this.observe(key, () => {
      cache = null;
      deps = _this.Dep.getValidDeps(deps, key);
      _this.Dep.notifyDeps(deps, key)
    });

    Object.defineProperty(obj, key, {
      get() {
        if (_this.Dep.target) _this.Dep.depend(deps, key);
        _this.Dep.target = key;

        if (!cache) {
          _this.Dep.subs[key] = [];
          cache = computeFunc.call(obj)
        }
        _this.Dep.target = null;
        return cache;
      },
      set() {
      }
    })
  }

  makeReactive(obj, key) {
    let _this = this, deps = [], val = obj[key];

    Object.defineProperty(obj, key, {
      get() {
        if (_this.Dep.target) _this.Dep.depend(deps, key);
        return val
      },
      set(newVal) {
        val = newVal;
        deps = _this.Dep.getValidDeps(deps, key);
        _this.Dep.notifyDeps(deps, key);
        _this.notify(key)
      }
    })
  }

  observeData(obj) {
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) typeof obj[key] === 'function' ? this.makeComputed(obj, key, obj[key]) : this.makeReactive(obj, key)
    }
    this.parseDOM(document.body, obj)
  }

  sync(attr, node, observable, property) {
    node[attr] = observable[property];
    this.observe(property, () => {
      node[attr] = observable[property]
    });
  }

  parseDOM(node, observable) {
    let nodes = [].filter.call(this.el, (val) => {
      return val.getAttribute(this.prop) !== null;
    });
  
    nodes.forEach((val) => {
      this.nodeList[val.attributes[this.prop].value] = val;
      typeof (observable[val.attributes[this.prop].value]) !== 'undefined' ? this.sync(this.parse, val, observable, val.attributes[this.prop].value) : this.sync('value', val, observable, val.attributes[this.prop].value);
    });
  }
}
