import { setWallet } from "./utils/actions.js";
import { createStore } from "redux";
//import { getConnextClient } from "connext/dist/Connext.js";
import Connext from 'connext';
import { types, getters, big, createClient } from "connext/dist";
import ProviderOptions from "../dist/utils/ProviderOptions.js";
import clientProvider from "../dist/utils/web3/clientProvider.js";
import { Big, maxBN, minBN } from 'connext/dist/lib/bn.js';
import { createWalletFromMnemonic, createWallet } from "./walletGen";
import axios from "axios";
//import BigNumber from "bignumber.js";
//import {CurrencyType} from "connext/dist/state/ConnextState/CurrencyTypes";
//import CurrencyConvertable from "connext/dist/lib/currency/CurrencyConvertable";
//import getExchangeRates from "connext/dist/lib/getExchangeRates";
import interval from "interval-promise";
import fs from 'fs';
import Storage from './utils/Storage.js';
import Express from 'express';
import Http from 'http';
import socketIo from 'socket.io';

const { CurrencyType, CurrencyConvertable } = types
const { getExchangeRates, hasPendingOps } = new Connext.Utils();
//const { Big, maxBN, minBN } = Connext.big
export const store = createStore(setWallet, null);


let publicUrl='localhost';
let localStorage = new Storage();
let webSocket;

const Web3 = require("web3");
const eth = require("ethers");
//const BN = Web3.utils.BN;
//const humanTokenAbi = require("./abi/humanToken.json");

