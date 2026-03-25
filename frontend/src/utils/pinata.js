export const uploadFileToIPFS = async (file, jwt) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${jwt}`,
        },
        body: formData,
    });
    
    if (!res.ok) {
        throw new Error(`Pinata upload failed with status ${res.status}`);
    }
    
    const resData = await res.json();
    return resData.IpfsHash;
  } catch (error) {
    console.error("Error uploading file to Pinata:", error);
    throw error;
  }
};

export const uploadJSONToIPFS = async (jsonBody, jwt) => {
  try {
    const data = JSON.stringify({
      pinataContent: jsonBody,
      pinataMetadata: {
        name: "election_manifesto.json"
      }
    });

    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
        },
        body: data,
    });

    if (!res.ok) {
        throw new Error(`Pinata JSON upload failed with status ${res.status}`);
    }

    const resData = await res.json();
    return resData.IpfsHash;
  } catch (error) {
    console.error("Error uploading JSON to Pinata:", error);
    throw error;
  }
};
