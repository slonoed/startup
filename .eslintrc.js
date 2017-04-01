module.exports = {
  extends: 'airbnb-base',
  env: {
    mocha: true
  },
  rules: {
    'arrow-body-style': 0,
    'arrow-parens': 'as-needed',
    'no-use-before-define': ['error', { 'functions': false }]
  }
};
