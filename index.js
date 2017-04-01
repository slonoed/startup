const destroySym = Symbol();
module.exports = function system(...specs) {
  const nodes = specs.map(s => createNode(...s));
  const nodeByFactory = p => find(nodes, n => n.factory === p);

  nodes.forEach(node => {
    node.edges = compact(node.params.map(nodeByFactory));
    node._edges = copyArray(node.edges);
  });
  // main node, used only for build system
  const main = createNode(() => Promise.resolve('main node'));
  const hasNoIncomingEdge = node => nodes.every(n => n._edges.indexOf(node) === -1);
  // toposort
  const L = [];
  const S = nodes.filter(n => hasNoIncomingEdge(n));
  main.edges = copyArray(S);
  while (S.length) {
    const node = S.pop();
    L.push(node);
    let i = node._edges.length;
    while (i--) {
      const m = node._edges[i];
      node._edges.pop();
      if (hasNoIncomingEdge(m)) {
        S.push(m);
      }
    }
  }
  const nodeWithEdge = find(nodes, n => n._edges && n._edges.length > 0);

  if (nodeWithEdge) {
    return Promise.reject(new Error('Cycles found'));
  }

  const instances = [];
  const initNode = node => {
    const { factory, params } = node;
    let c = Promise.resolve(null);
    node.edges.forEach(e => {
      c = c.then(() => initNode(e));
    });

    let tid;
    return c.then(() => {
      // if node already inited, return instance
      if (node.instance != null) {
        return node.instance;
      }

      const paramsWithInstances = params.map(p => {
        const n = nodeByFactory(p);
        return n != null && n.instance != null ? n.instance : p;
      });

      tid = setTimeout(() => {
        logger.error(new Error('Node init timeout'), {
          factory: factory.toString().substring(0, 100)
        });
      }, 35000);
      // if not inited - init it
      return factory(...paramsWithInstances);
    }).then(instance => {
      if (tid) {
        clearTimeout(tid);
      }
      node.instance = instance; // eslint-disable-line
      instances.push(instance);
    });
  };

  return initNode(main).then(() => {
    const sys = f => {
      const node = nodeByFactory(f);
      if (node == null) {
        return null;
      }
      return node.instance;
    };
    sys.destroy = () => {
      return instances.reduce((p, i) => p.then(() => {
        return typeof i[destroySym] === 'function' ?
          i[destroySym]() :
          null;
      }), Promise.resolve());
    };

    return sys;
  });
}
module.exports.destroy = destroySym;

function createNode(factory, ...params) {
  return {
    factory,
    params,
    edges: [],
    _edges: [],
    instance: null
  };
}

function copyArray(edges) {
  return edges.slice();
}

function compact(list) {
  return list.filter(Boolean);
}

function find(list, foo) {
  for (let i = 0, l = list.length; i < l; i++) {
    if (foo(list[i])) {
      return list[i];
    }
  }
  return null;
}
