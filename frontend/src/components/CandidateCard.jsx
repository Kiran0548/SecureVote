import { getContract } from "../blockchain/contract"

function CandidateCard({candidate}){

  const vote = async () =>{

    try{

      const contract = await getContract()

      const tx = await contract.vote(candidate.name)

      alert("Transaction Sent")

      await tx.wait()

      alert("Vote recorded on blockchain")

    }catch(err){

      console.log(err)
      alert("Transaction failed")

    }

  }

  return(

    <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl hover:scale-105 transition">

      <div className="flex flex-col items-center">

        <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
          {candidate.name.charAt(0)}
        </div>

        <h3 className="text-xl font-bold mb-1">
          {candidate.name}
        </h3>

        <p className="text-gray-300 mb-4">
          {candidate.party}
        </p>

        <button
        onClick={vote}
        className="w-full bg-indigo-500 hover:bg-indigo-600 py-2 rounded-lg font-semibold transition"
        >
          Vote Now
        </button>

      </div>

    </div>

  )

}

export default CandidateCard