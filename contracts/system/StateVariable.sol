// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Pipe/AccesControlPipes.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title stateVariable
 * @notice Contract for managing configurable system state variables, including weights,
 *         stake categories, reputation points, limits, and penalties.
 * @dev Uses AccessControl for permissioning and includes setters restricted to employees.
 */
contract stateVariable is AccesControl, Pausable {

    // =============================================================
    // Struct Definitions
    // =============================================================

    /// @notice Percentage weights used to calculate reward, reputation, deadlines, and revision impact.
    struct ComponentWeightPercentage {
        uint64 rewardScore;
        uint64 reputationScore;
        uint64 deadlineScore;
        uint64 revisionScore;
    }

    /// @notice Predefined stake tiers, stored in wei (ETH * 1 ether).
    struct StakeAmount {
        uint256 low;
        uint256 midLow;
        uint256 mid;
        uint256 midHigh;
        uint256 high;
        uint256 ultraHigh;
    }

    /// @notice Reputation point values based on user actions.
    struct ReputationPoint {
        uint32 CancelByMe;
        uint32 requestCancel;
        uint32 respondCancel;
        uint32 revision;
        uint32 taskAcceptCreator;
        uint32 taskAcceptMember;
        uint32 deadlineHitCreator;
        uint32 deadlineHitMember;
    }

    /// @notice Global system variables, including limits and penalty percentages.
    struct StateVar {
        uint64 maxStake;
        uint64 maxReward;
        uint32 cooldownInHour;
        uint32 minRevisionTimeInHour;
        uint32 NegPenalty;
        uint16 feePercentage;
        uint16 maxRevision;
    }

    /// @notice Predefined stake categories for classification.
    struct StakeCategory {
        uint256 low;
        uint256 midleLow;
        uint256 midle;
        uint256 midleHigh;
        uint256 high;
        uint256 ultraHigh;
    }


    // =============================================================
    // State Variables
    // =============================================================

    ComponentWeightPercentage public componentWeightPercentages;
    StakeAmount public stakeAmounts;
    ReputationPoint public reputationPoints;
    StateVar public StateVars;
    StakeCategory public StakeCategorys;


    // =============================================================
    // Events
    // =============================================================

    event componentWeightPercentagesChanged(
        uint64 rewardScore,
        uint64 reputationScore,
        uint64 deadlineScore,
        uint64 revisionScore
    );

    event stakeAmountsChanged(
        uint256 low,
        uint256 midLow,
        uint256 mid,
        uint256 midHigh,
        uint256 high,
        uint256 ultraHigh
    );

    event reputationPointsChanged(
        uint32 CancelByMe,
        uint32 requestCancel,
        uint32 respondCancel,
        uint32 revision,
        uint32 taskAcceptCreator,
        uint32 taskAcceptMember,
        uint32 deadlineHitCreator,
        uint32 deadlineHitMember
    );

    event StateVarsChanged(
        uint32 cooldownInHour,
        uint32 minRevisionTimeInHour,
        uint32 NegPenalty,
        uint64 maxReward,
        uint16 feePercentage,
        uint64 maxStake,
        uint16 maxRevision
    );

    event stakeCategorysChanged(
        uint256 low,
        uint256 midleLow,
        uint256 midle,
        uint256 midleHigh,
        uint256 high,
        uint256 ultraHigh
    );

    event AccessControlChanged(address newAccessControl);
    event ContractPaused(address account);
    event ContractUnpaused(address account);


    // =============================================================
    // Errors
    // =============================================================

    error TotalMustBe10();
    error InvalidMaxStakeAmount();


    // =============================================================
    // Constructor
    // =============================================================

    /**
     * @notice Initializes the contract with default configuration values.
     * @dev Values that represent ETH must be passed in plain integers (e.g., 5 = 5 ETH).
     */
    constructor(
        // Weight
        uint64 _rewardScore,
        uint64 _reputationScore,
        uint64 _deadlineScore,
        uint64 _revisionScore,

        // Stake Amounts
        uint256 lowStake,
        uint256 midLowStake,
        uint256 midStake,
        uint256 midHighStake,
        uint256 highStake,
        uint256 ultraHighStake,

        // Reputation Points
        uint32 CancelByMeRP,
        uint32 requestCancelRP,
        uint32 respondCancelRP,
        uint32 revisionRP,
        uint32 taskAcceptCreatorRP,
        uint32 taskAcceptMemberRP,
        uint32 deadlineHitCreatorRP,
        uint32 deadlineHitMemberRP,

        // State Vars
        uint64 _maxStakeInEther,
        uint64 _maxRewardInEther,
        uint32 _cooldownInHour,
        uint32 _minRevisionTimeInHour,
        uint32 _NegPenalty,
        uint16 _feePercentage,
        uint16 _maxRevision,

        // Stake Categories
        uint256 lowCat,
        uint256 midLowCat,
        uint256 midCat,
        uint256 midHighCat,
        uint256 highCat,
        uint256 ultraHighCat,

        //access control 
        address _accessControl
    ) {
        componentWeightPercentages = ComponentWeightPercentage({
            rewardScore: _rewardScore,
            reputationScore: _reputationScore,
            deadlineScore: _deadlineScore,
            revisionScore: _revisionScore
        });

        stakeAmounts = StakeAmount({
            low: lowStake * 1 ether,
            midLow: midLowStake * 1 ether,
            mid: midStake * 1 ether,
            midHigh: midHighStake * 1 ether,
            high: highStake * 1 ether,
            ultraHigh: ultraHighStake * 1 ether
        });

        reputationPoints = ReputationPoint({
            CancelByMe: CancelByMeRP,
            requestCancel: requestCancelRP,
            respondCancel: respondCancelRP,
            revision: revisionRP,
            taskAcceptCreator: taskAcceptCreatorRP,
            taskAcceptMember: taskAcceptMemberRP,
            deadlineHitCreator: deadlineHitCreatorRP,
            deadlineHitMember: deadlineHitMemberRP
        });

        StateVars = StateVar({
            maxStake: _maxStakeInEther * 1 ether,
            maxReward: _maxRewardInEther * 1 ether,
            cooldownInHour: _cooldownInHour,
            minRevisionTimeInHour: _minRevisionTimeInHour,
            NegPenalty: _NegPenalty,
            feePercentage: _feePercentage,
            maxRevision: _maxRevision
        });

        StakeCategorys = StakeCategory({
            low: lowCat * 1 ether,
            midleLow: midLowCat * 1 ether,
            midle: midCat * 1 ether,
            midleHigh: midHighCat * 1 ether,
            high: highCat * 1 ether,
            ultraHigh: ultraHighCat * 1 ether
        });
        
        //access control 
        zero_Address(_accessControl);
        accessControl = IAccessControl(_accessControl);
    }

//-------------------------------------------------------------------------- Exported Functions --------------------------------------------------------------------------
// =============================================================
// 1. ComponentWeightPercentage Getters
// =============================================================

function __getRewardScore() external view returns (uint64) {
    return componentWeightPercentages.rewardScore;
}

function __getReputationScore() external view returns (uint64) {
    return componentWeightPercentages.reputationScore;
}

function __getDeadlineScore() external view returns (uint64) {
    return componentWeightPercentages.deadlineScore;
}

function __getRevisionScore() external view returns (uint64) {
    return componentWeightPercentages.revisionScore;
}


// =============================================================
// 2. StakeAmount Getters
// =============================================================

function __getStakeLow() external view returns (uint256) {
    return stakeAmounts.low;
}

function __getStakeMidLow() external view returns (uint256) {
    return stakeAmounts.midLow;
}

function __getStakeMid() external view returns (uint256) {
    return stakeAmounts.mid;
}

function __getStakeMidHigh() external view returns (uint256) {
    return stakeAmounts.midHigh;
}

function __getStakeHigh() external view returns (uint256) {
    return stakeAmounts.high;
}

function __getStakeUltraHigh() external view returns (uint256) {
    return stakeAmounts.ultraHigh;
}


// =============================================================
// 3. ReputationPoint Getters
// =============================================================

function __getCancelByMe() external view returns (uint32) {
    return reputationPoints.CancelByMe;
}

function __getRequestCancel() external view returns (uint32) {
    return reputationPoints.requestCancel;
}

function __getRespondCancel() external view returns (uint32) {
    return reputationPoints.respondCancel;
}

function __getRevisionPenalty() external view returns (uint32) {
    return reputationPoints.revision;
}

function __getTaskAcceptCreator() external view returns (uint32) {
    return reputationPoints.taskAcceptCreator;
}

function __getTaskAcceptMember() external view returns (uint32) {
    return reputationPoints.taskAcceptMember;
}

function __getDeadlineHitCreator() external view returns (uint32) {
    return reputationPoints.deadlineHitCreator;
}

function __getDeadlineHitMember() external view returns (uint32) {
    return reputationPoints.deadlineHitMember;
}


// =============================================================
// 4. StateVar Getters
// =============================================================

function __getCooldownInHour() external view returns (uint32) {
    return StateVars.cooldownInHour;
}

function __getMinRevisionTimeInHour() external view returns (uint32) {
    return StateVars.minRevisionTimeInHour;
}

function __getNegPenalty() external view returns (uint32) {
    return StateVars.NegPenalty;
}

function __getMaxReward() external view returns (uint64) {
    return StateVars.maxReward;
}

function __getFeePercentage() external view returns (uint16) {
    return StateVars.feePercentage;
}

function __getMaxStake() external view returns (uint64) {
    return StateVars.maxStake;
}

function __getMaxRevision() external view returns (uint16) {
    return StateVars.maxRevision;
}


// =============================================================
// 5. StakeCategory Getters
// =============================================================

function __getCategoryLow() external view returns (uint256) {
    return StakeCategorys.low;
}

function __getCategoryMidleLow() external view returns (uint256) {
    return StakeCategorys.midleLow;
}

function __getCategoryMidle() external view returns (uint256) {
    return StakeCategorys.midle;
}

function __getCategoryMidleHigh() external view returns (uint256) {
    return StakeCategorys.midleHigh;
}

function __getCategoryHigh() external view returns (uint256) {
    return StakeCategorys.high;
}

function __getCategoryUltraHigh() external view returns (uint256) {
    return StakeCategorys.ultraHigh;
}

    // =============================================================
    // Setter Functions (EMPLOYEES ONLY)
    // =============================================================

    /**
     * @notice Updates weight percentages used for scoring calculations.
     * @param rewardScore Percentage weight for reward score.
     * @param reputationScore Percentage weight for reputation score.
     * @param deadlineScore Percentage weight for deadline score.
     * @param revisionScore Percentage weight for revision score.
     * @dev Only callable by employees.
     */
    function setComponentWeightPercentages(
        uint64 rewardScore,
        uint64 reputationScore,
        uint64 deadlineScore,
        uint64 revisionScore
    ) external onlyEmployes {
        componentWeightPercentages = ComponentWeightPercentage(
            rewardScore,
            reputationScore,
            deadlineScore,
            revisionScore
        );

        emit componentWeightPercentagesChanged(
            rewardScore,
            reputationScore,
            deadlineScore,
            revisionScore
        );
    }

    /**
     * @notice Updates predefined stake tiers.
     * @param low Value for low stake tier (ETH without decimals).
     * @param midLow Value for midLow tier.
     * @param mid Value for mid tier.
     * @param midHigh Value for midHigh tier.
     * @param high Value for high tier.
     * @param ultraHigh Value for ultraHigh tier.
     * @dev All inputs are converted to wei using * 1 ether.
     */
    function setStakeAmounts(
        uint256 low,
        uint256 midLow,
        uint256 mid,
        uint256 midHigh,
        uint256 high,
        uint256 ultraHigh
    ) external onlyEmployes {

        stakeAmounts = StakeAmount({
            low: low * 1 ether,
            midLow: midLow * 1 ether,
            mid: mid * 1 ether,
            midHigh: midHigh * 1 ether,
            high: high * 1 ether,
            ultraHigh: ultraHigh * 1 ether
        });

        emit stakeAmountsChanged(
            low * 1 ether,
            midLow * 1 ether,
            mid * 1 ether,
            midHigh * 1 ether,
            high * 1 ether,
            ultraHigh * 1 ether
        );
    }

    /**
     * @notice Updates all reputation point values.
     * @dev Only employees can call this function.
     */
    function setReputationPoints(
        uint32 CancelByMeRP,
        uint32 requestCancelRP,
        uint32 respondCancelRP,
        uint32 revisionRP,
        uint32 taskAcceptCreatorRP,
        uint32 taskAcceptMemberRP,
        uint32 deadlineHitCreatorRP,
        uint32 deadlineHitMemberRP
    ) external onlyEmployes {

        reputationPoints = ReputationPoint({
            CancelByMe: CancelByMeRP,
            requestCancel: requestCancelRP,
            respondCancel: respondCancelRP,
            revision: revisionRP,
            taskAcceptCreator: taskAcceptCreatorRP,
            taskAcceptMember: taskAcceptMemberRP,
            deadlineHitCreator: deadlineHitCreatorRP,
            deadlineHitMember: deadlineHitMemberRP
        });

        emit reputationPointsChanged(
            CancelByMeRP,
            requestCancelRP,
            respondCancelRP,
            revisionRP,
            taskAcceptCreatorRP,
            taskAcceptMemberRP,
            deadlineHitCreatorRP,
            deadlineHitMemberRP
        );
    }

    /**
     * @notice Updates global system variables such as max stake, penalties, and reward limits.
     * @dev All stake/reward values must be given in ETH units (converted internally).
     */
    function setStateVars(
        uint64 maxStakeInEther,
        uint64 maxRewardInEther,
        uint32 cooldownInHour,
        uint32 minRevisionTimeInHour,
        uint32 NegPenalty,
        uint16 feePercentage,
        uint16 maxRevision
    ) external onlyEmployes {

        StateVars = StateVar({
            maxStake: maxStakeInEther * 1 ether,
            maxReward: maxRewardInEther * 1 ether,
            cooldownInHour: cooldownInHour,
            minRevisionTimeInHour: minRevisionTimeInHour,
            NegPenalty: NegPenalty,
            feePercentage: feePercentage,
            maxRevision: maxRevision
        });

        emit StateVarsChanged(
            cooldownInHour,
            minRevisionTimeInHour,
            NegPenalty,
            maxRewardInEther * 1 ether,
            feePercentage,
            maxStakeInEther * 1 ether,
            maxRevision
        );
    }

    /**
     * @notice Updates stake category values used for classification.
     */
    function setStakeCategorys(
        uint256 low,
        uint256 midLow,
        uint256 mid,
        uint256 midHigh,
        uint256 high,
        uint256 ultraHigh
    ) external onlyEmployes {

        StakeCategorys = StakeCategory({
            low: low * 1 ether,
            midleLow: midLow * 1 ether,
            midle: mid * 1 ether,
            midleHigh: midHigh * 1 ether,
            high: high * 1 ether,
            ultraHigh: ultraHigh * 1 ether
        });

        emit stakeCategorysChanged(
            low * 1 ether,
            midLow * 1 ether,
            mid * 1 ether,
            midHigh * 1 ether,
            high * 1 ether,
            ultraHigh * 1 ether
        );
    }

        // acces control change
        function changeAccessControl(address _newAccesControl) external onlyOwner whenNotPaused {
        zero_Address(_newAccesControl);
        accessControl = IAccessControl(_newAccesControl);
        emit AccessControlChanged(_newAccesControl);
    }

    //pause / unpause contract
    function pause() external onlyEmployes {
    _pause();
    emit ContractPaused(msg.sender);
    }
    function unpause() external onlyEmployes {
    _unpause();
    emit ContractUnpaused(msg.sender);
    }

}
