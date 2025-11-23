// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

//import "./Pipe/AccesControlPipes.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";


contract stateVariable is Pausable {

// =============================================================
// Struct Definitions
// =============================================================

// 1 //
struct ComponentWeightPercentage {
    uint64 rewardScore;
    uint64 reputationScore;
    uint64 deadlineScore;
    uint64 revisionScore;
}

// 2 //
struct StakeAmount {
    uint256 low;
    uint256 midLow;
    uint256 mid;
    uint256 midHigh;
    uint256 high;
    uint256 ultraHigh;
}

// 3 //
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

// 4 //
struct StateVar {
    uint32 cooldownInHour;
    uint32 minRevisionTimeInHour; // stored in hours
    uint32 NegPenalty;            // percent (0..100)
    uint32 maxReward;             // input unit (ether)
    uint32 feePercentage;         // percent for creatorStake
    uint64 maxStake;              // upper limit for stake
    uint32 maxRevision;
}

// 5 //
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

ComponentWeightPercentage public componentWeightPercentages;   // 1
StakeAmount public stakeAmounts;                               // 2
ReputationPoint public reputationPoints;                       // 3
StateVar public StateVars;                                     // 4
StakeCategory public StakeCategorys;                           // 5

// ------------------------------------------------------------ Events ------------------------------------------------------------
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
    uint256 maxStake,
    uint32 cooldownInHour,
    uint32 minRevisionTimeInHour,
    uint32 NegPenalty,
    uint32 maxReward,
    uint32 feePercentage,
    uint32 maxRevision
);

event stakeCategorysChanged(
    uint256 low,
    uint256 midleLow,
    uint256 midle,
    uint256 midleHigh,
    uint256 high,
    uint256 ultraHigh
);

event ContractPaused(address account);
event ContractUnpaused(address account);

// ------------------------------------------------------------ Errors ------------------------------------------------------------
error TotalMustBe10();
error InvalidMaxStakeAmount();

// ------------------------------------------------------- Constructor ------------------------------------------------------------

constructor() {

    // 1. Component Weight Percentage
    //uint64 total = _rewardScore + _reputationScore + _deadlineScore + _revisionScore;
    //if (total != 10) revert TotalMustBe10();

    componentWeightPercentages = ComponentWeightPercentage({
        rewardScore: 5,
        reputationScore: 2,
        deadlineScore: 2,
        revisionScore: 1
    });

    // 2. Stake Amount
    stakeAmounts = StakeAmount({
        low: 1 * 1 ether,
        midLow: 2 * 1 ether,
        mid: 3 * 1 ether,
        midHigh: 4 * 1 ether,
        high: 5 * 1 ether,
        ultraHigh: 6 * 1 ether
    });

    // 3. Reputation Point
    reputationPoints = ReputationPoint({
        CancelByMe: 5,
        requestCancel: 5,
        respondCancel: 5,
        revision: 5,
        taskAcceptCreator: 5,
        taskAcceptMember: 5,
        deadlineHitCreator: 5,
        deadlineHitMember: 5
    });

    // 4. State Vars
    //if (_maxStake > _catUltraHigh) revert InvalidMaxStakeAmount();

    StateVars = StateVar({
        cooldownInHour: 1,
        minRevisionTimeInHour: 1,
        NegPenalty: 5,
        maxReward: 5,
        feePercentage: 5,
        maxStake: 10 * 1 ether,
        maxRevision: 5
    });

    // 5. Stake Category
    StakeCategorys = StakeCategory({
        low: 1 * 1 ether,
        midleLow: 2 * 1 ether,
        midle: 3 * 1 ether,
        midleHigh: 4 * 1 ether,
        high: 5 * 1 ether,
        ultraHigh: 6 * 1 ether
    });
}

//-------------------------------------------------------------------------- Exported Functions --------------------------------------------------------------------------

// =============================================================
// 1. ComponentWeightPercentage Getters
// =============================================================

function ___getRewardScore() external view returns (uint64) {
    return componentWeightPercentages.rewardScore;
}

function ___getReputationScore() external view returns (uint64) {
    return componentWeightPercentages.reputationScore;
}

function ___getDeadlineScore() external view returns (uint64) {
    return componentWeightPercentages.deadlineScore;
}

function ___getRevisionScore() external view returns (uint64) {
    return componentWeightPercentages.revisionScore;
}


// =============================================================
// 2. StakeAmount Getters
// =============================================================

function ___getStakeLow() external view returns (uint256) {
    return stakeAmounts.low;
}

function ___getStakeMidLow() external view returns (uint256) {
    return stakeAmounts.midLow;
}

function ___getStakeMid() external view returns (uint256) {
    return stakeAmounts.mid;
}

