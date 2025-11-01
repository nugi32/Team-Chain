// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Logic/AccesControl.sol";

contract test is AccesControl{
    uint public num;

    function setA (uint a) public onlyOwner{
        num = a;
    }


    function setB (uint a) public notOwner {
        num = a;
    }


    function setC (uint a) public onlyEmployes {
        num = a;
    }


    function setD (uint a) public onlyUser {
        num = a;
    }
}