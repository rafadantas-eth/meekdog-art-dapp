import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { connect } from "./redux/blockchain/blockchainActions";
import { fetchData } from "./redux/data/dataActions";
import Web3B from "web3";

const truncate = (input, len) =>
  input.length > len ? `${input.substring(0, len)}...` : input;


function App() {
  const dispatch = useDispatch();
  const blockchain = useSelector((state) => state.blockchain);
  const data = useSelector((state) => state.data);

  const [warningFeedback, setWarningFeedback] = useState(``);
  const [successFeedback, setSuccessFeedback] = useState(``);

  const [mintLive, setMintLive] = useState(false);
  const [whitelisted, setWhitelisted] = useState(false);

  const [claimingNft, setClaimingNft] = useState(false);
  const [minted, setMinted] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);

  const [displayPrice, setDisplayPrice] = useState(`0 MATIC`);  
  const [mintPrice, setMintPrice] = useState(0);
  
  const [CONFIG, SET_CONFIG] = useState({
    CONTRACT_ADDRESS: "",
    NETWORK: {
      NAME: "",
      SYMBOL: "",
      ID: 0,
    },
    COLLECTION_NAME: "",
    GAS_LIMIT: 0,
    CURRENT_ID:0,
    CURRENT_NFT_NAME: "",
  });

  const currentNFTImage = "./images/current-pfp.png";

  const removefeedback = () => {
    setTimeout(function(){ 
      setSuccessFeedback(``);
      setWarningFeedback(``);
    }, 5000);
  }

  const getSaleState = () => {
    blockchain.smartContract.methods.paused().call().then((receipt) => {
      setMintLive (!receipt);
      console.log("Mint paused: " + receipt);
    });    
  }

  const getTokenPrice = () => {
    blockchain.smartContract.methods.tokenPrice().call().then((receipt) => {
      console.log("🤑🤑 Token Price: " + receipt);
      
      // Set display price
      setDisplayPrice(receipt == 0 ? "Free" : Web3B.utils.fromWei(receipt, 'ether') + " MATIC + Gas");

      // Set Mint Price
      setMintPrice (receipt);
    });
  }

  const checkWhitelistForAddress = () => {
    console.log ("🔥 Retriving Whitelist Status for ID: " + String(CONFIG.CURRENT_ID));
    
    blockchain.smartContract.methods.isAddressWhitelistedForTokenId(blockchain.account, CONFIG.CURRENT_ID).call().then((receipt) => {
      console.log("🔥🔥 Whitelist for token: " + receipt);
      
      // Set mint price
      setWhitelisted (receipt);
    });
  }

  const getTokenBalanceForAddress = () => {
    console.log ("⚫️ Retriving Token Balance");

    blockchain.smartContract.methods.balanceOf(blockchain.account, CONFIG.CURRENT_ID).call().then((receipt) => {
      console.log("⚫️⚫️ Token Balance: " + receipt);
      
      // Set Mints done
      setTokenBalance (receipt);
    });
  }


// Mint
  const claimNFTs = () => {
    let totalCostWei = String(mintPrice); // must be WEI cost
    let totalGasLimit = String(CONFIG.GAS_LIMIT);
    console.log("Cost: ", totalCostWei);
    console.log("Gas limit: ", totalGasLimit);
    
    // Change button status
    setClaimingNft(true);

    blockchain.smartContract.methods
      .mint()
      .send({
        gasLimit: String(totalGasLimit),
        maxPriorityFeePerGas: null,
        maxFeePerGas: null, 
        to: CONFIG.CONTRACT_ADDRESS,
        from: blockchain.account,
        value: totalCostWei,
      })
      .once("error", (err) => {
        setWarningFeedback("Oops... Try again later.");
        setSuccessFeedback(``);
        removefeedback();

        console.log(err);
        setClaimingNft(false);
        getData();
      })
      .then((receipt) => {
        setSuccessFeedback(`👻 Boooooo Yeeeeaaah!`);
        setWarningFeedback(``);
        removefeedback();

        console.log(receipt);
        setMinted(true);
        setClaimingNft(false);
        dispatch(fetchData(blockchain.account));
        
        getData();
      });
  };