function ___getStakeMidHigh() external view returns (uint256) {
    return stakeAmounts.midHigh;
}

function ___getStakeHigh() external view returns (uint256) {
    return stakeAmounts.high;
}

function ___getStakeUltraHigh() external view returns (uint256) {
    return stakeAmounts.ultraHigh;
}


// =============================================================
// 3. ReputationPoint Getters
// =============================================================

function ___getCancelByMe() external view returns (uint32) {
    return reputationPoints.CancelByMe;
}

function ___getRequestCancel() external view returns (uint32) {
    return reputationPoints.requestCancel;
}

function ___getRespondCancel() external view returns (uint32) {
    return reputationPoints.respondCancel;
}

function ___getRevisionPenalty() external view returns (uint32) {
    return reputationPoints.revision;
}

function ___getTaskAcceptCreator() external view returns (uint32) {
    return reputationPoints.taskAcceptCreator;
}

function ___getTaskAcceptMember() external view returns (uint32) {
    return reputationPoints.taskAcceptMember;
}

function ___getDeadlineHitCreator() external view returns (uint32) {
    return reputationPoints.deadlineHitCreator;
}

function ___getDeadlineHitMember() external view returns (uint32) {
    return reputationPoints.deadlineHitMember;
}


// =============================================================
// 4. StateVar Getters
// =============================================================

function ___getCooldownInHour() external view returns (uint32) {
    return StateVars.cooldownInHour;
}

function ___getMinRevisionTimeInHour() external view returns (uint32) {
    return StateVars.minRevisionTimeInHour;
}

function ___getNegPenalty() external view returns (uint32) {
    return StateVars.NegPenalty;
}

function ___getMaxReward() external view returns (uint32) {
    return StateVars.maxReward;
}

function ___getFeePercentage() external view returns (uint32) {
    return StateVars.feePercentage;
}

function ___getMaxStake() external view returns (uint64) {
    return StateVars.maxStake;
}

function ___getMaxRevision() external view returns (uint32) {
    return StateVars.maxRevision;
}


// =============================================================
// 5. StakeCategory Getters
// =============================================================

function ___getCategoryLow() external view returns (uint256) {
    return StakeCategorys.low;
}

function ___getCategoryMidleLow() external view returns (uint256) {
    return StakeCategorys.midleLow;
}

function ___getCategoryMidle() external view returns (uint256) {
    return StakeCategorys.midle;
}

function ___getCategoryMidleHigh() external view returns (uint256) {
    return StakeCategorys.midleHigh;
}

function ___getCategoryHigh() external view returns (uint256) {
    return StakeCategorys.high;
}

function ___getCategoryUltraHigh() external view returns (uint256) {
    return StakeCategorys.ultraHigh;
}



//-------------------------------------------------------------------------- Admin Functions --------------------------------------------------------------------------

