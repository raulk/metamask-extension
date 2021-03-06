const render = require('react-dom').render
const h = require('react-hyperscript')
const Root = require('./app/root')
const actions = require('./app/actions')
const configureStore = require('./app/store')
const txHelper = require('./lib/tx-helper')
const { OLD_UI_NETWORK_TYPE, BETA_UI_NETWORK_TYPE } = require('../app/scripts/config').enums

global.log = require('loglevel')

module.exports = launchMetamaskUi

log.setLevel(global.METAMASK_DEBUG ? 'debug' : 'warn')

function launchMetamaskUi (opts, cb) {
  var accountManager = opts.accountManager
  actions._setBackgroundConnection(accountManager)
  // check if we are unlocked first
  accountManager.getState(function (err, metamaskState) {
    if (err) return cb(err)
    const store = startApp(metamaskState, accountManager, opts)
    cb(null, store)
  })
}

function startApp (metamaskState, accountManager, opts) {
  // parse opts
  if (!metamaskState.featureFlags) metamaskState.featureFlags = {}
  const store = configureStore({

    // metamaskState represents the cross-tab state
    metamask: metamaskState,

    // appState represents the current tab's popup state
    appState: {},

    // Which blockchain we are using:
    networkVersion: opts.networkVersion,
  })

  const useBetaUi = metamaskState.featureFlags.betaUI
  const networkEndpointType = useBetaUi ? BETA_UI_NETWORK_TYPE : OLD_UI_NETWORK_TYPE
  store.dispatch(actions.setNetworkEndpoints(networkEndpointType))

  // if unconfirmed txs, start on txConf page
  const unapprovedTxsAll = txHelper(metamaskState.unapprovedTxs, metamaskState.unapprovedMsgs, metamaskState.unapprovedPersonalMsgs, metamaskState.unapprovedTypedMessages, metamaskState.network)
  const numberOfUnapprivedTx = unapprovedTxsAll.length
  if (numberOfUnapprivedTx > 0) {
    store.dispatch(actions.showConfTxPage({
      id: unapprovedTxsAll[numberOfUnapprivedTx - 1].id,
    }))
  }

  accountManager.on('update', function (metamaskState) {
    store.dispatch(actions.updateMetamaskState(metamaskState))
  })

  // start app
  render(
    h(Root, {
      // inject initial state
      store: store,
    }
  ), opts.container)

  return store
}
