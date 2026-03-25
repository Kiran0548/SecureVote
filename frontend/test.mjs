import { generateProof } from '@semaphore-protocol/proof';
import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';

async function main() {
    const id = new Identity();
    const group = new Group([id.commitment]);
    
    // Testing with electionCount = 1n
    const p1 = await generateProof(id, group, 1n, 1n);
    console.log("Scope passed as 1n:", p1.scope);
}

main().catch(console.error);