// =============================================================
// Setter Functions
// =============================================================
/*
// 1 //
function setComponentWeightPercentage(
    uint64 _rewardScore,
    uint64 _reputationScore,
    uint64 _deadlineScore,
    uint64 _revisionScore
) external onlyEmployes whenNotPaused {
    uint64 Total = _rewardScore + _reputationScore + _deadlineScore + _revisionScore;
    if (Total != 10) revert TotalMustBe10();

    componentWeightPercentages = ComponentWeightPercentage({
        rewardScore: _rewardScore,
        reputationScore: _reputationScore,
        deadlineScore: _deadlineScore,
        revisionScore: _revisionScore
    });

    emit componentWeightPercentagesChanged(
        _rewardScore,
        _reputationScore,
        _deadlineScore,
        _revisionScore
    );
}

// 2 //
function setStakeAmount(
    uint256 _low,
    uint256 _midLow,
    uint256 _mid,
    uint256 _midHigh,
    uint256 _high,
    uint256 _ultraHigh
) external onlyEmployes whenNotPaused {
    stakeAmounts = StakeAmount({
        low: _low * 1 ether,
        midLow: _midLow * 1 ether,
        mid: _mid * 1 ether,
        midHigh: _midHigh * 1 ether,
        high: _high * 1 ether,
        ultraHigh: _ultraHigh * 1 ether
    });

    emit stakeAmountsChanged(
        _low,
        _midLow,
        _mid,
        _midHigh,
        _high,
        _ultraHigh
    );
}

// 3 //
function setReputationPoint(
    uint32 newCancelByMe,
    uint32 newRequestCancel,
    uint32 newRespondCancel,
    uint32 newRevision,
    uint32 newTaskAcceptCreator,
    uint32 newTaskAcceptMember,
    uint32 newDeadlineHitCreator,
    uint32 newDeadlineHitMember
) external onlyEmployes whenNotPaused {
    reputationPoints.CancelByMe = newCancelByMe;
    reputationPoints.requestCancel = newRequestCancel;
    reputationPoints.respondCancel = newRespondCancel;
    reputationPoints.revision = newRevision;
    reputationPoints.taskAcceptCreator = newTaskAcceptCreator;
    reputationPoints.taskAcceptMember = newTaskAcceptMember;
    reputationPoints.deadlineHitCreator = newDeadlineHitCreator;
    reputationPoints.deadlineHitMember = newDeadlineHitMember;

    emit reputationPointsChanged(
        newCancelByMe,
        newRequestCancel,
        newRespondCancel,
        newRevision,
        newTaskAcceptCreator,
        newTaskAcceptMember,
        newDeadlineHitCreator,
        newDeadlineHitMember
    );
}
/*
// 4 //
function setStateVars(
    uint256 _maxStake,
    uint32 _cooldownInHour,
    uint32 _minRevisionTimeInHour,
    uint32 _NegPenalty,
    uint32 _maxReward,
    uint32 _feePercentage,
    uint32 _maxRevision
) external onlyEmployes whenNotPaused {
    if (_maxStake > StakeCategorys.ultraHigh) revert InvalidMaxStakeAmount();

    StateVars = StateVar({
        cooldownInHour: _cooldownInHour,
        minRevisionTimeInHour: _minRevisionTimeInHour,
        NegPenalty: _NegPenalty,
        maxReward: _maxReward,
        feePercentage: _feePercentage,
        maxStake: _maxStake * 1 ether,
        maxRevision: _maxRevision
    });

    emit StateVarsChanged(
        _cooldownInHour,
        _minRevisionTimeInHour,
        _NegPenalty,
        _maxReward,
        _feePercentage,
        _maxStake,
        _maxRevision
    );
}

// 5 //
function setStakeCategory(
    uint256 _low,
    uint256 _midleLow,
    uint256 _midle,
    uint256 _midleHigh,
    uint256 _high,
    uint256 _ultraHigh
) external onlyEmployes whenNotPaused {
    StakeCategorys = StakeCategory({
        low: _low,
        midleLow: _midleLow,
        midle: _midle,
        midleHigh: _midleHigh,
        high: _high,
        ultraHigh: _ultraHigh
    });

    emit stakeCategorysChanged(
        _low,
        _midleLow,
        _midle,
        _midleHigh,
        _high,
        _ultraHigh
    );
}

    function pause() external onlyEmployes {
    _pause();
    emit ContractPaused(msg.sender);
    }
    function unpause() external onlyEmployes {
    _unpause();
    emit ContractUnpaused(msg.sender);
    }

 enum TaskValue {Low, MidleLow,  Midle, MidleHigh, High, UltraHigh}

    function __getProjectValueNum(
    uint32 DeadlineHours,
    uint8 MaximumRevision,
    uint256 rewardWei
    ) public pure returns (uint256) {
        //uint256 rewardEtherUnits = rewardWei * 1 ether;
        uint256 _Value = ((50 / 10) * rewardWei) + ((20 / 10) * 0) + 
                    ((20 / 10) * DeadlineHours) + ((10 / 10) * MaximumRevision);
                    uint256 _total = _Value * 1 ether;
                    uint256 total = _total /10;
        return total;
    }

    function getCreatorStake(
    uint32 DeadlineHours,
    uint8 MaximumRevision,
    uint256 rewardWei
    ) public view returns (uint256) {
    return ___getCreatorStake(__getProjectValueNum(DeadlineHours, MaximumRevision, rewardWei));
    }
        

       function ___getProjectValueCategory(uint256 _value) public view returns (TaskValue) {
        
   
        if (_value <= ___getCategoryLow()) {
            return TaskValue.Low;
        } else if (_value <= ___getCategoryMidleLow()) {
            return TaskValue.MidleLow;
        } else if (_value <= ___getCategoryMidle()) {
            return TaskValue.Midle;
        } else if (_value <= ___getCategoryMidleHigh()) {
            return TaskValue.MidleHigh;
        } else if (_value <= ___getCategoryHigh()) {
            return TaskValue.High;
        } else {
            return TaskValue.UltraHigh;
        }
    }


function ___getCreatorStake(uint256 __value) public view returns (uint256) {

    TaskValue category = ___getProjectValueCategory(__value);

    if (category == TaskValue.Low) {
        return ___getStakeLow();
    } else if (category == TaskValue.MidleLow) {
        return ___getStakeMidLow();
    } else if (category == TaskValue.Midle) {
        return ___getStakeMid();
    } else if (category == TaskValue.MidleHigh) {
        return ___getStakeMidHigh();
    } else if (category == TaskValue.High) {
        return ___getStakeHigh();
    } else {
        return ___getStakeUltraHigh();
    }
}*/
}