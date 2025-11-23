// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract a {
function __getProjectValueNum(
    uint32 DeadlineHours,
    uint8 MaximumRevision,
    uint256 rewardWei
    ) public pure returns (uint256) {

        uint256 rewardEtherUnits = rewardWei / 1 ether;
        uint256 pos = (5 * rewardEtherUnits) + ((1 * MaximumRevision));
        uint256 neg = 0 + (2 * DeadlineHours);
        uint256 rawValue = (pos - neg);

        uint256 _value =( rawValue * 1 ether) / 10;
        return _value;
   
    }

}