import { ethers } from "ethers"

export const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

export const contractABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "candidateId",
        "type": "uint256"
      }
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

export const getContract = async () => {

  const provider = new ethers.BrowserProvider(window.ethereum)

  const signer = await provider.getSigner()

  const contract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  )

  return contract
}