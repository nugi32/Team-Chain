// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../system/StateVariable.sol";

/// @title StateVar Exporter
/// @notice Digunakan di Logic untuk membaca stateVariable satu per satu
contract StateVarPipes {

    stateVariable public stateVar;

    // =============================================================
    // 1. ComponentWeightPercentage INTERNAL
    // =============================================================

    function ___getRewardScore() internal view returns (uint64) {
        return stateVar.__getRewardScore();
    }

    function ___getReputationScore() internal view returns (uint64) {
        return stateVar.__getReputationScore();
    }

    function ___getDeadlineScore() internal view returns (uint64) {
        return stateVar.__getDeadlineScore();
    }

    function ___getRevisionScore() internal view returns (uint64) {
        return stateVar.__getRevisionScore();
    }


    // =============================================================
    // 2. StakeAmount INTERNAL
    // =============================================================

    function ___getStakeLow() internal view returns (uint256) {
        return stateVar.__getStakeLow();
    }

    function ___getStakeMidLow() internal view returns (uint256) {
        return stateVar.__getStakeMidLow();
    }

    function ___getStakeMid() internal view returns (uint256) {
        return stateVar.__getStakeMid();
    }

    function ___getStakeMidHigh() internal view returns (uint256) {
        return stateVar.__getStakeMidHigh();
    }

    function ___getStakeHigh() internal view returns (uint256) {
        return stateVar.__getStakeHigh();
    }

    function ___getStakeUltraHigh() internal view returns (uint256) {
        return stateVar.__getStakeUltraHigh();
    }


    // =============================================================
    // 3. ReputationPoint INTERNAL
    // =============================================================

    function ___getCancelByMe() internal view returns (uint64) {
        return stateVar.__getCancelByMe();
    }

    function ___getRevisionPenalty() internal view returns (uint64) {
        return stateVar.__getRevisionPenalty();
    }

    function ___getTaskAcceptCreator() internal view returns (uint32) {
        return stateVar.__getTaskAcceptCreator();
    }

    function ___getTaskAcceptMember() internal view returns (uint32) {
        return stateVar.__getTaskAcceptMember();
    }

    function ___getDeadlineHitCreator() internal view returns (uint32) {
        return stateVar.__getDeadlineHitCreator();
    }

    function ___getDeadlineHitMember() internal view returns (uint32) {
        return stateVar.__getDeadlineHitMember();
    }


    // =============================================================
    // 4. State Variables INTERNAL
    // =============================================================

        function ___getMaxStake() internal view returns (uint256) {
        return stateVar.__getMaxStake();
    }

        function ___getMaxReward() internal view returns (uint256) {
        return stateVar.__getMaxReward();
    }

    function ___getMinRevisionTimeInHour() internal view returns (uint64) {
        return stateVar.__getMinRevisionTimeInHour();
    }

    function ___getNegPenalty() internal view returns (uint64) {
        return stateVar.__getNegPenalty();
    }

    function ___getFeePercentage() internal view returns (uint64) {
        return stateVar.__getFeePercentage();
    }

    function ___getMaxRevision() internal view returns (uint64) {
        return stateVar.__getMaxRevision();
    }


    // =============================================================
    // 5. StakeCategory INTERNAL
    // =============================================================

    function ___getCategoryLow() internal view returns (uint256) {
        return stateVar.__getCategoryLow();
    }

    function ___getCategoryMidleLow() internal view returns (uint256) {
        return stateVar.__getCategoryMidleLow();
    }

    function ___getCategoryMidle() internal view returns (uint256) {
        return stateVar.__getCategoryMidle();
    }

    function ___getCategoryMidleHigh() internal view returns (uint256) {
        return stateVar.__getCategoryMidleHigh();
    }

    function ___getCategoryHigh() internal view returns (uint256) {
        return stateVar.__getCategoryHigh();
    }

    function ___getCategoryUltraHigh() internal view returns (uint256) {
        return stateVar.__getCategoryUltraHigh();
    }

}