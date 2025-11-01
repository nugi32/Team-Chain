// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Logic/onlyRegistered.sol";

contract test is UserAccessControl {
    uint public num;
    function set (uint a) external onlyRegistered {
        num = a;
    }

    function setb (uint a) external onlyUnregistered {
        num = a;
    }
}