// Checa quantos WL tem disponível
// Checa quantos WL já mintou
  // Checa se ainda tem Wl após o mint
  // Checa o preço antes de cada mint


  const getData = () => {
    if (blockchain.account !== "" && blockchain.account !== undefined && blockchain.smartContract !== null) {
      dispatch(fetchData(blockchain.account));

      // Check if sale and whitelist are open
      getSaleState();
      
      // get whitelist total
      checkWhitelistForAddress();

      // get token price
      getTokenPrice();

      // get mint count
      getTokenBalanceForAddress();
    }
  };

  const getConfig = async () => {
    const configResponse = await fetch("/config/config.json", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const config = await configResponse.json();
    SET_CONFIG(config);
  };

  useEffect(() => {
    getConfig();
  }, []);

  useEffect(() => {
    getData();
  }, [blockchain.account]);


  // OKOKOKOKOKOKOKOKOK
  // Check if wallet is connected
  if(!blockchain.account || blockchain.account === undefined || blockchain.account === "" || blockchain.smartContract === null) {
    return (
      <>
        <div id="dapp" class="connect">
            <h2 class="mint-title">{CONFIG.COLLECTION_NAME}</h2>

            <img class="current-nft" src={currentNFTImage}></img>

            <div class="price-status">
              <h4 class="nft-name">{CONFIG.CURRENT_NFT_NAME}</h4>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                dispatch(connect());
                getData();
              }}
            >
              Connect your wallet
            </button>
        </div>

        {blockchain.errorMsg !== "" ?(<><div class="warning-message">{blockchain.errorMsg}</div></>):null}
        {warningFeedback !== "" ?(<><div class="warning-message">{warningFeedback}</div></>):null}
        {successFeedback !== "" ?(<><div class="success-message">{successFeedback}</div></>):null}
      </>
    );
  }

  // OKOKOKOKOKOKOKOKOK
  // Check if Mint is not Open YET
  if(!mintLive){
    return (
          <>
            <div id="dapp" class="closed">
              <h2 class="mint-title">{CONFIG.COLLECTION_NAME}</h2>

              <img class="current-nft" src={currentNFTImage}></img>

              <div class="price-status">
                <h4 class="nft-name">{CONFIG.CURRENT_NFT_NAME}</h4>
              </div>

              <button disabled>Mint not Live</button>
            </div>
          </>
      );
  }

  // OKOKOKOKOKOKOKOKOK
  if(claimingNft) {
    return (
          <>
            <div id="dapp" class="closed">
              <h2 class="mint-title">{CONFIG.COLLECTION_NAME}</h2>

              <img class="current-nft" src={currentNFTImage}></img>

              <div class="price-status">
                <h4 class="nft-name">Hunting your Meekdog</h4>
                <div class="spinner-container">
                  <div class="spinner"></div>
                </div>
              </div>
            </div>
          </>
      );
  }

  // OKOKOKOKOKOKOKOKOK
  if(minted || parseInt(tokenBalance)) {
    return (
          <>
            <div id="dapp" class="closed">
              <h2 class="mint-title">{CONFIG.COLLECTION_NAME}</h2>

              <img class="current-nft" src={currentNFTImage}></img>

              <div class="price-status">
                <h4 class="nft-name">Congratulations</h4>
                <p>You have minted your {CONFIG.CURRENT_NFT_NAME}!</p>
              </div>

              <a href={"https://opensea.io/assets/matic/" + CONFIG.CONTRACT_ADDRESS + "/" + CONFIG.CURRENT_ID} target="_blank"><p>Check it on OpenSea</p></a>
            </div>
          </>
      );
  }

  // OKOKOKOKOKOKOKOKOK
  if(mintLive) {
      return (
          <>
            <div id="dapp" class="closed">
              <h2 class="mint-title">{CONFIG.COLLECTION_NAME}</h2>

              <img class="current-nft" src={currentNFTImage}></img>

              {whitelisted != false 
                ? (<div class="price-status">
                    <h4 class="nft-name">{ displayPrice }</h4>
                    <p>Is the price of this NFT</p>
                  </div>)
                  :(<div class="price-status">
                      <h4 class="nft-name">{CONFIG.CURRENT_NFT_NAME}</h4>
                    </div>)
              }


              {whitelisted == false 
              ?(<p class="warning-message">This wallet is <strong>not</strong> whitelisted<br />for the current {CONFIG.CURRENT_NFT_NAME} PFP</p>)
              :(<button disabled= { claimingNft ? 1 : 0 }
                    onClick={(e) => {
                      e.preventDefault();
                      claimNFTs();
                    }}
                  > 
                  {claimingNft ? "Hunting..." : "Mint your Meekdog Art"}
              </button>)}

            </div>

            {blockchain.errorMsg !== "" ?(<><div class="warning-message">{blockchain.errorMsg}</div></>):null}
            {warningFeedback !== "" ?(<><div class="warning-message">{warningFeedback}</div></>):null}
            {successFeedback !== "" ?(<><div class="success-message">{successFeedback}</div></>):null}
          </>
      );
  }

}

export default App;
