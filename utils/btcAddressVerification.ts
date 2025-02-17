// Constants
const GUARDIAN_NODES = [
    {
        nodeId: 'node-1',
        publicKey:
            '04b3ed8e1e2eda3e15aa028b7b72c9fcf0eba23c73a3e4f561fe9199e3d209b1abf2d7c2490664db936ccba2e2c1b642c8a68e45ab1d3cb70db10996531b5891ee',
    },
    {
        nodeId: 'hl-node',
        publicKey:
            '043e3d8e653e9f890dd7df7340b6b9093ea2a95a1a4bb1c31dbd14eb7a8955ef9f4aa4c1d416dc6b03d6d04867a23ca39f9aa9b516c4169939537cdcca820aa801',
    },
    {
        nodeId: 'field-node',
        publicKey:
            '044c7ad4ad7beecc94d3e87e834d48d53921a77d23da12a653a0f376898041d736ae126b97cffd29f27d700515f2d40e509de92eb1741962a100b0d448f872dd7f',
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
 * Converts a proposal into a standardized payload format.
 * Format: nodeId:destinationAddress-destinationChain-asset-address
 */
function proposalToPayload(nodeId: string, proposal: Proposal): Uint8Array {
    const payloadString = [
        nodeId,
        proposal.destinationAddress,
        proposal.destinationChain,
        proposal.asset,
        proposal.address
    ].join(':');

    return new TextEncoder().encode(payloadString);
}

/**
 * Processes guardian nodes by converting their hex-encoded public keys into CryptoKey objects
 * @throws Error if public key format is invalid or processing fails
 */
async function processGuardianNodes(nodes: RawNode[]): Promise<ProcessedNode[]> {
    const processed: ProcessedNode[] = [];

    for (const node of nodes) {
        try {
            const publicKeyBytes = hexToBytes(node.publicKey);

            // Validate public key format (uncompressed SEC1)
            if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
                throw new Error(`Invalid public key format for node ${node.nodeId}`);
            }

            const publicKey = await crypto.subtle.importKey(
                'raw',
                publicKeyBytes,
                { name: 'ECDSA', namedCurve: 'P-256' },
                true,
                ['verify']
            );

            processed.push({ nodeId: node.nodeId, publicKey });
        } catch (error) {
            console.error(`Failed to process node ${node.nodeId}:`, error);
            throw new Error(`Node processing failed: ${error.message}`);
        }
    }
    return processed;
}

/**
 * Verifies a single signature against a message using WebCrypto API
 */
async function verifySignature(
    publicKey: CryptoKey,
    message: Uint8Array,
    signature: string
): Promise<boolean> {
    try {
        // Convert base64 signature to raw R||S format
        const sigBytes = new Uint8Array(atob(signature).split('').map(c => c.charCodeAt(0)));
        if (sigBytes.length !== 64) {
            console.warn('Invalid signature length');
            return false;
        }

        return await crypto.subtle.verify(
            {
                name: 'ECDSA',
                hash: { name: 'SHA-256' },
            },
            publicKey,
            sigBytes,
            message
        );
    } catch (error) {
        console.error('Signature verification failed:', error);
        return false;
    }
}

/**
 * Verifies deposit address signatures against a proposal
 * @param signatures - Map of nodeId to signature
 * @param proposal - Deposit proposal to verify
 * @returns Object containing verification result and metadata
 */
export async function verifyDepositAddressSignatures(
    signatures: { [nodeId: string]: string },
    proposal: Proposal
): Promise<VerificationResult> {
    try {
        const processedNodes = await processGuardianNodes(GUARDIAN_NODES);
        let verifiedCount = 0;
        const errors: string[] = [];

        // Verify each node's signature
        await Promise.all(processedNodes.map(async (node) => {
            try {
                if (!signatures[node.nodeId]) {
                    return;
                }

                const payload = proposalToPayload(node.nodeId, proposal);
                if (await verifySignature(node.publicKey, payload, signatures[node.nodeId])) {
                    verifiedCount++;
                }
            } catch (error) {
                errors.push(`Verification failed for node ${node.nodeId}: ${error.message}`);
            }
        }));

        return {
            success: verifiedCount >= GUARDIAN_SIGNATURE_THRESHOLD,
            verifiedCount,
            errors: errors.length > 0 ? errors : undefined
        };
    } catch (error) {
        return {
            success: false,
            verifiedCount: 0,
            errors: [`Global verification error: ${error.message}`]
        };
    }
}