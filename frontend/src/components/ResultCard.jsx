function ResultCard({candidate}){

  return(

    <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-lg">

      <h3 className="text-lg font-bold mb-2">
        {candidate.name}
      </h3>

      <div className="w-full bg-gray-700 rounded-full h-3 mb-2">

        <div
        className="bg-indigo-500 h-3 rounded-full"
        style={{width: `${candidate.votes * 10}%`}}
        ></div>

      </div>

      <p className="text-sm text-gray-300">
        Votes: {candidate.votes}
      </p>

    </div>

  )

}

export default ResultCard