# 10 Smart Contracts

## Contract purpose

Contracts provide hackathon-native proof and policy auditability. They do not replace the off-chain policy engine.

## Must build

| Contract | Purpose |
|---|---|
| AegisPolicyRegistry.sol | Store policy hash and metadata URI |
| ChainlinkFeedConsumer.sol | Demonstrate AggregatorV3Interface read |
| DemoERC20.sol | Token for approval demo |
| DemoSpender.sol | Unknown spender for block demo |

## Stretch

| Contract | Purpose |
|---|---|
| AgentUseCasePolicyApp.sol | Agent spending proof |
| DeFiUseCasePolicyApp.sol | Swap deviation proof |
| RWAUseCasePolicyApp.sol | Treasury/NAV policy proof |

## AegisPolicyRegistry sketch

```solidity
contract AegisPolicyRegistry {
    struct PolicyRecord {
        address owner;
        bytes32 policyHash;
        string metadataURI;
        uint256 updatedAt;
        bool active;
    }

    mapping(bytes32 => PolicyRecord) public policies;

    event PolicyRegistered(bytes32 indexed policyId, address indexed owner, bytes32 policyHash, string metadataURI);
    event PolicyUpdated(bytes32 indexed policyId, bytes32 oldHash, bytes32 newHash, string metadataURI);

    function registerPolicy(bytes32 policyId, bytes32 policyHash, string calldata metadataURI) external {
        require(policies[policyId].owner == address(0), "POLICY_EXISTS");
        policies[policyId] = PolicyRecord(msg.sender, policyHash, metadataURI, block.timestamp, true);
        emit PolicyRegistered(policyId, msg.sender, policyHash, metadataURI);
    }

    function updatePolicy(bytes32 policyId, bytes32 newHash, string calldata metadataURI) external {
        PolicyRecord storage r = policies[policyId];
        require(r.owner == msg.sender, "NOT_OWNER");
        bytes32 oldHash = r.policyHash;
        r.policyHash = newHash;
        r.metadataURI = metadataURI;
        r.updatedAt = block.timestamp;
        emit PolicyUpdated(policyId, oldHash, newHash, metadataURI);
    }

    function verifyHash(bytes32 policyId, bytes32 hash) external view returns (bool) {
        return policies[policyId].active && policies[policyId].policyHash == hash;
    }
}
```

## Deployment

```bash
cd contracts
forge build
forge test
forge script script/DeployBaseSepolia.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
```
