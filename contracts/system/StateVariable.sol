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
        uint64 CancelByMe;
        uint64 revision;
        uint32 taskAcceptCreator;
        uint32 taskAcceptMember;
        uint32 deadlineHitCreator;
        uint32 deadlineHitMember;
    }

    /// @notice Global system variables, including limits and penalty percentages.
    struct StateVar {
        uint256 maxStake;
        uint256 maxReward;
        uint64 minRevisionTimeInHour;
        uint64 NegPenalty;
        uint64 feePercentage;
        uint64 maxRevision;
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
        uint64 CancelByMe,
        uint64 revision,
        uint32 taskAcceptCreator,
        uint32 taskAcceptMember,
        uint32 deadlineHitCreator,
        uint32 deadlineHitMember
    );

    event StateVarsChanged(
        uint256 maxStake,
        uint256 maxReward,
        uint64 minRevisionTimeInHour,
        uint64 NegPenalty,
        uint64 feePercentage,
        uint64 maxRevision
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

    error TotalMustBe100();
    error InvalidMaxStakeAmount();
    error FeeCantBe100();
    error NegPenaltyCantBe100();


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
        uint64 CancelByMeRP,
        uint64 revisionRP,
        uint32 taskAcceptCreatorRP,
        uint32 taskAcceptMemberRP,
        uint32 deadlineHitCreatorRP,
        uint32 deadlineHitMemberRP,

        // State Vars
        uint256 _maxStakeInEther,
        uint256 _maxRewardInEther,
        uint64 _minRevisionTimeInHour,
        uint64 _NegPenalty,
        uint64 _feePercentage,
        uint64 _maxRevision,

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
        uint256 total = _rewardScore + _reputationScore + _deadlineScore + _revisionScore;
        if (total != 100) revert TotalMustBe100();

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
            revision: revisionRP,
            taskAcceptCreator: taskAcceptCreatorRP,
            taskAcceptMember: taskAcceptMemberRP,
            deadlineHitCreator: deadlineHitCreatorRP,
            deadlineHitMember: deadlineHitMemberRP
        });

        StateVars = StateVar({
            maxStake: _maxStakeInEther * 1 ether,
            maxReward: _maxRewardInEther * 1 ether,
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

function __getCancelByMe() external view returns (uint64) {
    return reputationPoints.CancelByMe;
}

function __getRevisionPenalty() external view returns (uint64) {
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

function __getMaxStake() external view returns (uint256) {
    return StateVars.maxStake;
}

function __getMaxReward() external view returns (uint256) {
    return StateVars.maxReward;
}

function __getMinRevisionTimeInHour() external view returns (uint64) {
    return StateVars.minRevisionTimeInHour;
}

function __getNegPenalty() external view returns (uint64) {
    return StateVars.NegPenalty;
}

function __getFeePercentage() external view returns (uint64) {
    return StateVars.feePercentage;
}

function __getMaxRevision() external view returns (uint64) {
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

        uint256 total = rewardScore + reputationScore + deadlineScore + revisionScore;
        if (total != 100) revert TotalMustBe100();

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

         StateVar storage sv =  StateVars;

        if (low >= midLow || midLow >= mid || mid >= midHigh || midHigh >= high || high >= ultraHigh) revert InvalidMaxStakeAmount();

        if (ultraHigh > sv.maxStake) revert InvalidMaxStakeAmount();

        stakeAmounts = StakeAmount({
            low: low,
            midLow: midLow,
            mid: mid,
            midHigh: midHigh,
            high: high,
            ultraHigh: ultraHigh
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
        uint64 CancelByMeRP,
        uint64 revisionRP,
        uint32 taskAcceptCreatorRP,
        uint32 taskAcceptMemberRP,
        uint32 deadlineHitCreatorRP,
        uint32 deadlineHitMemberRP
    ) external onlyEmployes {

        reputationPoints = ReputationPoint({
            CancelByMe: CancelByMeRP,
            revision: revisionRP,
            taskAcceptCreator: taskAcceptCreatorRP,
            taskAcceptMember: taskAcceptMemberRP,
            deadlineHitCreator: deadlineHitCreatorRP,
            deadlineHitMember: deadlineHitMemberRP
        });

        emit reputationPointsChanged(
            CancelByMeRP,
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
        uint256 maxStakeInEther,
        uint256 maxRewardInEther,
        uint64 minRevisionTimeInHour,
        uint64 NegPenalty,
        uint64 feePercentage,
        uint64 maxRevision
    ) external onlyEmployes {

        if (feePercentage > 100) revert FeeCantBe100();
        if (NegPenalty > 100) revert NegPenaltyCantBe100();

        StateVars = StateVar({
            maxStake: maxStakeInEther,
            maxReward: maxRewardInEther,
            minRevisionTimeInHour: minRevisionTimeInHour,
            NegPenalty: NegPenalty,
            feePercentage: feePercentage,
            maxRevision: maxRevision
        });

        emit StateVarsChanged(
         maxStakeInEther,
         maxRewardInEther,
         minRevisionTimeInHour,
         NegPenalty,
         feePercentage,
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

        StateVar storage sv =  StateVars;

        if (low >= midLow || midLow >= mid || mid >= midHigh || midHigh >= high || high >= ultraHigh) revert InvalidMaxStakeAmount();

        if (ultraHigh > sv.maxStake) revert InvalidMaxStakeAmount();

        StakeCategorys = StakeCategory({
            low: low,
            midleLow: midLow,
            midle: mid,
            midleHigh: midHigh,
            high: high,
            ultraHigh: ultraHigh
        });

        emit stakeCategorysChanged(
            low,
            midLow,
            mid,
            midHigh,
            high,
            ultraHigh
        );
    }

        // acces control change
        function changeAccessControl(address _newAccesControl) external onlyOwner whenNotPaused {
        zero_Address(_newAccesControl);
        accessControl = IAccessControl(_newAccesControl);
        emit AccessControlChanged(_newAccesControl);
    }

    //pause / unpause contract
    function pause() external onlyOwner {
    _pause();
    emit ContractPaused(msg.sender);
    }
    function unpause() external onlyOwner {
    _unpause();
    emit ContractUnpaused(msg.sender);
    }

}
