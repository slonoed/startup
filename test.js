const chai = require('chai');
const { spy } = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const startup = require('./index');

const destroy = startup.destroy;

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('startup', () => {
  const cfg = {
    url: 'http://testurl.com',
  };
  const bCfg = {
    env: 'production',
  };

  it('should build startup from nodes', () => {
    return startup(
      [ModuleA, cfg],
      [ModuleB, ModuleA, bCfg]
    ).then(s => {
      const a = s(ModuleA);
      const b = s(ModuleB);
      a.getId().should.be.eql('A');
      b.getId().should.be.eql('BA');
    });
  });

  it('should build startup with 4 deps', () => {
    return startup(
      [ModuleA, cfg],
      [ModuleB, ModuleA, bCfg],
      [ModuleC, ModuleA, bCfg],
      [ModuleD, ModuleC, ModuleB, cfg]
    ).then(s => {
      const a = s(ModuleA);
      const b = s(ModuleB);
      const c = s(ModuleC);
      const d = s(ModuleD);
      a.getId().should.be.eql('A');
      b.getId().should.be.eql('BA');
      c.getId().should.be.eql('CA');
      d.getId().should.be.eql('DCABA');

    });
  });

  it('should build startup with 6 deps', () => {
    return startup(
      [ModuleA, cfg],
      [ModuleB, ModuleA, bCfg],
      [ModuleC, ModuleA, bCfg],
      [ModuleD, ModuleC, ModuleB, cfg],
      [ModuleE, ModuleC, ModuleD, ModuleG, cfg],
      [ModuleG]
    ).then(s => {
      const a = s(ModuleA);
      const b = s(ModuleB);
      const c = s(ModuleC);
      const d = s(ModuleD);
      const e = s(ModuleE);
      const g = s(ModuleG);
      a.getId().should.be.eql('A');
      b.getId().should.be.eql('BA');
      c.getId().should.be.eql('CA');
      d.getId().should.be.eql('DCABA');
      e.getId().should.be.eql('ECADCABAG');
      g.getId().should.be.eql('G');
    });
  });

  it('should throw on cycle deps', () => {
    return startup(
      [ModuleA, cfg, ModuleE], // cycle
      [ModuleB, ModuleA, bCfg],
      [ModuleC, ModuleA, bCfg],
      [ModuleD, ModuleC, ModuleB, cfg],
      [ModuleE, ModuleC, ModuleD, ModuleG, cfg],
      [ModuleG]
    ).should.be.rejected;
  });

  it('should throw on separate graphs', () => {
    const ModuleA = () => 1;
    const ModuleB = () => 1;
    const ModuleC = () => 1;
    const ModuleD = () => 1;
    const ModuleE = () => 1;

    return startup(
      [ModuleA],
      [ModuleB, ModuleA],
      // cycle
      [ModuleC, ModuleE],
      [ModuleE, ModuleD],
      [ModuleD, ModuleC]
    ).should.be.rejected;
  });

  it('should throw on separate graphs', () => {
    const ModuleA = () => 1;
    const ModuleB = () => 1;
    const ModuleC = () => 1;
    const ModuleD = () => 1;
    const ModuleE = () => 1;

    return startup(
      // cycle
      [ModuleC, ModuleE],
      [ModuleE, ModuleD],
      [ModuleD, ModuleC],

      [ModuleA],
      [ModuleB, ModuleA]
    ).should.be.rejected;
  });

  it('should throw on two deps linked each other', () => {
    const ModuleA = () => 1;
    const ModuleB = () => 1;

    return startup(
      // cycle
      [ModuleA, ModuleB],
      [ModuleB, ModuleA]
    ).should.be.rejected;
  });

  it('should create startup if module return not promise', () => {
    const A = () => ({ name: 'a name' });
    const B = (a) => ({ name: 'b', nameA: a.name });

    return startup(
      [A],
      [B, A]
    ).then((s) => s(B).nameA.should.be.eql('a name'));
  });

  it('should destroy components', () => {
    const spyA = spy();
    const A = () => ({ [destroy]: spyA });
    const B = () => 1;

    return startup(
      [A],
      [B, A]
    ).then(s => {
      return s.destroy().then(() => {
        spyA.should.have.been.calledOnce;
      });
    });
  });

  it('should destroy async components', () => {
    const spyA = spy();
    const A = () => ({ [destroy]: () => new Promise(resolve => {
      setTimeout(() => {
        spyA();
        resolve();
      }, 10);
    }) });
    const spyB = spy();
    const B = () => ({ [destroy]: spyB });

    return startup(
      [A],
      [B, A]
    ).then(s => {
      return s.destroy().then(() => {
        spyB.should.have.been.calledAfter(spyA);
      });
    });
  });
});

// Mocks

function ModuleA() {
  let id = null;

  const getId = () => id;
  const setId = (i) => {
    id = i;
  };

  return new Promise((resolve) => {

    setTimeout(() => {
      id = 'A';

      resolve({
        getId,
        setId
      });
    }, 100);
  });
}
function ModuleB(moduleA) {
  return new Promise((resolve) => {
    resolve({
      getId: () => 'B' + moduleA.getId()
    });
  });

}
function ModuleC(moduleA) {

  return new Promise((resolve) => {
    resolve({
      getId: () => 'C' + moduleA.getId()
    });
  });

}
function ModuleD(moduleB, moduleC) {
  return new Promise((resolve) => {
    resolve({
      getId: () => 'D' + moduleB.getId() + moduleC.getId()
    });
  });
}
function ModuleE(moduleC, moduleD, moduleG) {
  return new Promise((resolve) => {
    resolve({
      getId: () => 'E' + moduleC.getId() + moduleD.getId() + moduleG.getId()
    });
  });
}
function ModuleG() {

  return new Promise((resolve) => {

    setTimeout(() => {

      resolve({
        getId: () => 'G'
      });
    }, 100);
  });

}
