
  <!-- ================= Member ================= -->
   <div class="Joined">
  <h1 class="page-title" style="margin-top:40px;">Joined Task</h1>

  <div class="projects-toolbar">
    <input type="text" id="searchInactive" placeholder="Search Task...">
    <select id="filterInactive">
      <option value="newest">Newest</option>
      <option value="oldest">Oldest</option>
      <option value="stakeHigh">Highest Stake</option>
      <option value="stakeLow">Lowest Stake</option>
      <option value="deadlineSoon">Closest Deadline</option>
      <option value="deadlineLate">Farthest Deadline</option>
      <option value="reputationHigh">Author Reputation ↑</option>
      <option value="reputationLow">Author Reputation ↓</option>
    </select>
  </div>


  <div id="inactiveList" class="JoinedTaskContainer"></div>

  <template id="taskCardTemplate">
  <div class="task-card">
    <div class="card-header">
      <div class="indicator green"></div>
      <h2><span class="title"></span></h2>
    </div>

    <div class="task-info">
      <p><span>Id:</span> <span class="taskId">-</span></p>
      <p><span>Status:</span> <span class="status">-</span></p>
      <p><span>reward:</span> <span class="reward">-</span> <span>ETH</span></p>
      <p><span>creator:</span> <span class="CreatorAddress">-</span></p>
      <p><span>deadline:</span> <span class="deadlineTime">-</span></p>
      <p><span>maxRevision:</span> <span class="revison">-</span></p>
      <p><span>githubURl:</span> <span class="TaskGithubURl">-</span></p>
    </div>
    <div class="stake-status">
      <p><span>Member Stake Locked:</span> <span class="isMemberStakeLocked">-</span></p>
      <p><span>Creator Stake Locked:</span> <span class="isCreatorStakeLocked">-</span></p>
      <p><span>Reward Claimed:</span> <span class="isRewardClaimed">-</span></p>
    </div>

    <button class="SubmitTask"></button>
    <button class="ReSubmitTask"></button>
    <button class="CancelTask"></button>
  </div>
</template>

<!--resubmit template-->

<template id="taskUpdateFormTemplate">
  <div class="update-form-container">
    <form class="task-update-form">
      <h3>Update Task Information</h3>
      
      <!-- Note Field -->
      <div class="form-group">
        <label for="note">Update Note *</label>
        <div class="input-with-helper">
          <textarea 
            id="note" 
            name="note" 
            rows="4" 
            required
            placeholder="Describe the update, fixes made, or any relevant information..."
            class="form-textarea"
          ></textarea>
          <span class="helper-text">Description of the changes or progress made</span>
        </div>
      </div>
      
      <!-- Github Fixed URL Field -->
      <div class="form-group">
        <label for="githubFixedURL">GitHub Fixed URL *</label>
        <div class="input-with-helper">
          <input 
            type="url" 
            id="githubFixedURL" 
            name="githubFixedURL" 
            required
            placeholder="https://github.com/username/repo/pull/123"
            pattern="https?://github\.com/.+/.+"
            class="form-input"
          >
          <span class="helper-text">Link to PR, commit, or issue with the fix</span>
        </div>
        <div class="url-preview" id="githubPreview">
          <!-- Preview will be shown here -->
        </div>
      </div>
      
      <!-- Form Actions -->
      <div class="form-actions">
        <button type="submit" class="submit-btn">
          <span class="btn-text">Submit Update</span>
          <span class="btn-loading hidden">Processing...</span>
        </button>
      </div>
      
      <!-- Status Messages -->
      <div class="status-message hidden" id="formStatus">
        <!-- Success or error messages will appear here -->
      </div>
    </form>
  </div>
</template>
   </div>