import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../blockchain/.env") });

const privateKey = process.env.PRIVATE_KEY;

if (privateKey) {
    try {
        const wallet = new ethers.Wallet(privateKey);
        console.log("Address derived from PRIVATE_KEY:", wallet.address);
    } catch (e) {
        console.error("Invalid Private Key format in .env");
    }
} else {
    console.error("PRIVATE_KEY not found in .env");
}
