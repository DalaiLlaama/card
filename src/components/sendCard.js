import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import SendIcon from "@material-ui/icons/Send";
import TextField from "@material-ui/core/TextField";
import QRIcon from "mdi-material-ui/QrcodeScan";
import LinkIcon from "@material-ui/icons/Link";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import InputAdornment from "@material-ui/core/InputAdornment";
import Tooltip from "@material-ui/core/Tooltip";
import Modal from "@material-ui/core/Modal";
import red from "@material-ui/core/colors/red"
import green from "@material-ui/core/colors/green"
import QRScan from "./qrScan";
import { withStyles, Grid, Typography } from "@material-ui/core";
import { getDollarSubstring } from "../utils/getDollarSubstring";
import Snackbar from "./snackBar";

const queryString = require("query-string");

const styles = theme => ({
  icon: {
    width: "40px",
    height: "40px",
  },
  input: {
    width: "100%"
  },
  button: {
    backgroundColor: "#FCA311",
    color: "#FFF"
  }
});

class PayCard extends Component {
  constructor(props) {
    super(props);

    this.state = {
      paymentVal: {
        meta: {
          purchaseId: "payment"
          // memo: "",
        },
        payments: [
          {
            recipient: this.props.scanArgs.recipient
              ? this.props.scanArgs.recipient
              : "",
            amount: {
              amountToken: this.props.scanArgs.amount
                ? (this.props.scanArgs.amount * Math.pow(10, 18)).toString()
                : "0",
              amountWei: "0"
            },
            type: "PT_CHANNEL"
          }
        ]
      },
      addressError: null,
      balanceError: null,
      sendError: null,
      sendSuccess: null,
      scan: false,
      displayVal: this.props.scanArgs.amount ? this.props.scanArgs.amount : "0"
    };
  }

  async componentDidMount() {
    const { location } = this.props;
    const query = queryString.parse(location.search);
    if (query.amountToken) {
      await this.setState(oldState => {
        oldState.paymentVal.payments[0].amount.amountToken = (
          query.amounttoken * Math.pow(10, 18)
        ).toString();
        oldState.displayVal = query.amounToken;
        return oldState;
      });
    }
    if (query.recipient) {
      await this.setState(oldState => {
        oldState.paymentVal.payments[0].recipient = query.recipient;
        return oldState;
      });
    }
  }

  async updatePaymentHandler(value) {
    await this.setState(oldState => {
      oldState.paymentVal.payments[0].amount.amountToken = (
        value * Math.pow(10, 18)
      ).toString();
      return oldState;
    });
    this.setState({ displayVal: value });
    console.log(
      `Updated paymentVal: ${JSON.stringify(this.state.paymentVal, null, 2)}`
    );
  }

  async handleQRData(scanResult) {
    const { publicUrl } = this.props;

    let data = scanResult.split("/send?");
    if (data[0] === publicUrl) {
      let temp = data[1].split("&");
      let amount = temp[0].split("=")[1];
      let recipient = temp[1].split("=")[1];
      this.setState({
        modals: { scan: false }
      });
      this.updatePaymentHandler(amount)
      this.updateRecipientHandler(recipient)
    } else {
      this.updateRecipientHandler(scanResult)
      console.log("incorrect site");
    }
  }

  async updateRecipientHandler(value) {
    await this.setState(oldState => {
      oldState.paymentVal.payments[0].recipient = value;
      return oldState;
    });
    console.log(
      `Updated recipient: ${JSON.stringify(
        this.state.paymentVal.payments[0].recipient,
        null,
        2
      )}`
    );
  }

  async paymentHandler() {
    console.log(
      `Submitting payment: ${JSON.stringify(this.state.paymentVal, null, 2)}`
    );
    this.setState({ addressError: null, balanceError: null });
    const { connext, web3 } = this.props;

    // if( Number(this.state.paymentVal.payments[0].amount.amountToken) <= Number(channelState.balanceTokenUser) &&
    //     Number(this.state.paymentVal.payments[0].amount.amountWei) <= Number(channelState.balanceWeiUser)
    // ) {
    if (web3.utils.isAddress(this.state.paymentVal.payments[0].recipient)) {
      try{
        let paymentRes = await connext.buy(this.state.paymentVal);
        console.log(`Payment result: ${JSON.stringify(paymentRes, null, 2)}`);
      }catch(e){
        await this.setState({ sendError: true })
      }
      if (!this.state.sendError){
        this.setState({ sendSuccess: true });
      }
    } else {
      this.setState({ addressError: "Please choose a valid address" });
    }
    // } else {
    //   this.setState({balanceError: "Insufficient balance in channel"})
    // }
  }

