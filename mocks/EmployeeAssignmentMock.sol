// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EmployeeAssignmentMock {
    address private _owner;

    constructor(address owner_) {
        _owner = owner_;
    }

    function owner() external view returns (address) {
        return _owner;
    }

    function hasRole(address /*account*/) external pure returns (bool) {
        return true;
    }
}



