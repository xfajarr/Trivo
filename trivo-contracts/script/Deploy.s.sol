// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/SimpleOracle.sol";
import "../src/MockPerp.sol";
import "../src/MockPolymarket.sol";
import "../src/MockLPV3.sol";
import "../src/CopyTrading.sol";
import "../src/FeeManager.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy core contracts
        SimpleOracle oracle = new SimpleOracle();
        console.log("SimpleOracle:     ", address(oracle));

        MockPerp perp = new MockPerp(address(oracle));
        console.log("MockPerp:         ", address(perp));

        MockPolymarket poly = new MockPolymarket();
        console.log("MockPolymarket:   ", address(poly));

        MockLPV3 lp = new MockLPV3();
        console.log("MockLPV3:         ", address(lp));

        CopyTrading copy = new CopyTrading(deployer);
        console.log("CopyTrading:      ", address(copy));

        FeeManager fee = new FeeManager(deployer);
        console.log("FeeManager:       ", address(fee));


        // Link contracts
        perp.setCopyTrading(address(copy));
        poly.setCopyTrading(address(copy));
        lp.setCopyTrading(address(copy));
        copy.setFeeManager(address(fee));

        console.log("=== All contracts deployed and linked ===");
        vm.stopBroadcast();
    }
}
