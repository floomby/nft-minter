import React from 'react';
import ReactDOM from 'react-dom';
import 'bootstrap/dist/css/bootstrap.css';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import './index.css';
// Contract deployment is in the backend now
// import hrc721Evm from './hrc721Evm.json';
// import hrc721Abi from './hrc721Abi.json';

const backendURI = "https://localhost:3001";

function isValidIPFSCID(cid) {
    // TODO Impement me
    return cid.length > 0;
}

class TokenApp extends React.Component {
    constructor(props) {
        super(props);
        this.state = { items: [], ipfscid: "", valid: false, account: "", name: "", symbol: "" };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleMintSubmit = this.handleMintSubmit.bind(this);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleSymbolChange = this.handleSymbolChange.bind(this);
        this.remover = this.remover.bind(this);
        this.setAccount = this.setAccount.bind(this);
    }

    render() {
        return (
            <div>
                <h3>Token Minting</h3>
                <FileList items={this.state.items} remover={this.remover}/>
                <Container>
                    <Form onSubmit={this.handleSubmit} className="mt-5">
                        <InputGroup>
                            <Form.Control type="text" placeholder="IPFS CID" onChange={this.handleChange} value={this.state.ipfscid} />
                            <Button variant="primary" type="submit" disabled={!this.state.valid}> Add #{this.state.items.length + 1} </Button>
                        </InputGroup>
                    </Form>
                </Container>
                <Container>
                    <Form onSubmit={this.handleMintSubmit}>
                        <Form.Group controlId="nft-name">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" placeholder="Token Name" onChange={this.handleNameChange} value={this.state.name} />
                        </Form.Group>
                        <Form.Group controlId="nft-symbol">
                            <Form.Label>Symbol</Form.Label>
                            <Form.Control type="text" placeholder="Token Symbol" onChange={this.handleSymbolChange} value={this.state.symbol} />
                        </Form.Group>
                        <Button variant="primary" type="submit" disabled={
                            this.state.name.length === 0 ||
                            this.state.symbol.length === 0 ||
                            this.state.account.length === 0 ||
                            this.state.items.length === 0}> Send mint request </Button>
                    </Form>
                </Container>
                <MetamaskIntegration accountSetter={this.setAccount} />
            </div>
        );
    }

    setAccount(account) {
        this.setState({ account: account });
    }

    handleChange(e) {
        this.setState({
            ipfscid: e.target.value,
            valid: isValidIPFSCID(e.target.value)
        });
    }

    remover(id) {
        this.setState(state => {
            return {
                items: state.items.filter(item => item.id !== id)
            }
        });
    }

    handleSubmit(e) {
        e.preventDefault();
        if (this.state.ipfscid.length === 0) {
            return;
        }
        const newItem = {
            ipfscid: this.state.ipfscid,
            id: Date.now(),
        };
        this.setState(state => ({
            items: state.items.concat(newItem),
            ipfscid: ''
        }));
    }

    async handleMintSubmit(e) {
        e.preventDefault();
        const response = await fetch(`${backendURI}/mint?address=${this.state.account}&cids=${JSON.stringify(this.state.items.map(x => x.ipfscid))}&name=${encodeURIComponent(this.state.name)}&symbol=${encodeURIComponent(this.state.symbol)}`);
        const resj = await response.json();
        console.dir(resj);
        console.dir([this.state.name, this.state.symbol, this.state.items, this.state.account]);
    }

    handleNameChange(e) {
        this.setState({ name: e.target.value });
    }

    handleSymbolChange(e) {
        this.setState({ symbol: e.target.value });
    }
}

class FileList extends React.Component {
    render() {
        return (
            <ListGroup>
                {this.props.items.map(item => (
                    <ListGroup.Item key={item.id}>
                        {item.ipfscid} <Button type="button" onClick={() => this.props.remover(item.id)}>Remove</Button>
                    </ListGroup.Item>
                ))}
            </ListGroup>
        );
    }
}

class MetamaskIntegration extends React.Component {
    constructor(props) {
        super(props);
        // this.state = { account: "", code: "0x" + hrc721Evm.object, abi: hrc721Abi };
        this.state = { account: "", mintingAddress: "" };
        this.connectToMetamask = this.connectToMetamask.bind(this);
        this.switchChain = this.switchChain.bind(this);
        this.sendMintingPayment = this.sendMintingPayment.bind(this);

        fetch(`${backendURI}/address`).then(response => {
            if (!response.ok) throw new Error("Unable to read contract: " + response.status);
            return response.json();
        }).then(json => { console.dir(json); this.setState({ mintingAddress: json.address }); }).catch(err => { console.dir(["Unable to fetch minting address (check backend)", err]); });
    }

    render() {
        return (
            <div>
                <p>{ this.state.account.length === 0 ? "Metamask not connected" : this.state.account }</p>
                <Button onClick={this.connectToMetamask} disabled={this.state.mintingAddress.length === 0}>Connect</Button>
                <Button onClick={this.switchChain} disabled={this.state.account.length === 0}>Switch to harmony chain</Button>
                <Button onClick={this.sendMintingPayment} disabled={this.state.account.length === 0}>Send minting</Button>
                {/* <Button onClick={this.sendMintRequest} disabled={this.state.account.length === 0}>Send mint request</Button> */}
            </div>
        );
    }

    connectToMetamask() {
        window.ethereum.request({ method: 'eth_requestAccounts' })
            .then(accounts => {
                this.setState({ account: accounts[0] });
                this.props.accountSetter(accounts[0]);
                console.dir(this.state.account);
            })
            .catch(err => console.dir(["metamask error", err]));
    }

    async switchChain() {
        try {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                    {
                        chainId: "0x6357D2E0",
                        chainName: "ONE",
                        rpcUrls: ["https://api.s0.b.hmny.io"],
                    },
                ],
            });
        } catch (addError) {
            console.dir(addError)
        }
    }

    async sendMintingPayment() {
        const transactionParameters = {
            gasPrice: "30", // 30 gwei minimum I think
            gas: "210000", // idk man (I do not understand all this gas pricing stuff)
            to: this.state.mintingAddress,
            from: this.state.account,
            value: "0x100000000000000", // TODO get figuring this value out somehow (it needs to pay for the minting costs which the backend has yet to preform)
        };

        console.dir(transactionParameters);

        try {
            let tx = await window.ethereum.request({
                method: "eth_sendTransaction",
                params: [transactionParameters],
            });
        } catch (addError) {
            console.dir(addError)
        }
    }

    // async sendMintRequest() {
    //     const response = await fetch(`https://localhost:3001/mint?address=${this.state.account}`);
    //     const resj = await response.json();
    //     console.dir(resj);
    // }
}

ReactDOM.render(
    (
        <div className="p-3">
            <TokenApp />
        </div>
    ),
    document.getElementById("root")
);