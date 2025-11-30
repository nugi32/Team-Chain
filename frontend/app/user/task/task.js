// ================= SAMPLE DATA =================
// ganti dari backend / onchain
const activeTasks = [
  {
    title: "Fix Dashboard UI",
    desc: "Update top bar + mobile responsive.",
    stake: 5,
    deadline: 3,
    authorRep: 70,
    created: 17000
  },
  {
    title: "Bridge Metamask",
    desc: "Implement reconnect + disconnect.",
    stake: 8,
    deadline: 1,
    authorRep: 50,
    created: 18000
  },
];

const inactiveTasks = [
  {
    title: "Old React Refactor",
    desc: "Convert class to hooks.",
    stake: 2,
    deadline: 10,
    authorRep: 85,
    created: 11000
  }
];

function render(list, dom, isActive = false) {
  dom.innerHTML = "";
  list.forEach(task => {
    const card = document.createElement("div");
    card.className = "task-card";
    card.innerHTML = `
      <h2>${task.title}</h2>
      <p class="meta">
        Stake: ${task.stake} • Deadline: ${task.deadline}h • Reputation: ${task.authorRep}
      </p>
      <p>${task.desc}</p>
      ${isActive ? `<div class="badge">Active</div>` : ""}
    `;
    card.onclick = () => alert("Open Task: " + task.title);
    dom.appendChild(card);
  });
}


// ================= SORT LOGIC =================
function sortTasks(tasks, rule) {
  switch (rule) {
    case "newest":
      return [...tasks].sort((a, b) => b.created - a.created);
    case "oldest":
      return [...tasks].sort((a, b) => a.created - b.created);

    case "stakeHigh":
      return [...tasks].sort((a, b) => b.stake - a.stake);
    case "stakeLow":
      return [...tasks].sort((a, b) => a.stake - b.stake);

    case "deadlineSoon":
      return [...tasks].sort((a, b) => a.deadline - b.deadline);
    case "deadlineLate":
      return [...tasks].sort((a, b) => b.deadline - a.deadline);

    case "reputationHigh":
      return [...tasks].sort((a, b) => b.authorRep - a.authorRep);
    case "reputationLow":
      return [...tasks].sort((a, b) => a.authorRep - b.authorRep);

    default:
      return tasks;
  }
}


// ================= SEARCH FILTER =================
function searchFilter(list, term) {
  return list.filter(t =>
    t.title.toLowerCase().includes(term.toLowerCase())
  );
}


// ================= INIT =================
const activeDOM = document.getElementById("activeList");
const inactiveDOM = document.getElementById("inactiveList");

render(activeTasks, activeDOM, true);
render(inactiveTasks, inactiveDOM);

// ================= EVENT =================
document.getElementById("filterActive").onchange = (e) => {
  const sorted = sortTasks(activeTasks, e.target.value);
  render(sorted, activeDOM, true);
};

document.getElementById("filterInactive").onchange = (e) => {
  const sorted = sortTasks(inactiveTasks, e.target.value);
  render(sorted, inactiveDOM);
};

document.getElementById("searchActive").onkeyup = (e) => {
  const res = searchFilter(activeTasks, e.target.value);
  render(res, activeDOM, true);
};

document.getElementById("searchInactive").onkeyup = (e) => {
  const res = searchFilter(inactiveTasks, e.target.value);
  render(res, inactiveDOM);
};