const env = process.env.NODE_ENV;
const ERC20 = [{ "constant": true, "inputs": [], "name": "name", "outputs": [{ "name": "", "type": "string" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "minter", "outputs": [{ "name": "", "type": "address" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "o_success", "type": "bool" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "totalSupply", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "_recipient", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "createIlliquidToken", "outputs": [{ "name": "o_success", "type": "bool" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "_from", "type": "address" }, { "name": "_recipient", "type": "address" }, { "name": "_amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "name": "o_success", "type": "bool" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "endMintingTime", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "_recipient", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "createToken", "outputs": [{ "name": "o_success", "type": "bool" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [{ "name": "", "type": "address" }], "name": "illiquidBalance", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [{ "name": "_recipient", "type": "address" }, { "name": "_amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "o_success", "type": "bool" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "LOCKOUT_PERIOD", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }, { "name": "_spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "o_remaining", "type": "uint256" }], "payable": false, "type": "function" }, { "constant": false, "inputs": [], "name": "makeLiquid", "outputs": [], "payable": false, "type": "function" }, { "inputs": [{ "name": "_minter", "type": "address" }, { "name": "_endMintingTime", "type": "uint256" }], "payable": false, "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "_from", "type": "address" }, { "indexed": true, "name": "_recipient", "type": "address" }, { "indexed": false, "name": "_value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "_owner", "type": "address" }, { "indexed": true, "name": "_spender", "type": "address" }, { "indexed": false, "name": "_value", "type": "uint256" }], "name": "Approval", "type": "event" }]

const tokenAbi = ERC20;
const WS_PORT = 1337;
const MAX_HISTORY_ITEMS = 20;

const StatusEnum = {stopped:"stopped", running: "running", paused: "paused"};

const overrides = {
  localHub: process.env.REACT_APP_LOCAL_HUB_OVERRIDE,
  localEth: process.env.REACT_APP_LOCAL_ETH_OVERRIDE,
  rinkebyHub: process.env.REACT_APP_RINKEBY_HUB_OVERRIDE,
  rinkebyEth: process.env.REACT_APP_RINKEBY_ETH_OVERRIDE,
  ropstenHub: process.env.REACT_APP_ROPSTEN_HUB_OVERRIDE,
  ropstenEth: process.env.REACT_APP_ROPSTEN_ETH_OVERRIDE,
  mainnetHub: process.env.REACT_APP_MAINNET_HUB_OVERRIDE,
  mainnetEth: process.env.REACT_APP_MAINNET_ETH_OVERRIDE
};

const DEPOSIT_ESTIMATED_GAS = new Big("700000") // 700k gas
//const DEPOSIT_MINIMUM_WEI = new BigNumber(Web3.utils.toWei("0.020", "ether")); // 30 FIN
const HUB_EXCHANGE_CEILING = eth.constants.WeiPerEther.mul(Big(69)); // 69 TST
const CHANNEL_DEPOSIT_MAX = eth.constants.WeiPerEther.mul(Big(30)); // 30 TST
const HASH_PREAMBLE = "SpankWallet authentication message:"
const LOW_BALANCE_THRESHOLD = Big(process.env.LOW_BALANCE_THRESHOLD);

export function start() {
  const app = new App();
  app.init();
  //console.log('state:', app.state);
}

class App  {
  constructor() {
    //super(props);
    this.state = {
      loadingConnext: true,
      rpcUrl: null,
      hubUrl: null,
      tokenAddress: null,
      channelManagerAddress: null,
      hubWalletAddress: null,
      web3: null,
      customWeb3: null,
      tokenContract: null,
      connext: null,
      delegateSigner: null,
      authorized: "false",
      approvalWeiUser: "10000",
      channelState: null,
      exchangeRate: "0.00",
      interval: null,
      connextState: null,
      runtime: null,
      sendScanArgs: {
        amount: null,
        recipient: null
      },
      address: "",
      status: {
        deposit: "",
        withdraw: "",
        payment: "",
        hasRefund: ""
      },
      browserMinimumBalance: null,
      autopayState: StatusEnum.stopped,
      history: []
    };

    //this.networkHandler = this.networkHandler.bind(this);
  }

  // ************************************************* //
  //                     Hooks                         //
  // ************************************************* //

  setState(entry) {
    for (var prop in entry) {
      this.state[prop] = entry[prop];
    }
  }

  async init() {

    const storeFile = "./.store";

    // Set up state
    var data
    var fileStore
    try {
      data = fs.readFileSync(storeFile, 'utf8')
      //console.log(data)
      fileStore = new Map(JSON.parse(data))
      //console.log('store data', fileStore)
    } catch(err) {
        console.log(err.message)
    }

    // Set up state
    const mnemonic = fileStore.get("mnemonic");
    //console.log('mnemonic', mnemonic);
    // on mount, check if you need to refund by removing maxBalance
    fileStore.delete("refunding");
    let rpc = fileStore.get("rpc-prod");
    // TODO: better way to set default provider
    // if it doesnt exist in storage
    if (!rpc) {
      rpc = "ROPSTEN"//env === "development" ? "LOCALHOST" : "MAINNET";
      fileStore.set("rpc-prod", rpc);
    }
    // If a browser address exists, create wallet
    if (mnemonic) {
      const delegateSigner = await createWalletFromMnemonic(mnemonic);
      const address = await delegateSigner.getAddressString();
      //TODO - no state
      this.setState({
        'delegateSigner': delegateSigner,
        'address': address,
        mnemonic
      });
      //console.log('address', address)
      store.dispatch({
        type: "SET_WALLET",
        text: delegateSigner
      });

      console.log('setWeb3')
      await this.setWeb3(rpc);
      console.log('setConnext')
      await this.setConnext();
      console.log('setTokencontract')
      await this.setTokenContract();

      console.log('pollConnextState')
      await this.pollConnextState();
      console.log('setBrowserWalletMinimumBalance')
      await this.setBrowserWalletMinimumBalance();
      console.log('poller')
      await this.poller();
    } else {
      // Else, we create a new address
      const delegateSigner = await createWallet(this.state.web3);
      const address = await delegateSigner.getAddressString();
      this.setState({
          'delegateSigner': delegateSigner,
          'address': address
      });
      store.dispatch({
        type: "SET_WALLET",
        text: delegateSigner
      });
      // Then refresh the page
      //window.location.reload();
    }

    // Initialise authorisation
    //await this.authorizeHandler();

    // Start websockets server
    await this.startWsServer();

  }

  async startWsServer() {
    const express = Express();
    const server = Http.Server(express);
    webSocket = socketIo(server);

    server.listen(WS_PORT);

    console.log(`Listening on port ${WS_PORT}...`);
    // WARNING: app.listen(80) will NOT work here!

    express.get('/', function (req, res) {
      res.sendFile(__dirname + '/index.html');
    });

    webSocket.on('connection', (socket) => {
      console.log('WS connection');
      socket.emit('autopay', { is: 'connected' });
      socket.on('payment-request', async (request) => {
        console.log('payment request', request);
        const payRequest = JSON.parse(request);
        await this.sendPayment(payRequest.to, payRequest.amount);
      });

      socket.on('status', () => {
        //console.log('received status request')
        this.sendStatusMessage();
      });

      socket.on('pause', () => {
        console.log("pausing at client's request");
        this.pausePaymentsAndNotify()
      });

      socket.on('release', () => {
        console.log("resuming at client's request");
        this.resumePaymentsAndNotify()
      });
    });

    this.setState({ autopayState: StatusEnum.running });
  }

  async sendStatusMessage() {
    const status = {
      address: this.state.address,
      balance: this.state.channelState ? this.state.channelState.balanceTokenUser : "0",
      txHistory: this.state.history,
      hubCollateral: this.state.channelState ? this.state.channelState.balanceTokenHub : "0",
      status: this.state.autopayState
    }
    webSocket.emit('status', JSON.stringify(status));
  }

  // ************************************************* //
  //                State setters                      //
  // ************************************************* //

  // either LOCALHOST MAINNET or RINKEBY
  async setWeb3(rpc) {
    console.log('setWeb rpc', rpc);
    let rpcUrl, hubUrl;
    switch (rpc) {
      case "LOCALHOST":
        rpcUrl = overrides.localEth || `${publicUrl}/api/local/eth`;
        hubUrl = overrides.localHub || `${publicUrl}/api/local/hub`;
        break;
      case "RINKEBY":
        rpcUrl = overrides.rinkebyEth || `${publicUrl}/api/rinkeby/eth`;
        hubUrl = overrides.rinkebyHub || `${publicUrl}/api/rinkeby/hub`;
        break;
      case "ROPSTEN":
        rpcUrl = overrides.ropstenEth || `${publicUrl}/api/ropsten/eth`;
        hubUrl = overrides.ropstenHub || `${publicUrl}/api/ropsten/hub`;
        break;
      case "MAINNET":
        rpcUrl = overrides.mainnetEth || `${publicUrl}/api/mainnet/eth`;
        hubUrl = overrides.mainnetHub || `${publicUrl}/api/mainnet/hub`;
        break;
      default:
        throw new Error(`Unrecognized rpc: ${rpc}`);
    }
    console.log('hubUrl', hubUrl)


    const providerOpts = new ProviderOptions(store, rpcUrl, hubUrl).approving();
    const provider = clientProvider(providerOpts);
    const customWeb3 = new Web3(provider);
    const customId = await customWeb3.eth.net.getId();
    // NOTE: token/contract/hubWallet ddresses are set to state while initializing connext

    console.log('saving state...', customId)
    //TODO - no state
    //this.setState({ customWeb3, hubUrl, rpcUrl });
    this.setState({
      'customWeb3': customWeb3,
      'hubUrl': hubUrl,
      'rpcUrl': rpcUrl
    });

    // TODO - check network
    /*
    if (windowId && windowId !== customId) {
      alert(
        `Your card is set to ${JSON.stringify(
          rpc
        )}. To avoid losing funds, please make sure your metamask and card are using the same network.`
      );
    }
    */
    return;
  }

  async sendPayment(toAccount, amount) {
    // Check status
    if (this.state.autopayState !== StatusEnum.running) {
      console.log('Payment requested but autosigning is paused');
      return
    }
    debugger;
    let balance = this.state.channelState ? this.state.channelState.balanceTokenUser : 0;
    const amtWei = Web3.utils.toWei(amount);
    const payAmount = Web3.utils.isBN(amtWei) ? amtWei : Big(amtWei);
    let bnBal = Big(balance);
    if (bnBal.lt(payAmount)) {
      console.log(` Payment declined. Requested payment amount: ${payAmount} exceeds balance: ${balance}.`);
      return
    }

    const payment = {
        meta: {
          purchaseId: "payment"
          // memo: "",
        },
        payments: [
          {
            recipient: toAccount,
            amount: {
              amountToken: amtWei,
              amountWei: "0"
            },
            type: "PT_CHANNEL"
          }
        ]
      };

      try {
        await this.state.connext.buy(payment);
        this.addToHistory(payment);
        console.log('sendPayment done')
      } catch (err) {
        console.log(err.message)
      }

      // Evaluate new balance. See if autosigning should be paused.
      balance = this.state.channelState ? this.state.channelState.balanceTokenUser : '0';
      bnBal = Big(balance);
      if (bnBal.lte(LOW_BALANCE_THRESHOLD)) {
        this.pausePaymentsAndNotify();
      }
  }

  pausePaymentsAndNotify() {
    webSocket.emit('pausing', 'Temporarily pausing payments.');
    this.setState({ autopayState: StatusEnum.paused });
    this.sendStatusMessage();
  }

  resumePaymentsAndNotify() {
    webSocket.emit('resuming', 'Temporarily resuming payments.');
    this.setState({ autopayState: StatusEnum.running });
    this.sendStatusMessage();
  }

  checkForTopup() {
    if  (this.state.autopayState === StatusEnum.paused) {
      const balance = this.state.channelState ? this.state.channelState.balanceTokenUser : 0;
      let bnBal = Big(balance);
      if (bnBal.gt(LOW_BALANCE_THRESHOLD)) {
        this.resumePaymentsAndNotify();
      }
    }
  }

  async addToHistory(event) {
    let eventText = '';
    if (event.meta && event.meta.purchaseId === "payment") {
      eventText = `Payment of ${Web3.utils.fromWei(event.payments[0].amount.amountToken)} to ${event.payments[0].recipient}. Type: ${event.payments[0].type}`;
    }

    let history = this.state.history;

    if (history.length >= MAX_HISTORY_ITEMS) {
      history.pop();
    }
    history.unshift(eventText);
    this.setState({ history: history })
  }

  async setTokenContract() {
    try {
      let { customWeb3, tokenAddress } = this.state;
      const tokenContract = new customWeb3.eth.Contract(tokenAbi, tokenAddress);
      this.setState({ tokenContract });
    } catch (e) {
      console.log("Error setting token contract");
      console.log(e);
    }
  }

  async setConnext() {
    console.log('setting Connext')
    const { address, customWeb3, hubUrl, mnemonic } = this.state;

    const opts = {
      web3: customWeb3,
      hubUrl: hubUrl, // in dev-mode: http://localhost:8080,
      user: address,
      origin: "localhost", // TODO: what should this be
      mnemonic: mnemonic
    };

    // *** Instantiate the connext client ***
    console.log('getting Connext client')
    try {
      const connext = await createClient(opts);
      console.log(`Successfully set up connext! Connext config:`);
      console.log(`  - tokenAddress: ${connext.opts.tokenAddress}`);
      console.log(`  - hubAddress: ${connext.opts.hubAddress}`);
      console.log(`  - contractAddress: ${connext.opts.contractAddress}`);
      console.log(`  - ethNetworkId: ${connext.opts.ethNetworkId}`);
      this.setState({
        connext,
        tokenAddress: connext.opts.tokenAddress,
        channelManagerAddress: connext.opts.contractAddress,
        hubWalletAddress: connext.opts.hubAddress,
        ethNetworkId: connext.opts.ethNetworkId
      });
    } catch (err) {
      console.log(err.message)
    }
  }

  // ************************************************* //
  //                    Pollers                        //
  // ************************************************* //

  async pollConnextState() {
    let connext = this.state.connext;
    // register listeners
    connext.on("onStateChange", state => {
      console.log("Connext state changed:");
      this.setState({
        channelState: state.persistent.channel,
        connextState: state,
        runtime: state.runtime,
        exchangeRate: state.runtime.exchangeRate
          ? state.runtime.exchangeRate.rates.USD
          : 0
      });
      // Check whether, if autosigning is paused, the balance has been topped up sufficiently.
      this.checkForTopup();
    });
    // start polling
    await connext.start();
    console.log('connext loaded')
    this.setState({ loadingConnext: false })
  }

  async poller() {
    await this.autoDeposit();
    await this.autoSwap();

    interval(
      async (iteration, stop) => {
        await this.autoDeposit();
      },
      5000
    )

    interval(
      async (iteration, stop) => {
        await this.autoSwap();
      },
      1000
    )

    interval(
      async (iteration, stop) => {
        await this.checkStatus();
      },
      400
    )

    interval(
      async (iteration, stop) => {
        await this.getCustodialBalance();
      },
      5000
    )

  }

  async setBrowserWalletMinimumBalance() {
    const { customWeb3, connextState } = this.state
    if (!customWeb3 || !connextState) {
      return
    }
    const defaultGas = new Big(await customWeb3.eth.getGasPrice())
    // default connext multiple is 1.5, leave 2x for safety
    const depositGasPrice = DEPOSIT_ESTIMATED_GAS
      .multipliedBy(new Big(2))
      .multipliedBy(defaultGas)
    // add dai conversion
    const minConvertable = new CurrencyConvertable(
      CurrencyType.WEI,
      depositGasPrice,
      () => getExchangeRates(connextState)
    )
    const browserMinimumBalance = {
      wei: minConvertable.toWEI().amount,
      dai: minConvertable.toUSD().amount
    }
    this.setState({ browserMinimumBalance })
    return browserMinimumBalance
  }

  async autoDeposit() {
    const {
      address,
      tokenContract,
      connextState,
      tokenAddress,
      exchangeRate,
      channelState,
      rpcUrl,
      browserMinimumBalance,
    } = this.state;
    if (!rpcUrl) {
      return;
    }

    if (!browserMinimumBalance) {
      return
    }

    const web3 = new Web3(rpcUrl);
    const balance = await web3.eth.getBalance(address);

    const refunding = localStorage.getItem("refunding");
    if (refunding) {
      return;
    }

    const maxBalanceAfterRefund = localStorage.getItem("maxBalanceAfterRefund");
    if (
      maxBalanceAfterRefund &&
      new Big(balance).gte(new Big(maxBalanceAfterRefund))
    ) {
      // wallet balance hasnt changed since submitting tx, returning
      return;
    } else {
      // tx has been submitted, delete the maxWalletBalance from storage
      localStorage.removeItem("refunding");
      localStorage.removeItem("maxBalanceAfterRefund");
    }

    let tokenBalance = "0";
    try {
      tokenBalance = await tokenContract.methods.balanceOf(address).call();
    } catch (e) {
      console.warn(
        `Error fetching token balance, are you sure the token address (addr: ${tokenAddress}) is correct for the selected network (id: ${await web3.eth.net.getId()}))? Error: ${
          e.message
        }`
      );
    }

    if (balance !== "0" || tokenBalance !== "0") {
      const minWei = new Big(browserMinimumBalance.wei)
      if (new Big(balance).lt(minWei)) {
        // don't autodeposit anything under the threshold
        // update the refunding variable before returning
        return;
      }
      // only proceed with deposit request if you can deposit
      if (
        !connextState ||
        !connextState.runtime.canDeposit ||
        exchangeRate === "0.00"
      ) {
        return;
      }

      // if you already have the maximum balance tokens hub will exchange
      // do not deposit any more eth to be swapped
      // TODO: figure out rounding error
      if (
        eth.utils
          .bigNumberify(channelState.balanceTokenUser)
          .gte(eth.utils.parseEther("29.8"))
      ) {
        // refund any wei that is in the browser wallet
        // above the minimum
        const refundWei = Big.max(
          new Big(balance).minus(minWei),
          0
        );
        await this.returnWei(refundWei.toFixed(0));
        return;
      }

      let channelDeposit = {
        amountWei: new Big(balance)
          .minus(minWei)
          .toFixed(0),
        amountToken: tokenBalance
      };

      if (
        channelDeposit.amountWei === "0" &&
        channelDeposit.amountToken === "0"
      ) {
        return;
      }

      // if amount to deposit into channel is over the channel max
      // then return excess deposit to the sending account
      const weiToReturn = this.calculateWeiToRefund(
        channelDeposit.amountWei,
        connextState
      );

      // return wei to sender
      if (weiToReturn !== "0") {
        await this.returnWei(weiToReturn);
        return;
      }
      // update channel deposit
      const weiDeposit = new Big(channelDeposit.amountWei).minus(
        new Big(weiToReturn)
      );
      channelDeposit.amountWei = weiDeposit.toFixed(0);

      await this.state.connext.deposit(channelDeposit);
      this.addToHistory(channelDeposit);
    }
  }

  async returnWei(wei) {
    const { address, customWeb3 } = this.state;
    localStorage.setItem("refunding", Web3.utils.fromWei(wei, "finney"));

    if (!customWeb3) {
      return;
    }

    // if wei is 0, save gas and return
    if (wei === "0") {
      return;
    }

    // get address of latest sender of most recent transaction
    // first, get the last 10 blocks
    const currentBlock = await customWeb3.eth.getBlockNumber();
    let txs = [];
    const start = currentBlock - 100 < 0 ? 0 : currentBlock - 100;
    for (let i = start; i <= currentBlock; i++) {
      // add any transactions found in the blocks to the txs array
      const block = await customWeb3.eth.getBlock(i, true);
      txs = txs.concat(block.transactions);
    }
    // sort by nonce and take latest senders address and
    // return wei to the senders address
    const filteredTxs = txs.filter(
      t => t.to && t.to.toLowerCase() === address.toLowerCase()
    );
    const mostRecent = filteredTxs.sort((a, b) => b.nonce - a.nonce)[0];
    if (!mostRecent) {
      // Browser wallet overfunded, but couldnt find most recent tx in last 100 blocks
      return;
    }
    localStorage.setItem(
      "refunding",
      Web3.utils.fromWei(wei, "finney") + "," + mostRecent.from
    );
    console.log(`Refunding ${wei} to ${mostRecent.from} from ${address}`);
    const origBalance = new Big(await customWeb3.eth.getBalance(address));
    const newMax = origBalance.minus(new Big(wei));

    try {
      const res = await customWeb3.eth.sendTransaction({
        from: address,
        to: mostRecent.from,
        value: wei
      });
      const tx = await customWeb3.eth.getTransaction(res.transactionHash);
      console.log(`Returned deposit tx: ${JSON.stringify(tx, null, 2)}`)
      // calculate expected balance after transaction and set in local
      // storage. once the tx is submitted, the wallet balance should
      // always be lower than the expected balance, because of added
      // gas costs
      localStorage.setItem("maxBalanceAfterRefund", newMax.toFixed(0));
    } catch (e) {
      console.log("Error with refund transaction:", e.message);
      localStorage.removeItem("maxBalanceAfterRefund");
    }
    localStorage.removeItem("refunding");
    // await this.setWeb3(localStorage.getItem("rpc-prod"));
  }

  // returns a BigNumber
  calculateWeiToRefund(wei, connextState) {
    // channel max tokens is minimum of the ceiling that
    // the hub would exchange, or a set deposit max
    const ceilingWei = new CurrencyConvertable(
      CurrencyType.BEI,
      Big.min(HUB_EXCHANGE_CEILING, CHANNEL_DEPOSIT_MAX),
      () => getExchangeRates(connextState)
    ).toWEI().amountBigNumber

    const weiToRefund = Big.max(
      new Big(wei).minus(ceilingWei),
      new Big(0)
    );

    return weiToRefund.toFixed(0);
  }

  async autoSwap() {
    const { channelState, connextState } = this.state;
    if (!connextState || !connextState.runtime.canExchange) {
      return;
    }
    const weiBalance = new Big(channelState.balanceWeiUser);
    const tokenBalance = new Big(channelState.balanceTokenUser);
    if (
      channelState &&
      weiBalance.gt(new Big("0")) &&
      tokenBalance.lte(HUB_EXCHANGE_CEILING)
    ) {
      await this.state.connext.exchange(channelState.balanceWeiUser, "wei");
    }
  }

  async checkStatus() {
    const { runtime } = this.state;
    const refundStr = localStorage.getItem("refunding");
    const hasRefund = !!refundStr ? refundStr.split(",") : null;
    if (runtime.syncResultsFromHub[0]) {
      console.log('syncResultsFromHub', runtime.syncResultsFromHub[0].update.reason);
      let deposit;
      let withdraw;
      /* if (runtime.syncResultsFromHub[0].type === 'thread') {
        let syncResult = runtime.syncResultsFromHub[0]
        console.log('Handling thread event in sync results...', syncResult)
        if (syncResult.update.state.txCount == 0) {
          syncResult.update.state.txCount = 1
        }
        // Handle thread requests
        await this.state.connext.stateUpdateController.handleSyncItem(syncResult);

      } else {
        */
        // Non-thread updates
        switch (runtime.syncResultsFromHub[0].update.reason) {
          case "ProposePendingDeposit":
            if(runtime.syncResultsFromHub[0].update.args.depositTokenUser !== "0" ||
              runtime.syncResultsFromHub[0].update.args.depositWeiUser !== "0" ) {
              this.closeConfirmations()
              deposit = "PENDING";
            }
            break;
          case "ProposePendingWithdrawal":
            if(runtime.syncResultsFromHub[0].update.args.withdrawalTokenUser !== "0" ||
              runtime.syncResultsFromHub[0].update.args.withdrawalWeiUser !== "0" ) {
              this.closeConfirmations()
              withdraw = "PENDING";
            }
            break;
          case "ConfirmPending":
            this.addToHistory(runtime.syncResultsFromHub[0].update);
            if(this.state.status.depositHistory === "PENDING") {
              this.closeConfirmations("deposit")
              deposit = "SUCCESS";
            } else if(this.state.status.withdrawHistory === "PENDING") {
              this.closeConfirmations("withdraw")
              withdraw = "SUCCESS";
            }
            break;
          default:
        }
      //}
      this.setState({ status: { deposit, withdraw, hasRefund } });
    }
  }

  async getCustodialBalance() {
    const { hubUrl, address, customWeb3 } = this.state;
    const opts = {
          web3: customWeb3,
          hubUrl: hubUrl, // in dev-mode: http://localhost:8080,
          user: address,
          origin: "localhost", // TODO: what should this be
          cookie: document.cookie
        };

    try {
      //const custodialBalance = await axios.get(`${hubUrl}/channel/${address}/sync?lastChanTx=27&lastThreadUpdateId=0`, opts);
      //const custodialBalance = await axios.get(`${hubUrl}/custodial/${address}/balance`, opts);
      //console.log('custodial balance ', custodialBalance)
    } catch (err) {
      console.log(err.message)
    }
  }

  // ************************************************* //
  //                    Handlers                       //
  // ************************************************* //

  async authorizeHandler() {
    const { customWeb3, hubUrl, opts } = this.state;
    const web3 = customWeb3;
    const challengeRes = await axios.post(`${hubUrl}/auth/challenge`, opts);
    console.log('authorizeHandler ', challengeRes)

    const nonce = challengeRes.data.nonce
    const ORIGIN = "hub.spankchain.com"
    const hash = web3.utils.sha3(
      `${HASH_PREAMBLE} ${web3.utils.sha3(nonce)} ${web3.utils.sha3(ORIGIN)}`
    );

    const signature = await web3.eth.personal.sign(hash, this.state.address);
    console.log('auth sig: ', signature)
    try {
      let authRes = await axios.post(
        `${hubUrl}/auth/response`,
        {
          nonce: challengeRes.data.nonce,
          address: this.state.address,
          origin: ORIGIN,
          signature
        },
        opts
      );
      const token = authRes.data.token;
      document.cookie = `hub.sid=${token}`;
      console.log(`cookie set: ${token}`);
      const res = await axios.get(`${hubUrl}/auth/status`, opts);
      if (res.data.success) {
        this.setState({ authorized: true });
        return res.data.success
      } else {
        this.setState({ authorized: false });
      }
      console.log(`Auth status: ${JSON.stringify(res.data)}`);
    } catch (e) {
      console.log(e);
    }
  }

  updateApprovalHandler(evt) {
    this.setState({
      approvalWeiUser: evt.target.value
    });
  }

}

export default App;