  handleError = async () => {
    await this.setState({ sendError: false });
  };
  handleSuccess = async () => {
    await this.setState({ sendSuccess: false });
  };

  render() {
    const { classes, channelState } = this.props;
    const { sendError, sendSuccess } = this.state;
    return (
      <Grid
        container
        spacing={24}
        direction="column"
        style={{
          display: "flex",
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: "10%",
          paddingBottom: "10%",
          textAlign: "center",
          justify: "center"
        }}
      >
      <Snackbar
          onClose={() => this.handleError()}
          handleClick={() => this.handleError()}
          open={sendError}
          style={{backgroundColor:red[600]}}
          text="Payment failed. This is probably because receiver's channel needs to be recollateralized. Please try again in 30 seconds!"
        />
      <Snackbar
          onClose={() => this.handleSuccess()}
          handleClick={() => this.handleSuccess()}
          style={{backgroundColor:green[600]}}
          open={sendSuccess}
          text="Payment sent!"
        />
        <Grid
          container
          wrap="nowrap"
          direction="row"
          justify="center"
          alignItems="center"
        >
          <Grid item xs={12}>
            <SendIcon className={classes.icon} />
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container direction="row" justify="center" alignItems="center">
            <Typography variant="h2">
              <span>
                {channelState
                  ? "$" +
                    getDollarSubstring(channelState.balanceTokenUser)[0] +
                    "." +
                    getDollarSubstring(channelState.balanceTokenUser)[1].substr(
                      0,
                      2
                    )
                  : "$0.00"}
              </span>
            </Typography>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <TextField
              fullWidth
              id="outlined-number"
              label="Amount"
              value={this.state.displayVal}
              type="number"
              margin="normal"
              variant="outlined"
              onChange={evt => this.updatePaymentHandler(evt.target.value)}
              error={this.state.balanceError != null}
              helperText={this.state.balanceError}
            />
        </Grid>
        <Grid item xs={12}>
          <TextField
            style={{ width: "100%" }}
            id="outlined"
            label="Recipient Address"
            type="string"
            required
            value={this.state.paymentVal.payments[0].recipient}
            onChange={evt => this.updateRecipientHandler(evt.target.value)}
            margin="normal"
            variant="outlined"
            helperText={this.state.addressError}
            error={this.state.addressError != null}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip
                    disableFocusListener
                    disableTouchListener
                    title="Scan with QR code"
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      style={{ color: "#FFF" }}
                      onClick={() => this.setState({ scan: true })}
                    >
                      <QRIcon />
                    </Button>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Modal
          id="qrscan"
          open={this.state.scan}
          onClose={() => this.setState({ scan: false })}
          style={{ width: "full", height: "full" }}
        >
          <QRScan handleResult={this.handleQRData.bind(this)} history={this.props.history} />
        </Modal>
        <Grid item xs={12}>
          <Grid
            container
            direction="row"
            alignItems="center"
            justify="center"
            spacing={16}
          >
            <Grid item xs={6}>
              <Button
                fullWidth
                className={classes.button}
                variant="contained"
                size="large"
                disabled
                //TODO ENABLE THIS WHEN WE ADD FUNCTIONALITY
              >
                Link
                <LinkIcon style={{ marginLeft: "5px" }} />
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                className={classes.button}
                variant="contained"
                size="large"
                onClick={() => this.paymentHandler()}
              >
                Send
                <SendIcon style={{ marginLeft: "5px" }} />
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Button 
            variant="outlined" 
            style={{
              background: "#FFF",
              border: "1px solid #F22424",
              color: "#F22424",
              width: "15%",
            }}
            size="medium" 
            onClick={()=>this.props.history.push("/")}
          >
            Back
          </Button>
        </Grid>
      </Grid>
    );
  }
}

export default withStyles(styles)(PayCard);
