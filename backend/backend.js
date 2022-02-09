const express = require("express");
const https = require("https");
const fs = require("fs");
const Web3 = require("web3");
const cors = require("cors");

let web3 = new Web3("https://api.s0.b.hmny.io");

const port = 3001;

const key = fs.readFileSync(__dirname + "/sslcert/cert.key");
const cert = fs.readFileSync(__dirname + "/sslcert/cert.pem");
const options = { key: key, cert: cert };

const account = require("../account");

MongoClient = require('mongodb').MongoClient
const client = new MongoClient(account.mongo_uri);

let waccount = web3.eth.accounts.wallet.add(account.key);

const bytecode = JSON.parse(fs.readFileSync("hrc721.evm.json"));
const abi = JSON.parse(fs.readFileSync("hrc721.abi.json"));
const code = "0x" + bytecode.object;

checkBlock = async address => {
    let block = await web3.eth.getBlock("latest");
    let number = block.number;
    let transactions = block.transactions;
    //console.log('Search Block: ' + transactions);

    if (block != null && block.transactions != null) {
        for (let txHash of block.transactions) {
            let tx = await web3.eth.getTransaction(txHash);
            if (address == tx.to.toLowerCase()) {
                console.log("from: " + tx.from.toLowerCase() + " to: " + tx.to.toLowerCase() + " value: " + tx.value);
            }
        }
    }
}

app = express();
app.use(cors());

let harmonys;

app.get("/address", (req, res) => {
    console.log("here");
    res.send({ address: waccount.address });
});

app.get("/metadata", async (req, res) => {
    try {
        const doc = await harmonys.findOne({ mint: parseInt(req.query.mint) });

        res.send({
            name: doc.name,
            description: doc.description,
            image: `https://cloudflare-ipfs.com/ipfs/${doc.images[req.query.id]}`
        });
    } catch(err) {
        console.dir(["error getting metadata", err]);
        res.send({});
    }

});

let doMint = (contract, count, name, symbol, ipfscids, completed, res) => {
    contract.methods.name().call().then(console.dir);
        contract.methods.mint(waccount.address).send({
            from: waccount.address,
            gas: 20000000,
            gasPrice: "30000000000"
        })
        .on("transactionHash", function(hash){
            console.dir(["txhash (mint)", hash]);
        })
        .on("confirmation", async function(confirmationNumber, receipt){
            if (confirmationNumber === 0) {
                console.dir(["confirmation (mint)", confirmationNumber, receipt]);
                if (completed + 1 === ipfscids.length) {
                    const doc = {
                        mint: count,
                        name: name,
                        description: symbol,
                        images: ipfscids
                    };
                    const result = await harmonys.insertOne(doc);
                    res.send({ contract: receipt.from });
                } else doMint(contract, count, name, symbol, ipfscids, completed + 1, res);
            }
        })
        .on("receipt", function(receipt){
            console.dir(["receipt (mint)", receipt]);
        })
        .on("error", function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            console.dir(["error (mint)", error, receipt]);
        });
}

app.get("/mint", async (req, res) => {
    const address = req.query.address;
    console.dir(address);
    const ipfscids = JSON.parse(req.query.cids);
    console.dir(ipfscids);
    const name = decodeURIComponent(req.query.name);
    console.dir(name);
    const symbol = decodeURIComponent(req.query.symbol);
    console.dir(symbol);

    const mintingContract = new web3.eth.Contract(abi);
    const count = await harmonys.count();
    console.dir(count);

    const totalMints = ipfscids.length;

    mintingContract.deploy({
        data: code,
        arguments: [name, symbol, `https://localhost:3001/metadata?mint=${count}&id=`]
    })
    .send({
        from: waccount.address,
        gas: 20000000,
        gasPrice: "30000000000"
    }, function(error, transactionHash){ console.dir(["sending", error, transactionHash]); })
    .on("error", function(error){ console.dir(["error", error]); })
    .on("transactionHash", function(transactionHash){ console.dir(["txhash", transactionHash]); })
    .on("receipt", function(receipt){
        console.dir(["receipt", receipt.contractAddress]); // contains the new contract address
    })
    .on("confirmation", function(confirmationNumber, receipt){
        // console.dir(["confirmation", confirmationNumber, receipt]);
    })
    .then(function(newContractInstance){
        console.dir(["new instance", newContractInstance.options.address]) // instance with the new contract address
        doMint(newContractInstance, count, name, symbol, ipfscids, 0, res);
    });
});

let go = async () => {
    await client.connect();
    const database = client.db("harmonydb");
    harmonys = database.collection("harmonys");
    
    const server = https.createServer(options, app);
    
    server.listen(port, () => {
        console.log("Starting on port: " + port)
    });
}

go();