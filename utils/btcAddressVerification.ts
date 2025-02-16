// Constants
const GUARDIAN_NODES = [
    {
        nodeId: 'node-1',
        publicKey:
            '04bab844e8620c4a1ec304df6284cd6fdffcde79b3330a7bffb1e4cecfee72d02a7c1f3a4415b253dc8d6ca2146db170e1617605cc8a4160f539890b8a24712152',
    },
    {
        nodeId: 'hl-node-testnet',
        publicKey:
            '04502d20a0d8d8aaea9395eb46d50ad2d8278c1b3a3bcdc200d531253612be23f5f2e9709bf3a3a50d1447281fa81aca0bf2ac2a6a3cb8a12978381d73c24bb2d9',
    },
    {
        nodeId: 'field-node',
        publicKey:
            '04e674a796ff01d6b74f4ee4079640729797538cdb4926ec333ce1bd18414ef7f22c1a142fd76dca120614045273f30338cd07d79bc99872c76151756aaec0f8e8',
    },
];
const GUARDIAN_SIGNATURE_THRESHOLD = 2;

// Types
interface RawNode {
    nodeId: string;
    publicKey: string;  // hex-encoded
}

interface ProcessedNode {
    nodeId: string;
    publicKey: CryptoKey;
}

interface Proposal {
    destinationAddress: string;
    destinationChain: string;
    asset: string;
    address: string;
}

interface VerificationResult {
    success: boolean;
    verifiedCount: number;
    errors?: string[];
}

// Utility functions
function hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    return new Uint8Array(Buffer.from(cleanHex, 'hex'));
}

/**
 * Hash a message using SHA-256
 */
async function hashMessage(message: Uint8Array): Promise<ArrayBuffer> {
    return await crypto.subtle.digest('SHA-256', message);
}

/**
 * Converts a proposal into a standardized payload format and hashes it
 */
async function proposalToHashedPayload(nodeId: string, proposal: Proposal): Promise<ArrayBuffer> {
    const payloadString = [
        nodeId,
        proposal.destinationAddress,
        proposal.destinationChain,
        proposal.asset,
        proposal.address
    ].join(':');

    console.log(`Payload for ${nodeId}:`, payloadString);
    const payloadBytes = new TextEncoder().encode(payloadString);
    return await hashMessage(payloadBytes);
}

/**
 * Processes guardian nodes by converting their hex-encoded public keys into CryptoKey objects
 */
async function processGuardianNodes(nodes: RawNode[]): Promise<ProcessedNode[]> {
    const processed: ProcessedNode[] = [];

    for (const node of nodes) {
        try {
            const publicKeyBytes = hexToBytes(node.publicKey);
            console.log(`Processing node ${node.nodeId}, public key length:`, publicKeyBytes.length);

            // Validate public key format (uncompressed SEC1)
            if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
                throw new Error(`Invalid public key format for node ${node.nodeId}`);
            }

            const publicKey = await crypto.subtle.importKey(
                'raw',
                publicKeyBytes,
                { 
                    name: 'ECDSA',
                    namedCurve: 'P-256',
                },
                true,
                ['verify']
            );

            processed.push({ nodeId: node.nodeId, publicKey });
            console.log(`Successfully processed node ${node.nodeId}`);
        } catch (error) {
            console.error(`Failed to process node ${node.nodeId}:`, error);
            throw new Error(`Node processing failed: ${error.message}`);
        }
    }
    return processed;
}

/**
 * Verifies a single signature
 */
async function verifySignature(
    publicKey: CryptoKey,
    messageHash: ArrayBuffer,
    signature: string
): Promise<boolean> {
    try {
        // Convert base64 signature to bytes
        const sigBytes = Buffer.from(signature, 'base64');
        console.log('Signature length:', sigBytes.length);

        const result = await crypto.subtle.verify(
            {
                name: 'ECDSA',
                hash: { name: 'SHA-256' },
            },
            publicKey,
            sigBytes,
            messageHash
        );

        console.log('Signature verification result:', result);
        return result;
    } catch (error) {
        console.error('Signature verification failed:', error);
        return false;
    }
}

/**
 * Verifies deposit address signatures against a proposal
 */
export async function verifyDepositAddressSignatures(
    signatures: { [nodeId: string]: string },
    proposal: Proposal
): Promise<VerificationResult> {
    try {
        console.log('Starting verification with signatures:', signatures);
        console.log('Proposal:', proposal);

        const processedNodes = await processGuardianNodes(GUARDIAN_NODES);
        let verifiedCount = 0;
        const errors: string[] = [];

        // Verify each node's signature
        await Promise.all(processedNodes.map(async (node) => {
            try {
                const signature = signatures[node.nodeId];
                if (!signature) {
                    console.log(`No signature found for node ${node.nodeId}`);
                    errors.push(`No signature found for node ${node.nodeId}`);
                    return;
                }

                console.log(`Verifying signature for node ${node.nodeId}`);
                const messageHash = await proposalToHashedPayload(node.nodeId, proposal);
                if (await verifySignature(node.publicKey, messageHash, signature)) {
                    console.log(`Signature verified for node ${node.nodeId}`);
                    verifiedCount++;
                } else {
                    console.log(`Invalid signature from node ${node.nodeId}`);
                    errors.push(`Invalid signature from node ${node.nodeId}`);
                }
            } catch (error) {
                console.error(`Verification failed for node ${node.nodeId}:`, error);
                errors.push(`Verification failed for node ${node.nodeId}: ${error.message}`);
            }
        }));

        console.log(`Verification complete. Verified count: ${verifiedCount}, Errors:`, errors);
        return {
            success: verifiedCount >= GUARDIAN_SIGNATURE_THRESHOLD,
            verifiedCount,
            errors: errors.length > 0 ? errors : undefined
        };
    } catch (error) {
        console.error('Global verification error:', error);
        return {
            success: false,
            verifiedCount: 0,
            errors: [`Global verification error: ${error.message}`]
        };
    }
}