// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IMainReputation {
    function seeMyReputation(address _user) external view returns (uint32);

    function seeMyCompleteCounter(address _user) external view returns (uint256);

    function seeMyFailedCounter(address _user) external view returns (uint256);

    function seeMyCreatedCounter(address _user) external view returns (uint256);
}

abstract contract UserReputation is Initializable {
    IMainReputation public MainContract;

    function __UserReputation_init(
        address _MainContract
    ) 
        public 
        initializer 
    {
        require(_MainContract != address(0), "invalid main addr");

        MainContract = IMainReputation(_MainContract);
    }

    // Forward point lokal ke main.sol
    function _seeMyReputation(address _user) internal view returns (uint32) {
    uint32 rep = MainContract.seeMyReputation(_user);
    return uint32(rep);
    }

    function _seeMyCreatedCounter(address _user) internal view returns (uint256) {
        return MainContract.seeMyCreatedCounter(_user);
    }

    function _seeMyCompleteCounter(address _user) internal view returns (uint256) {
        return MainContract.seeMyCompleteCounter(_user);
    }

    function _seeMyFailedCounter(address _user) internal view returns (uint256) {
        return MainContract.seeMyFailedCounter(_user);
    }
}