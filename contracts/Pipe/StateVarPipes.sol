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

    function ___getCancelByMe() internal view returns (uint32) {
        return stateVar.__getCancelByMe();
    }

    function ___getRequestCancel() internal view returns (uint32) {
        return stateVar.__getRequestCancel();
    }

    function ___getRespondCancel() internal view returns (uint32) {
        return stateVar.__getRespondCancel();
    }

    function ___getRevisionPenalty() internal view returns (uint32) {
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

    function ___getCooldownInHour() internal view returns (uint32) {
        return stateVar.__getCooldownInHour();
    }

    function ___getMinRevisionTimeInHour() internal view returns (uint32) {
        return stateVar.__getMinRevisionTimeInHour();
    }

    function ___getNegPenalty() internal view returns (uint32) {
        return stateVar.__getNegPenalty();
    }

    function ___getMaxReward() internal view returns (uint64) {
        return stateVar.__getMaxReward();
    }

    function ___getFeePercentage() internal view returns (uint16) {
        return stateVar.__getFeePercentage();
    }

    function ___getMaxStake() internal view returns (uint64) {
        return stateVar.__getMaxStake();
    }

    function ___getMaxRevision() internal view returns (uint16) {
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


    // =============================================================
    // ===============  EXTERNAL GETTERS DI BAWAH  =================
    // =============================================================

    // ---------- 1. ComponentWeightPercentage ----------
    function getAllComponentWeightPercentage()
        external
        view
        returns (
            uint64 rewardScore,
            uint64 reputationScore,
            uint64 deadlineScore,
            uint64 revisionScore
        )
    {
        rewardScore = ___getRewardScore();
        reputationScore = ___getReputationScore();
        deadlineScore = ___getDeadlineScore();
        revisionScore = ___getRevisionScore();
    }


    // ---------- 2. StakeAmount ----------
    function getAllStakeAmount()
        external
        view
        returns (
            uint256 stakeLow,
            uint256 stakeMidLow,
            uint256 stakeMid,
            uint256 stakeMidHigh,
            uint256 stakeHigh,
            uint256 stakeUltraHigh
        )
    {
        stakeLow = ___getStakeLow();
        stakeMidLow = ___getStakeMidLow();
        stakeMid = ___getStakeMid();
        stakeMidHigh = ___getStakeMidHigh();
        stakeHigh = ___getStakeHigh();
        stakeUltraHigh = ___getStakeUltraHigh();
    }


    // ---------- 3. ReputationPoint ----------
    function getAllReputationPoint()
        external
        view
        returns (
            uint32 cancelByMe,
            uint32 requestCancel,
            uint32 respondCancel,
            uint32 revisionPenalty,
            uint32 taskAcceptCreator,
            uint32 taskAcceptMember,
            uint32 deadlineHitCreator,
            uint32 deadlineHitMember
        )
    {
        cancelByMe = ___getCancelByMe();
        requestCancel = ___getRequestCancel();
        respondCancel = ___getRespondCancel();
        revisionPenalty = ___getRevisionPenalty();
        taskAcceptCreator = ___getTaskAcceptCreator();
        taskAcceptMember = ___getTaskAcceptMember();
        deadlineHitCreator = ___getDeadlineHitCreator();
        deadlineHitMember = ___getDeadlineHitMember();
    }


    // ---------- 4. StateVar ----------
    function getAllStateVar()
        external
        view
        returns (
            uint32 cooldownInHour,
            uint32 minRevisionTimeInHour,
            uint32 negPenalty,
            uint64 maxReward,
            uint32 feePercentage,
            uint64 maxStake,
            uint32 maxRevision
        )
    {
        cooldownInHour = ___getCooldownInHour();
        minRevisionTimeInHour = ___getMinRevisionTimeInHour();
        negPenalty = ___getNegPenalty();
        maxReward = ___getMaxReward();
        feePercentage = ___getFeePercentage();
        maxStake = ___getMaxStake();
        maxRevision = ___getMaxRevision();
    }


    // ---------- 5. StakeCategory ----------
    function getAllStakeCategory()
        external
        view
        returns (
            uint256 categoryLow,
            uint256 categoryMidleLow,
            uint256 categoryMidle,
            uint256 categoryMidleHigh,
            uint256 categoryHigh,
            uint256 categoryUltraHigh
        )
    {
        categoryLow = ___getCategoryLow();
        categoryMidleLow = ___getCategoryMidleLow();
        categoryMidle = ___getCategoryMidle();
        categoryMidleHigh = ___getCategoryMidleHigh();
        categoryHigh = ___getCategoryHigh();
        categoryUltraHigh = ___getCategoryUltraHigh();
    }

}
