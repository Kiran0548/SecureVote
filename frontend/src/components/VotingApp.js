import { useEffect, useState } from "react";
import { ethers } from "ethers";
import SecureVote from "./SecureVote.json"; // ABI JSON

const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";

function VotingApp() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const prov = new ethers.BrowserProvider(window.ethereum);
        await prov.send("eth_requestAccounts", []);
        const signer = await prov.getSigner();
        const contract = new ethers.Contract(contractAddress, SecureVote.abi, signer);

        setProvider(prov);
        setSigner(signer);
        setContract(contract);
      } else {
        alert("MetaMask not detected");
      }
    };
    init();
  }, []);

  return <div>Voting App Connected!</div>;
}

export default VotingApp;