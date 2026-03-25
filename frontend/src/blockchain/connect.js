import { ethers } from "ethers"

export const connectWallet = async () => {

  if (!window.ethereum) {
    alert("MetaMask not installed")
    return null
  }

  try {
    // FORCE popup request
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    })

    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()

    return {
      provider,
      signer,
      address: accounts[0],
    }

  } catch (error) {
    console.log(error)
    alert("Wallet connection rejected")
  }
}